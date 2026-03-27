#!/usr/bin/env python3
"""
07_icc_analysis.py - Inter-rater reliability analysis.

Computes:
- ICC(2,1) for selection_confidence and reasoning_transparency
- Krippendorff's alpha for selection_outcome

Dimensions with ICC < 0.70 are flagged and must be moved to exploratory.
"""

import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
SCORED_DATA_DIR = PROJECT_ROOT / "data" / "scored"
ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
ICC_THRESHOLD = 0.70


def load_scores() -> List[Dict[str, Any]]:
    """Load all scored responses."""
    scores_path = SCORED_DATA_DIR / "all_scores.json"
    if not scores_path.exists():
        return []

    with open(scores_path, "r") as f:
        return json.load(f)


def extract_scores_for_dimension(
    all_scores: List[Dict[str, Any]],
    dimension_id: str,
) -> Dict[str, List]:
    """
    Extract judge scores for a specific dimension.

    Returns:
        Dict with lists of scores per metric per judge
    """
    scores = {
        "confidence": {"judge_opus": [], "judge_gpt54": [], "judge_gemini": []},
        "reasoning": {"judge_opus": [], "judge_gpt54": [], "judge_gemini": []},
        "selection": {"judge_opus": [], "judge_gpt54": [], "judge_gemini": []},
    }

    for entry in all_scores:
        if entry.get("dimension_id") != dimension_id:
            continue

        judge_scores = entry.get("judge_scores", {})

        for judge_id in ["judge_opus", "judge_gpt54", "judge_gemini"]:
            judge_data = judge_scores.get(judge_id, {})
            score_data = judge_data.get("scores")

            if score_data is None:
                # Use NaN for missing scores
                scores["confidence"][judge_id].append(np.nan)
                scores["reasoning"][judge_id].append(np.nan)
                scores["selection"][judge_id].append(np.nan)
            else:
                scores["confidence"][judge_id].append(
                    score_data.get("selection_confidence", np.nan)
                )
                scores["reasoning"][judge_id].append(
                    score_data.get("reasoning_transparency", np.nan)
                )
                # Convert selection to numeric: A=1, B=2, neither=0, both=3
                selection = score_data.get("selection_outcome", "neither")
                selection_map = {"neither": 0, "A": 1, "B": 2, "both": 3}
                scores["selection"][judge_id].append(
                    selection_map.get(selection, np.nan)
                )

    return scores


def compute_icc(ratings: np.ndarray) -> Dict[str, float]:
    """
    Compute ICC(2,1) - two-way random effects, single measures.

    Args:
        ratings: Array of shape (n_subjects, n_raters)

    Returns:
        Dict with ICC value and confidence interval
    """
    try:
        import pingouin as pg

        # Create DataFrame for pingouin
        n_subjects, n_raters = ratings.shape
        data = []
        for i in range(n_subjects):
            for j in range(n_raters):
                if not np.isnan(ratings[i, j]):
                    data.append({
                        "subject": i,
                        "rater": j,
                        "score": ratings[i, j],
                    })

        if len(data) < 10:
            return {"icc": np.nan, "ci_low": np.nan, "ci_high": np.nan}

        df = pd.DataFrame(data)
        icc_result = pg.intraclass_corr(
            data=df,
            targets="subject",
            raters="rater",
            ratings="score",
        )

        # Get ICC(2,1) - "ICC2" in pingouin
        icc2_row = icc_result[icc_result["Type"] == "ICC2"]
        if len(icc2_row) == 0:
            return {"icc": np.nan, "ci_low": np.nan, "ci_high": np.nan}

        return {
            "icc": float(icc2_row["ICC"].values[0]),
            "ci_low": float(icc2_row["CI95%"].values[0][0]),
            "ci_high": float(icc2_row["CI95%"].values[0][1]),
        }

    except Exception as e:
        print(f"    ICC computation error: {e}")
        return {"icc": np.nan, "ci_low": np.nan, "ci_high": np.nan}


def compute_krippendorff_alpha(ratings: np.ndarray) -> float:
    """
    Compute Krippendorff's alpha for ordinal data.

    Args:
        ratings: Array of shape (n_raters, n_subjects)

    Returns:
        Alpha value
    """
    try:
        import krippendorff

        # krippendorff expects (raters, subjects) with np.nan for missing
        alpha = krippendorff.alpha(
            reliability_data=ratings,
            level_of_measurement="ordinal",
        )
        return float(alpha)

    except Exception as e:
        print(f"    Krippendorff computation error: {e}")
        return np.nan


