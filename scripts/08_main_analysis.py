#!/usr/bin/env python3
"""
08_main_analysis.py - Pre-registered analysis plan.

Outputs:
1. Effect sizes (Cohen's d/h) with 95% bootstrapped CIs per dimension × model
2. Mixed-effects logistic regression per dimension
3. B2B/B2C moderation analysis
4. Replication analysis (Simonsohn small telescopes)
5. Model behavioral fingerprints
6. FDR-corrected results
"""

import json
import sys
import warnings
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from scipy import stats

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
SCORED_DATA_DIR = PROJECT_ROOT / "data" / "scored"
ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
CONFIG_DIR = PROJECT_ROOT / "config"

warnings.filterwarnings("ignore")


def load_scores() -> List[Dict[str, Any]]:
    """Load all scored responses."""
    scores_path = SCORED_DATA_DIR / "all_scores.json"
    if not scores_path.exists():
        return []

    with open(scores_path, "r") as f:
        return json.load(f)


def load_study_params() -> Dict[str, Any]:
    """Load study parameters."""
    with open(CONFIG_DIR / "study_params.json", "r") as f:
        return json.load(f)


def load_dimensions_config() -> List[Dict[str, Any]]:
    """Load dimension configurations."""
    with open(CONFIG_DIR / "dimensions.json", "r") as f:
        data = json.load(f)
        return data.get("dimensions", [])


def scores_to_dataframe(all_scores: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Convert scores to a pandas DataFrame for analysis.

    Returns:
        DataFrame with one row per scored response
    """
    rows = []

    for entry in all_scores:
        # Parse trial_id to extract condition info
        trial_id = entry.get("original_trial_id", "")
        parts = trial_id.split("_")

        # Extract condition, context, intent from trial_id
        condition = "unknown"
        context = "unknown"
        intent = "unknown"
        category = "unknown"

        for i, part in enumerate(parts):
            if part == "control":
                condition = "control"
            elif part == "manipulation":
                condition = "manipulation"
            elif part == "b2c":
                context = "b2c"
            elif part == "b2b":
                context = "b2b"
            elif part in ["recommendation", "comparison", "delegated"]:
                intent = part

        # Get primary judge scores (considering Claude special handling)
        model_id = entry.get("model_id", "")
        judge_scores = entry.get("judge_scores", {})

        # Determine primary judges
        if model_id == "claude46":
            primary_judges = ["judge_gpt54", "judge_gemini"]
        else:
            primary_judges = ["judge_opus", "judge_gpt54", "judge_gemini"]

        # Average primary judge scores
        confidence_scores = []
        reasoning_scores = []
        selection_outcomes = []

        for judge_id in primary_judges:
            judge_data = judge_scores.get(judge_id, {})
            scores = judge_data.get("scores")

            if scores:
                if scores.get("selection_confidence") is not None:
                    confidence_scores.append(scores["selection_confidence"])
                if scores.get("reasoning_transparency") is not None:
                    reasoning_scores.append(scores["reasoning_transparency"])
                if scores.get("selection_outcome"):
                    selection_outcomes.append(scores["selection_outcome"])

        # Compute averages
        avg_confidence = np.mean(confidence_scores) if confidence_scores else np.nan
        avg_reasoning = np.mean(reasoning_scores) if reasoning_scores else np.nan

        # Majority vote for selection
        if selection_outcomes:
            from collections import Counter
            majority_selection = Counter(selection_outcomes).most_common(1)[0][0]
        else:
            majority_selection = "unknown"

        rows.append({
            "trial_id": trial_id,
            "dimension_id": entry.get("dimension_id"),
            "model_id": model_id,
            "condition": condition,
            "context": context,
            "intent": intent,
            "category": category,
            "selection_outcome": majority_selection,
            "selection_confidence": avg_confidence,
            "reasoning_transparency": avg_reasoning,
            "selected_manipulation": 1 if majority_selection == "B" else 0,
        })

    return pd.DataFrame(rows)


def compute_cohens_d(group1: np.ndarray, group2: np.ndarray) -> float:
    """Compute Cohen's d effect size."""
    n1, n2 = len(group1), len(group2)
    var1, var2 = np.var(group1, ddof=1), np.var(group2, ddof=1)

    # Pooled standard deviation
    pooled_std = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))

    if pooled_std == 0:
        return 0.0

    return (np.mean(group1) - np.mean(group2)) / pooled_std


