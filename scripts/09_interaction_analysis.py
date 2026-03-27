#!/usr/bin/env python3
"""
09_interaction_analysis.py - Interaction study analysis.

Fits four competing combination models:
- Additive
- Multiplicative
- Dominant
- Diminishing returns

Reports winning model by AIC for each combination type.
"""

import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pandas as pd
from scipy import optimize

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
SCORED_DATA_DIR = PROJECT_ROOT / "data" / "scored"
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"


def load_interaction_scores() -> List[Dict[str, Any]]:
    """Load scores from interaction study."""
    scores_path = SCORED_DATA_DIR / "all_scores.json"
    if not scores_path.exists():
        return []

    with open(scores_path, "r") as f:
        all_scores = json.load(f)

    # Filter to interaction phase
    return [s for s in all_scores if s.get("phase") == "interaction"]


def load_single_signal_baselines(main_scores: List[Dict[str, Any]]) -> Dict[str, float]:
    """
    Extract baseline effect sizes for single signals from main battery.

    Returns:
        Dict mapping signal_id to baseline effect size
    """
    baselines = {}

    # Group by dimension
    dim_scores = {}
    for score in main_scores:
        dim_id = score.get("dimension_id", "")
        if dim_id not in dim_scores:
            dim_scores[dim_id] = {"control": [], "manipulation": []}

        trial_id = score.get("original_trial_id", "")
        judge_scores = score.get("judge_scores", {})

        # Get average selection outcome
        selections = []
        for judge_data in judge_scores.values():
            if judge_data.get("scores", {}).get("selection_outcome") == "B":
                selections.append(1)
            else:
                selections.append(0)

        if selections:
            avg_selection = np.mean(selections)
            if "_control_" in trial_id:
                dim_scores[dim_id]["control"].append(avg_selection)
            elif "_manipulation_" in trial_id:
                dim_scores[dim_id]["manipulation"].append(avg_selection)

    # Compute baseline effects
    for dim_id, scores in dim_scores.items():
        if scores["control"] and scores["manipulation"]:
            baseline = np.mean(scores["manipulation"]) - np.mean(scores["control"])
            baselines[dim_id] = baseline

    return baselines


def combination_models():
    """
    Define the four combination models.

    Each model takes two baseline effects and returns predicted combined effect.
    """
    return {
        "additive": lambda a, b: a + b,
        "multiplicative": lambda a, b: a * b * 2,  # Scaled for comparison
        "dominant": lambda a, b: max(abs(a), abs(b)) * (1 if (a + b) >= 0 else -1),
        "diminishing": lambda a, b: math.log(1 + abs(a) + abs(b)) * (1 if (a + b) >= 0 else -1),
    }


def compute_aic(observed: np.ndarray, predicted: np.ndarray, n_params: int) -> float:
    """
    Compute AIC for a model fit.

    AIC = 2k - 2ln(L)
    For least squares: AIC = n*ln(RSS/n) + 2k
    """
    n = len(observed)
    residuals = observed - predicted
    rss = np.sum(residuals ** 2)

    if rss <= 0:
        return float("inf")

    return n * np.log(rss / n) + 2 * n_params


def compute_bic(observed: np.ndarray, predicted: np.ndarray, n_params: int) -> float:
    """
    Compute BIC for a model fit.

    BIC = k*ln(n) - 2ln(L)
    For least squares: BIC = n*ln(RSS/n) + k*ln(n)
    """
    n = len(observed)
    residuals = observed - predicted
    rss = np.sum(residuals ** 2)

    if rss <= 0:
        return float("inf")

    return n * np.log(rss / n) + n_params * np.log(n)


def fit_combination_models(
    observed_effects: List[float],
    signal_a_baselines: List[float],
    signal_b_baselines: List[float],
) -> Dict[str, Dict[str, Any]]:
    """
    Fit all four combination models and compare.

    Returns:
        Dict with model fits and comparison metrics
    """
    observed = np.array(observed_effects)
    base_a = np.array(signal_a_baselines)
    base_b = np.array(signal_b_baselines)

    models = combination_models()
    results = {}

    for model_name, model_func in models.items():
        # Compute predictions
        predicted = np.array([
            model_func(a, b) for a, b in zip(base_a, base_b)
        ])

        # Compute fit metrics
        aic = compute_aic(observed, predicted, n_params=1)
        bic = compute_bic(observed, predicted, n_params=1)
        r_squared = 1 - (np.sum((observed - predicted) ** 2) / np.sum((observed - np.mean(observed)) ** 2))

        results[model_name] = {
            "predictions": predicted.tolist(),
            "aic": round(aic, 4),
            "bic": round(bic, 4),
            "r_squared": round(max(0, r_squared), 4),
            "rmse": round(np.sqrt(np.mean((observed - predicted) ** 2)), 4),
        }

    # Determine winner
    winner = min(results.items(), key=lambda x: x[1]["aic"])[0]
    for model_name in results:
        results[model_name]["is_winner"] = model_name == winner

    return results