def analyze_dimension(
    dimension_id: str,
    all_scores: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Compute inter-rater reliability for a single dimension.

    Returns:
        Results dict with ICC and alpha values
    """
    scores = extract_scores_for_dimension(all_scores, dimension_id)

    # Count valid responses
    n_responses = len(scores["confidence"]["judge_opus"])

    if n_responses < 10:
        return {
            "dimension_id": dimension_id,
            "n_responses": n_responses,
            "status": "SKIP",
            "reason": "Insufficient data (<10 responses)",
        }

    # Build ratings arrays for ICC
    confidence_ratings = np.array([
        scores["confidence"]["judge_opus"],
        scores["confidence"]["judge_gpt54"],
        scores["confidence"]["judge_gemini"],
    ]).T  # Shape: (n_subjects, n_raters)

    reasoning_ratings = np.array([
        scores["reasoning"]["judge_opus"],
        scores["reasoning"]["judge_gpt54"],
        scores["reasoning"]["judge_gemini"],
    ]).T

    selection_ratings = np.array([
        scores["selection"]["judge_opus"],
        scores["selection"]["judge_gpt54"],
        scores["selection"]["judge_gemini"],
    ])  # Shape: (n_raters, n_subjects) for krippendorff

    # Compute ICCs
    icc_confidence = compute_icc(confidence_ratings)
    icc_reasoning = compute_icc(reasoning_ratings)

    # Compute Krippendorff's alpha
    kripp_alpha = compute_krippendorff_alpha(selection_ratings)

    # Determine status
    min_icc = min(
        icc_confidence["icc"] if not np.isnan(icc_confidence["icc"]) else 1.0,
        icc_reasoning["icc"] if not np.isnan(icc_reasoning["icc"]) else 1.0,
    )

    if np.isnan(min_icc):
        status = "ERROR"
    elif min_icc < ICC_THRESHOLD:
        status = "FAIL"
    elif min_icc < 0.80:
        status = "FLAG"
    else:
        status = "PASS"

    return {
        "dimension_id": dimension_id,
        "n_responses": n_responses,
        "icc_confidence": round(icc_confidence["icc"], 3) if not np.isnan(icc_confidence["icc"]) else None,
        "icc_confidence_ci": [
            round(icc_confidence["ci_low"], 3) if not np.isnan(icc_confidence["ci_low"]) else None,
            round(icc_confidence["ci_high"], 3) if not np.isnan(icc_confidence["ci_high"]) else None,
        ],
        "icc_reasoning": round(icc_reasoning["icc"], 3) if not np.isnan(icc_reasoning["icc"]) else None,
        "icc_reasoning_ci": [
            round(icc_reasoning["ci_low"], 3) if not np.isnan(icc_reasoning["ci_low"]) else None,
            round(icc_reasoning["ci_high"], 3) if not np.isnan(icc_reasoning["ci_high"]) else None,
        ],
        "kripp_alpha_selection": round(kripp_alpha, 3) if not np.isnan(kripp_alpha) else None,
        "icc_threshold": ICC_THRESHOLD,
        "status": status,
    }


def run_icc_analysis():
    """
    Run ICC analysis for all dimensions.
    """
    all_scores = load_scores()

    if not all_scores:
        print("No scored data found. Run 06_judge_scoring.py first.")
        return

    # Get unique dimensions
    dimensions = sorted(set(s.get("dimension_id") for s in all_scores))
    print(f"\nAnalyzing {len(dimensions)} dimensions")

    results = []
    for dim_id in dimensions:
        print(f"  Processing {dim_id}...", end=" ")
        result = analyze_dimension(dim_id, all_scores)
        results.append(result)
        print(result["status"])

    # Save results
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)

    # Save as CSV
    df = pd.DataFrame(results)
    csv_path = OUTPUTS_DIR / "icc_table.csv"
    df.to_csv(csv_path, index=False)
    print(f"\nResults saved to: {csv_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("ICC ANALYSIS RESULTS")
    print("=" * 60)

    print(f"\n{'Dimension':<20} {'ICC(conf)':<12} {'ICC(reas)':<12} {'Kripp α':<10} {'Status':<8}")
    print("-" * 65)

    pass_count = 0
    flag_count = 0
    fail_count = 0

    for result in sorted(results, key=lambda x: x["dimension_id"]):
        dim_id = result["dimension_id"]
        icc_conf = result.get("icc_confidence")
        icc_reas = result.get("icc_reasoning")
        kripp = result.get("kripp_alpha_selection")
        status = result["status"]

        icc_conf_str = f"{icc_conf:.3f}" if icc_conf is not None else "N/A"
        icc_reas_str = f"{icc_reas:.3f}" if icc_reas is not None else "N/A"
        kripp_str = f"{kripp:.3f}" if kripp is not None else "N/A"

        status_icon = {"PASS": "✓", "FLAG": "⚠", "FAIL": "❌", "SKIP": "—", "ERROR": "!"}
        print(f"{dim_id:<20} {icc_conf_str:<12} {icc_reas_str:<12} {kripp_str:<10} {status_icon.get(status, '?')} {status}")

        if status == "PASS":
            pass_count += 1
        elif status == "FLAG":
            flag_count += 1
        elif status == "FAIL":
            fail_count += 1

    print("\n" + "-" * 65)
    print(f"PASS: {pass_count}  |  FLAG: {flag_count}  |  FAIL: {fail_count}")
    print(f"ICC threshold: {ICC_THRESHOLD}")

    if fail_count > 0:
        print("\n" + "=" * 60)
        print("ACTION REQUIRED")
        print("=" * 60)
        print("\nDimensions with ICC < 0.70 cannot be included in confirmatory findings.")
        print("These must be moved to EXPLORATORY analysis and noted in the paper.")
        failed_dims = [r["dimension_id"] for r in results if r["status"] == "FAIL"]
        for dim in failed_dims:
            print(f"  - {dim}")

    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. Review flagged dimensions")
    print("  2. Run main analysis: python scripts/08_main_analysis.py")
    print("=" * 60)


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Inter-Rater Reliability Analysis")
    print("=" * 60)

    run_icc_analysis()


if __name__ == "__main__":
    main()