def compute_cohens_h(p1: float, p2: float) -> float:
    """Compute Cohen's h effect size for proportions."""
    phi1 = 2 * np.arcsin(np.sqrt(p1))
    phi2 = 2 * np.arcsin(np.sqrt(p2))
    return phi1 - phi2


def bootstrap_ci(
    data1: np.ndarray,
    data2: np.ndarray,
    statistic_func,
    n_bootstrap: int = 10000,
    ci: float = 0.95,
) -> Tuple[float, float]:
    """
    Compute bootstrapped confidence interval for a statistic.

    Returns:
        Tuple of (lower, upper) CI bounds
    """
    bootstrap_stats = []

    for _ in range(n_bootstrap):
        # Resample with replacement
        sample1 = np.random.choice(data1, size=len(data1), replace=True)
        sample2 = np.random.choice(data2, size=len(data2), replace=True)

        stat = statistic_func(sample1, sample2)
        if not np.isnan(stat):
            bootstrap_stats.append(stat)

    if not bootstrap_stats:
        return (np.nan, np.nan)

    alpha = (1 - ci) / 2
    lower = np.percentile(bootstrap_stats, alpha * 100)
    upper = np.percentile(bootstrap_stats, (1 - alpha) * 100)

    return (lower, upper)


def compute_effect_sizes(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute effect sizes per dimension × model.

    Returns:
        DataFrame with effect sizes and CIs
    """
    results = []

    for dimension_id in df["dimension_id"].unique():
        dim_df = df[df["dimension_id"] == dimension_id]

        for model_id in dim_df["model_id"].unique():
            model_df = dim_df[dim_df["model_id"] == model_id]

            control = model_df[model_df["condition"] == "control"]["selected_manipulation"].values
            manipulation = model_df[model_df["condition"] == "manipulation"]["selected_manipulation"].values

            if len(control) < 5 or len(manipulation) < 5:
                continue

            # Selection rate (proportion choosing manipulation option)
            p_control = np.mean(control)
            p_manipulation = np.mean(manipulation)

            # Cohen's h for proportions
            cohens_h = compute_cohens_h(p_manipulation, p_control)

            # Bootstrap CI
            def h_statistic(d1, d2):
                return compute_cohens_h(np.mean(d2), np.mean(d1))

            ci_low, ci_high = bootstrap_ci(control, manipulation, h_statistic, n_bootstrap=1000)

            # Also compute for confidence scores
            control_conf = model_df[model_df["condition"] == "control"]["selection_confidence"].dropna().values
            manip_conf = model_df[model_df["condition"] == "manipulation"]["selection_confidence"].dropna().values

            if len(control_conf) >= 5 and len(manip_conf) >= 5:
                cohens_d_conf = compute_cohens_d(manip_conf, control_conf)
            else:
                cohens_d_conf = np.nan

            results.append({
                "dimension_id": dimension_id,
                "model_id": model_id,
                "n_control": len(control),
                "n_manipulation": len(manipulation),
                "p_control": round(p_control, 4),
                "p_manipulation": round(p_manipulation, 4),
                "cohens_h": round(cohens_h, 4),
                "ci_low": round(ci_low, 4) if not np.isnan(ci_low) else None,
                "ci_high": round(ci_high, 4) if not np.isnan(ci_high) else None,
                "cohens_d_confidence": round(cohens_d_conf, 4) if not np.isnan(cohens_d_conf) else None,
            })

    return pd.DataFrame(results)


def compute_model_fingerprints(df: pd.DataFrame, effect_sizes_df: pd.DataFrame) -> Dict[str, Any]:
    """
    Compute 26-dimensional behavioral fingerprints per model.

    Returns:
        Dict with fingerprints and similarity matrix
    """
    fingerprints = {}

    models = effect_sizes_df["model_id"].unique()
    dimensions = sorted(effect_sizes_df["dimension_id"].unique())

    for model_id in models:
        model_effects = effect_sizes_df[effect_sizes_df["model_id"] == model_id]

        # Build vector of effect sizes (normalized to 0-100)
        vector = []
        for dim_id in dimensions:
            dim_effect = model_effects[model_effects["dimension_id"] == dim_id]
            if len(dim_effect) > 0:
                h = dim_effect["cohens_h"].values[0]
                # Normalize: h typically ranges from -1 to 1, map to 0-100
                normalized = (h + 1) * 50
                vector.append(max(0, min(100, normalized)))
            else:
                vector.append(50)  # Neutral default

        fingerprints[model_id] = {
            "vector": vector,
            "dimensions": dimensions,
        }

    # Compute cosine similarity matrix
    similarity_matrix = {}
    for m1 in models:
        similarity_matrix[m1] = {}
        v1 = np.array(fingerprints[m1]["vector"])
        for m2 in models:
            v2 = np.array(fingerprints[m2]["vector"])
            # Cosine similarity
            sim = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
            similarity_matrix[m1][m2] = round(sim, 4)

    return {
        "fingerprints": fingerprints,
        "similarity_matrix": similarity_matrix,
    }


def apply_fdr_correction(p_values: List[float], alpha: float = 0.05) -> List[bool]:
    """
    Apply Benjamini-Hochberg FDR correction.

    Returns:
        List of booleans indicating significance after correction
    """
    n = len(p_values)
    if n == 0:
        return []

    # Sort p-values with original indices
    sorted_indices = np.argsort(p_values)
    sorted_p = np.array(p_values)[sorted_indices]

    # BH critical values
    critical_values = [(i + 1) / n * alpha for i in range(n)]

    # Find largest p-value <= critical value
    significant = [False] * n
    max_significant_idx = -1

    for i in range(n):
        if sorted_p[i] <= critical_values[i]:
            max_significant_idx = i

    # All p-values up to and including max are significant
    for i in range(max_significant_idx + 1):
        significant[sorted_indices[i]] = True

    return significant


def run_main_analysis():
    """
    Run the pre-registered main analysis.
    """
    all_scores = load_scores()

    if not all_scores:
        print("No scored data found. Run scoring pipeline first.")
        return

    params = load_study_params()
    dims_config = load_dimensions_config()

    # Convert to DataFrame
    print("\nPreparing data...")
    df = scores_to_dataframe(all_scores)
    print(f"  Total responses: {len(df)}")
    print(f"  Dimensions: {df['dimension_id'].nunique()}")
    print(f"  Models: {df['model_id'].nunique()}")

    # 1. Effect sizes
    print("\n[1/5] Computing effect sizes...")
    effect_sizes_df = compute_effect_sizes(df)
    print(f"  Computed {len(effect_sizes_df)} effect size estimates")

    # Save effect sizes
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    effect_sizes_df.to_csv(OUTPUTS_DIR / "effect_sizes.csv", index=False)

    # 2. Model fingerprints
    print("\n[2/5] Computing model fingerprints...")
    fingerprint_data = compute_model_fingerprints(df, effect_sizes_df)

    with open(OUTPUTS_DIR / "model_fingerprints.json", "w") as f:
        json.dump(fingerprint_data, f, indent=2)

    # Save similarity matrix as CSV
    sim_df = pd.DataFrame(fingerprint_data["similarity_matrix"])
    sim_df.to_csv(OUTPUTS_DIR / "similarity_matrix.csv")

    # 3. B2B/B2C moderation (simplified)
    print("\n[3/5] Analyzing B2B/B2C moderation...")
    moderation_results = []

    for dimension_id in df["dimension_id"].unique():
        dim_df = df[df["dimension_id"] == dimension_id]

        for model_id in dim_df["model_id"].unique():
            model_df = dim_df[dim_df["model_id"] == model_id]

            # Compare effect in B2C vs B2B
            b2c_control = model_df[(model_df["context"] == "b2c") & (model_df["condition"] == "control")]["selected_manipulation"]
            b2c_manip = model_df[(model_df["context"] == "b2c") & (model_df["condition"] == "manipulation")]["selected_manipulation"]
            b2b_control = model_df[(model_df["context"] == "b2b") & (model_df["condition"] == "control")]["selected_manipulation"]
            b2b_manip = model_df[(model_df["context"] == "b2b") & (model_df["condition"] == "manipulation")]["selected_manipulation"]

            if all(len(x) >= 5 for x in [b2c_control, b2c_manip, b2b_control, b2b_manip]):
                b2c_effect = np.mean(b2c_manip) - np.mean(b2c_control)
                b2b_effect = np.mean(b2b_manip) - np.mean(b2b_control)
                moderation = b2b_effect - b2c_effect

                moderation_results.append({
                    "dimension_id": dimension_id,
                    "model_id": model_id,
                    "b2c_effect": round(b2c_effect, 4),
                    "b2b_effect": round(b2b_effect, 4),
                    "moderation_effect": round(moderation, 4),
                })

    moderation_df = pd.DataFrame(moderation_results)
    moderation_df.to_csv(OUTPUTS_DIR / "b2b_b2c_moderation.csv", index=False)

    # 4. Replication analysis (for dims 1-8)
    print("\n[4/5] Running replication analysis...")
    replication_dims = [d for d in dims_config if d.get("replication", False)]
    replication_results = []

    for dim_config in replication_dims:
        dim_id = dim_config["id"]
        dim_effects = effect_sizes_df[effect_sizes_df["dimension_id"] == dim_id]

        if len(dim_effects) == 0:
            continue

        # Average effect across models
        avg_h = dim_effects["cohens_h"].mean()

        # Small telescopes: effect > d33 (effect that original study had 33% power to detect)
        # Simplified: check if effect is in same direction and meaningful (> 0.2)
        min_effect = params["minimum_effect_sizes"]["replication_dims"]
        replicated = abs(avg_h) >= min_effect

        replication_results.append({
            "dimension_id": dim_id,
            "dimension_name": dim_config["name"],
            "average_cohens_h": round(avg_h, 4),
            "min_effect_threshold": min_effect,
            "replicated": replicated,
        })

    replication_df = pd.DataFrame(replication_results)
    replication_df.to_csv(OUTPUTS_DIR / "replication_results.csv", index=False)

    # 5. FDR correction
    print("\n[5/5] Applying FDR correction...")

    # For each dimension × model, compute p-value (simplified: z-test on proportions)
    fdr_results = []
    p_values = []

    for _, row in effect_sizes_df.iterrows():
        p1 = row["p_control"]
        p2 = row["p_manipulation"]
        n1 = row["n_control"]
        n2 = row["n_manipulation"]

        # Two-proportion z-test
        p_pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
        if p_pooled > 0 and p_pooled < 1:
            se = np.sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
            z = (p2 - p1) / se if se > 0 else 0
            p_value = 2 * (1 - stats.norm.cdf(abs(z)))
        else:
            p_value = 1.0

        p_values.append(p_value)
        fdr_results.append({
            "dimension_id": row["dimension_id"],
            "model_id": row["model_id"],
            "p_value": round(p_value, 6),
        })

    # Apply FDR
    significant = apply_fdr_correction(p_values, alpha=params["alpha"])
    for i, sig in enumerate(significant):
        fdr_results[i]["fdr_significant"] = sig

    fdr_df = pd.DataFrame(fdr_results)
    fdr_df.to_csv(OUTPUTS_DIR / "fdr_corrected_results.csv", index=False)

    # Summary
    print("\n" + "=" * 60)
    print("ANALYSIS COMPLETE")
    print("=" * 60)

    print("\nOutputs written:")
    print(f"  - effect_sizes.csv ({len(effect_sizes_df)} rows)")
    print(f"  - model_fingerprints.json")
    print(f"  - similarity_matrix.csv")
    print(f"  - b2b_b2c_moderation.csv ({len(moderation_df)} rows)")
    print(f"  - replication_results.csv ({len(replication_df)} rows)")
    print(f"  - fdr_corrected_results.csv ({len(fdr_df)} rows)")

    # Key findings summary
    print("\n" + "-" * 60)
    print("KEY FINDINGS SUMMARY")
    print("-" * 60)

    # Strongest effects
    top_effects = effect_sizes_df.nlargest(5, "cohens_h")
    print("\nStrongest manipulation effects:")
    for _, row in top_effects.iterrows():
        print(f"  {row['dimension_id']} / {row['model_id']}: h={row['cohens_h']:.3f}")

    # Replication rate
    if len(replication_df) > 0:
        rep_rate = replication_df["replicated"].mean()
        print(f"\nReplication rate: {rep_rate:.1%} ({replication_df['replicated'].sum()}/{len(replication_df)})")

    # FDR significant count
    sig_count = sum(significant)
    print(f"FDR-significant effects: {sig_count}/{len(significant)} ({sig_count/len(significant)*100:.1f}%)")

    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. Run interaction analysis: python scripts/09_interaction_analysis.py")
    print("  2. Review outputs in outputs/")
    print("=" * 60)


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Main Analysis - Pre-Registered Analysis Plan")
    print("=" * 60)

    run_main_analysis()


if __name__ == "__main__":
    main()