def analyze_combination_type(
    scores: List[Dict[str, Any]],
    baselines: Dict[str, float],
    combination_type: str,
) -> Dict[str, Any]:
    """
    Analyze a specific combination type (positive-positive, negative-negative, mixed).

    Returns:
        Analysis results for this combination type
    """
    # Filter scores for this combination type
    type_scores = [s for s in scores if combination_type in s.get("dimension_id", "")]

    if len(type_scores) < 5:
        return {
            "combination_type": combination_type,
            "n_conditions": len(type_scores),
            "status": "insufficient_data",
        }

    # Extract observed effects and baseline components
    observed_effects = []
    signal_a_baselines = []
    signal_b_baselines = []

    for score in type_scores:
        dim_id = score.get("dimension_id", "")

        # Get selection outcome as effect
        judge_scores = score.get("judge_scores", {})
        selections = []
        for judge_data in judge_scores.values():
            if judge_data.get("scores", {}).get("selection_outcome") == "B":
                selections.append(1)
            else:
                selections.append(0)

        if not selections:
            continue

        observed_effect = np.mean(selections)
        observed_effects.append(observed_effect)

        # Get baseline components from condition metadata (simplified)
        # In real implementation, this would come from interaction study metadata
        signal_a_baselines.append(baselines.get("dim_02", 0.2))  # Placeholder
        signal_b_baselines.append(baselines.get("dim_03", 0.15))  # Placeholder

    if len(observed_effects) < 3:
        return {
            "combination_type": combination_type,
            "n_conditions": len(observed_effects),
            "status": "insufficient_data",
        }

    # Fit models
    model_results = fit_combination_models(
        observed_effects, signal_a_baselines, signal_b_baselines
    )

    winner = [name for name, data in model_results.items() if data["is_winner"]][0]

    return {
        "combination_type": combination_type,
        "n_conditions": len(observed_effects),
        "status": "analyzed",
        "observed_mean_effect": round(np.mean(observed_effects), 4),
        "model_fits": model_results,
        "winning_model": winner,
        "winning_aic": model_results[winner]["aic"],
    }


def run_interaction_analysis():
    """
    Run the interaction study analysis.
    """
    # Load all scores
    scores_path = SCORED_DATA_DIR / "all_scores.json"
    if not scores_path.exists():
        print("No scored data found. Run scoring pipeline first.")
        return

    with open(scores_path, "r") as f:
        all_scores = json.load(f)

    # Separate main and interaction scores
    main_scores = [s for s in all_scores if s.get("phase") == "main"]
    interaction_scores = [s for s in all_scores if s.get("phase") == "interaction"]

    print(f"\nMain battery scores: {len(main_scores)}")
    print(f"Interaction scores: {len(interaction_scores)}")

    if not interaction_scores:
        print("No interaction study data found. Run 05_interaction_study.py first.")
        return

    # Compute baselines from main battery
    print("\nComputing single-signal baselines...")
    baselines = load_single_signal_baselines(main_scores)
    print(f"  Baselines computed for {len(baselines)} dimensions")

    # Analyze each combination type
    print("\nAnalyzing combination types...")
    combination_types = [
        "positive_pair",
        "negative_pair",
        "mixed_pair",
        "triple_combo",
    ]

    results = {
        "analysis_date": pd.Timestamp.now().isoformat(),
        "n_interaction_scores": len(interaction_scores),
        "baselines": baselines,
        "combination_analyses": {},
    }

    for ctype in combination_types:
        print(f"  Analyzing {ctype}...")
        analysis = analyze_combination_type(interaction_scores, baselines, ctype)
        results["combination_analyses"][ctype] = analysis

        if analysis["status"] == "analyzed":
            print(f"    Winner: {analysis['winning_model']} (AIC={analysis['winning_aic']:.2f})")
        else:
            print(f"    Status: {analysis['status']}")

    # Generate summary coefficients
    coefficients = []
    for ctype, analysis in results["combination_analyses"].items():
        if analysis["status"] == "analyzed":
            winner = analysis["winning_model"]
            winner_fit = analysis["model_fits"][winner]

            coefficients.append({
                "combination_type": ctype,
                "winning_model": winner,
                "aic": winner_fit["aic"],
                "bic": winner_fit["bic"],
                "r_squared": winner_fit["r_squared"],
                "rmse": winner_fit["rmse"],
                "observed_mean_effect": analysis["observed_mean_effect"],
            })

    results["coefficients"] = coefficients

    # Save results
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUTS_DIR / "interaction_coefficients.json"
    with open(output_path, "w") as f:
        json.dump(results, f, indent=2)

    print(f"\nResults saved to: {output_path}")

    # Print summary
    print("\n" + "=" * 60)
    print("INTERACTION ANALYSIS COMPLETE")
    print("=" * 60)

    print(f"\n{'Combination Type':<20} {'Winning Model':<15} {'AIC':<10} {'R²':<10}")
    print("-" * 55)

    for coef in coefficients:
        print(
            f"{coef['combination_type']:<20} "
            f"{coef['winning_model']:<15} "
            f"{coef['aic']:<10.2f} "
            f"{coef['r_squared']:<10.3f}"
        )

    # Key insights
    print("\n" + "-" * 60)
    print("KEY INSIGHTS")
    print("-" * 60)

    winners = [c["winning_model"] for c in coefficients]
    from collections import Counter
    winner_counts = Counter(winners)
    most_common = winner_counts.most_common(1)

    if most_common:
        dominant_model = most_common[0][0]
        count = most_common[0][1]
        print(f"\nMost common winning model: {dominant_model} ({count}/{len(coefficients)} types)")

    # Check for patterns
    if all(w == "additive" for w in winners):
        print("\nPattern: Signal effects appear to combine ADDITIVELY")
        print("Implication: Multiple persuasion signals have independent effects")
    elif all(w == "diminishing" for w in winners):
        print("\nPattern: Signal effects show DIMINISHING RETURNS")
        print("Implication: Adding more signals yields decreasing marginal impact")
    elif "dominant" in winners:
        print("\nPattern: Some combinations show DOMINANT signal effects")
        print("Implication: One strong signal may overshadow others")

    print("\n" + "=" * 60)
    print("Analysis complete. Results feed into Layer 4 of APIS scoring engine.")
    print("=" * 60)


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Interaction Analysis")
    print("=" * 60)

    run_interaction_analysis()


if __name__ == "__main__":
    main()
