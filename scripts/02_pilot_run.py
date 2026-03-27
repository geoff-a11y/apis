#!/usr/bin/env python3
"""
02_pilot_run.py - Phase 1: Pilot data collection (GPT-5.4 only).

Runs pilot study:
- GPT-5.4 only
- 15 trials per condition
- B2C context only
- Recommendation intent only

Arguments:
  --dimension all|dim_01|dim_02...  (default: all)
  --trials 15                        (default from study_params.json)
  --dry-run                          (logs calls without executing)
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from tqdm import tqdm

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.api_client import call_model, call_model_multiturn, load_models_config
from scripts.utils.storage import response_exists, log_cost, get_total_cost, save_response

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
STIMULI_DIR = PROJECT_ROOT / "stimuli" / "main_battery"
CONFIG_DIR = PROJECT_ROOT / "config"
PILOT_MODEL = "gpt4o"
PHASE = "pilot"


def load_study_params() -> Dict[str, Any]:
    """Load study parameters."""
    with open(CONFIG_DIR / "study_params.json", "r") as f:
        return json.load(f)


def load_brands() -> Dict[str, Any]:
    """Load brand register."""
    with open(PROJECT_ROOT / "stimuli" / "brands.json", "r") as f:
        return json.load(f)


def load_system_prompt() -> str:
    """Load system prompt."""
    with open(PROJECT_ROOT / "stimuli" / "system_prompt.txt", "r") as f:
        return f.read().strip()


def load_dimension_stimuli(dimension_id: str) -> Optional[Dict[str, Any]]:
    """Load stimulus file for a dimension."""
    # Try exact match first
    dim_file = STIMULI_DIR / f"{dimension_id}.json"
    if dim_file.exists():
        with open(dim_file, "r") as f:
            return json.load(f)

    # Try pattern match
    for f in STIMULI_DIR.glob(f"{dimension_id}*.json"):
        with open(f, "r") as fh:
            return json.load(fh)

    return None


def load_manipulation_checks() -> Dict[str, Any]:
    """Load manipulation check prompts and keywords."""
    check_file = PROJECT_ROOT / "stimuli" / "manipulation_checks.json"
    if check_file.exists():
        with open(check_file, "r") as f:
            return json.load(f)
    return {"dimensions": {}}


def list_available_dimensions() -> List[str]:
    """List all available dimension IDs."""
    dimensions = []
    for f in STIMULI_DIR.glob("dim_*.json"):
        with open(f, "r") as fh:
            data = json.load(fh)
            dimensions.append(data.get("dimension_id", f.stem))
    return sorted(dimensions)


def expand_template(
    template: str,
    category_variant: Dict[str, Any],
    brands: Dict[str, Any],
    category: str,
) -> str:
    """Expand a template string with category variant and brand data."""
    brand_slot = category_variant.get("brand_slot", "brand_a")
    category_brands = brands.get("brands", {}).get(category, {})
    brand_data = category_brands.get(brand_slot, {"name": "Brand"})

    replacements = {
        "brand": brand_data.get("name", "Brand"),
        **{k: str(v) for k, v in category_variant.items() if isinstance(v, (str, int, float))},
    }

    result = template
    for key, value in replacements.items():
        result = result.replace(f"{{{key}}}", str(value))

    return result


def generate_trial_id(
    dimension_id: str,
    condition: str,
    context: str,
    intent: str,
    category: str,
    model_id: str,
    trial_num: int,
) -> str:
    """Generate a unique trial ID."""
    return f"{dimension_id}_{condition}_{context}_{intent}_{category}_{model_id}_{trial_num:03d}"


async def run_pilot_dimension(
    dimension_id: str,
    dim_data: Dict[str, Any],
    num_trials: int,
    dry_run: bool,
    brands: Dict[str, Any],
    system_prompt: str,
    categories: List[str],
    manipulation_checks: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run pilot for a single dimension.

    Returns:
        Results dict with response counts and errors
    """
    results = {
        "dimension_id": dimension_id,
        "trials_planned": 0,
        "trials_completed": 0,
        "trials_skipped": 0,
        "trials_failed": 0,
        "total_cost": 0.0,
        "avg_response_length": 0,
        "refusals": [],
        "manipulation_checks": {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "pass_rate": 0.0,
        },
    }

    tasks = []

    # Get manipulation check config for this dimension
    dim_check = manipulation_checks.get("dimensions", {}).get(dimension_id, {})
    manip_check_prompt = dim_check.get("manipulation_check_prompt", "")
    target_keywords = dim_check.get("target_keywords", [])

    # Pilot uses B2C only, recommendation intent only
    context = "b2c"
    intent = "recommendation"

    for condition in ["control", "manipulation"]:
        condition_data = dim_data["conditions"].get(condition, {})
        template = condition_data.get("template", "")

        # Use first available category for pilot
        for category in categories:
            category_variant = dim_data.get("category_variants", {}).get(category)
            if not category_variant:
                continue

            # Expand template
            product_description = expand_template(template, category_variant, brands, category)

            # Build frame
            frame = dim_data.get("b2c_frame", "")
            product_type = category_variant.get("product", "product")
            frame = frame.replace("{product_type}", product_type)

            # Build user prompt
            user_prompt = f"{frame}\n\n{product_description}\n\nPlease provide your recommendation."

            for trial_num in range(num_trials):
                trial_id = generate_trial_id(
                    dimension_id, condition, context, intent, category, PILOT_MODEL, trial_num
                )

                results["trials_planned"] += 1

                # Check if already completed
                if response_exists(PHASE, PILOT_MODEL, dimension_id, trial_id):
                    results["trials_skipped"] += 1
                    continue

                # Create task
                tasks.append({
                    "trial_id": trial_id,
                    "system_prompt": system_prompt,
                    "user_prompt": user_prompt,
                    "dimension_id": dimension_id,
                    "condition": condition,
                    "category": category,
                    "run_manip_check": condition == "manipulation" and bool(manip_check_prompt),
                    "manip_check_prompt": manip_check_prompt,
                    "target_keywords": target_keywords,
                })

            # Only use first category for pilot (simplify)
            break

    # Run tasks
    response_lengths = []

    for task in tqdm(tasks, desc=f"  {dimension_id}", leave=False):
        # Step 1: Run initial recommendation call
        result = await call_model(
            model_id=PILOT_MODEL,
            system_prompt=task["system_prompt"],
            user_prompt=task["user_prompt"],
            trial_id=task["trial_id"],
            dry_run=dry_run,
            phase=PHASE,
            dimension_id=task["dimension_id"],
        )

        if result.get("error"):
            results["trials_failed"] += 1
            continue

        results["trials_completed"] += 1
        results["total_cost"] += result.get("cost_usd", 0)

        response_text = result.get("response_text", "")
        response_lengths.append(len(response_text))

        # Check for refusals
        refusal_patterns = [
            "i cannot recommend",
            "i can't recommend",
            "i'm unable to recommend",
        ]
        if any(p in response_text.lower() for p in refusal_patterns):
            results["refusals"].append(task["trial_id"])

        # Step 2: For manipulation conditions, run manipulation check as follow-up
        if task["run_manip_check"] and response_text:
            results["manipulation_checks"]["total"] += 1

            # Build multi-turn conversation
            messages = [
                {"role": "user", "content": task["user_prompt"]},
                {"role": "assistant", "content": response_text},
                {"role": "user", "content": task["manip_check_prompt"]},
            ]

            manip_check_trial_id = f"manip_check_{task['trial_id']}"

            # Check if already completed
            if not response_exists(PHASE, PILOT_MODEL, f"{dimension_id}/manipulation_checks", manip_check_trial_id):
                manip_result = await call_model_multiturn(
                    model_id=PILOT_MODEL,
                    system_prompt="You are analyzing a product recommendation response.",
                    messages=messages,
                    trial_id=manip_check_trial_id,
                    dry_run=dry_run,
                    phase=PHASE,
                    dimension_id=f"{dimension_id}/manipulation_checks",
                )

                results["total_cost"] += manip_result.get("cost_usd", 0)

                # Score the manipulation check
                if not manip_result.get("error"):
                    check_response = manip_result.get("response_text", "").lower()
                    keywords_found = [kw for kw in task["target_keywords"] if kw.lower() in check_response]

                    if keywords_found:
                        results["manipulation_checks"]["passed"] += 1
                    else:
                        results["manipulation_checks"]["failed"] += 1

    if response_lengths:
        results["avg_response_length"] = sum(response_lengths) // len(response_lengths)

    # Calculate pass rate
    total_checks = results["manipulation_checks"]["total"]
    if total_checks > 0:
        results["manipulation_checks"]["pass_rate"] = (
            results["manipulation_checks"]["passed"] / total_checks
        )

    return results


async def run_pilot(
    dimensions: List[str],
    num_trials: int,
    dry_run: bool,
) -> Dict[str, Any]:
    """
    Run pilot study across specified dimensions.

    Returns:
        Aggregated results
    """
    params = load_study_params()
    brands = load_brands()
    system_prompt = load_system_prompt()
    categories = params.get("categories", ["skincare"])
    manipulation_checks = load_manipulation_checks()

    all_results = {
        "start_time": datetime.utcnow().isoformat() + "Z",
        "model": PILOT_MODEL,
        "trials_per_condition": num_trials,
        "dry_run": dry_run,
        "dimensions": {},
        "totals": {
            "planned": 0,
            "completed": 0,
            "skipped": 0,
            "failed": 0,
            "cost": 0.0,
        },
        "manipulation_check_summary": {
            "total": 0,
            "passed": 0,
            "failed": 0,
        },
    }

    print(f"\nRunning pilot with {num_trials} trials per condition")
    print(f"Model: {PILOT_MODEL}")
    print(f"Dimensions: {len(dimensions)}")
    print(f"Dry run: {dry_run}")
    print(f"Manipulation checks: Enabled (follow-up in same conversation)")
    print("-" * 50)

    for dim_id in dimensions:
        dim_data = load_dimension_stimuli(dim_id)
        if dim_data is None:
            print(f"  WARNING: No stimulus file for {dim_id}, skipping")
            continue

        result = await run_pilot_dimension(
            dimension_id=dim_id,
            dim_data=dim_data,
            num_trials=num_trials,
            dry_run=dry_run,
            brands=brands,
            system_prompt=system_prompt,
            categories=categories,
            manipulation_checks=manipulation_checks,
        )

        all_results["dimensions"][dim_id] = result
        all_results["totals"]["planned"] += result["trials_planned"]
        all_results["totals"]["completed"] += result["trials_completed"]
        all_results["totals"]["skipped"] += result["trials_skipped"]
        all_results["totals"]["failed"] += result["trials_failed"]
        all_results["totals"]["cost"] += result["total_cost"]

        # Aggregate manipulation check results
        all_results["manipulation_check_summary"]["total"] += result["manipulation_checks"]["total"]
        all_results["manipulation_check_summary"]["passed"] += result["manipulation_checks"]["passed"]
        all_results["manipulation_check_summary"]["failed"] += result["manipulation_checks"]["failed"]

    all_results["end_time"] = datetime.utcnow().isoformat() + "Z"

    # Log costs
    if not dry_run and all_results["totals"]["completed"] > 0:
        log_cost(
            script="02_pilot_run.py",
            model_id=PILOT_MODEL,
            trials_run=all_results["totals"]["completed"],
            prompt_tokens=0,  # Detailed tracking in individual responses
            completion_tokens=0,
            cost_usd=all_results["totals"]["cost"],
        )

    return all_results


def print_results(results: Dict[str, Any]) -> None:
    """Print pilot results summary."""
    print("\n" + "=" * 60)
    print("PILOT RESULTS")
    print("=" * 60)

    totals = results["totals"]
    print(f"\nTrials planned:   {totals['planned']}")
    print(f"Trials completed: {totals['completed']}")
    print(f"Trials skipped:   {totals['skipped']} (already exist)")
    print(f"Trials failed:    {totals['failed']}")
    print(f"Total cost:       ${totals['cost']:.4f}")

    # Per-dimension breakdown
    print("\nPer-dimension results:")
    print("-" * 50)
    for dim_id, dim_results in results["dimensions"].items():
        refusal_count = len(dim_results.get("refusals", []))
        manip = dim_results.get("manipulation_checks", {})
        manip_str = ""
        if manip.get("total", 0) > 0:
            manip_str = f", manip check: {manip['passed']}/{manip['total']} ({manip['pass_rate']:.0%})"
        print(
            f"  {dim_id}: "
            f"{dim_results['trials_completed']}/{dim_results['trials_planned']} "
            f"(avg len: {dim_results['avg_response_length']}, "
            f"refusals: {refusal_count}{manip_str})"
        )

    # Manipulation check summary
    manip_summary = results.get("manipulation_check_summary", {})
    if manip_summary.get("total", 0) > 0:
        total_checks = manip_summary["total"]
        passed = manip_summary["passed"]
        failed = manip_summary["failed"]
        pass_rate = passed / total_checks if total_checks > 0 else 0

        print("\n" + "-" * 50)
        print("MANIPULATION CHECK RESULTS")
        print("-" * 50)
        print(f"  Total checks:  {total_checks}")
        print(f"  Passed:        {passed} ({pass_rate:.0%})")
        print(f"  Failed:        {failed}")

        if pass_rate < 0.70:
            print("\n  WARNING: Pass rate below 70% threshold!")
            print("  Consider redesigning signals or check prompts.")
        else:
            print(f"\n  PASS: Manipulation checks meet threshold (>= 70%)")

    # Refusals
    all_refusals = []
    for dim_results in results["dimensions"].values():
        all_refusals.extend(dim_results.get("refusals", []))

    if all_refusals:
        print(f"\nWARNING: {len(all_refusals)} refusals detected:")
        for refusal in all_refusals[:10]:  # Show first 10
            print(f"  - {refusal}")
        if len(all_refusals) > 10:
            print(f"  ... and {len(all_refusals) - 10} more")

    # Cost scaling
    if totals["completed"] > 0:
        cost_per_trial = totals["cost"] / totals["completed"]
        # Estimate full run: 26 dims × 2 conditions × 100 trials × 6 models
        estimated_full_cost = cost_per_trial * 26 * 2 * 100 * 6
        print(f"\nEstimated cost for full run: ${estimated_full_cost:.2f}")

    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. Review responses in data/raw/pilot/")
    print("  2. If manipulation checks pass, proceed to pre-registration")
    print("  3. If manipulation checks fail, redesign signals and re-run pilot")
    print("=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="APIS Pilot Run - Phase 1 data collection"
    )
    parser.add_argument(
        "--dimension",
        type=str,
        default="all",
        help="Dimension to run (all, dim_01, dim_02, etc.)",
    )
    parser.add_argument(
        "--trials",
        type=int,
        default=None,
        help="Number of trials per condition (default from study_params.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Log calls without executing",
    )

    args = parser.parse_args()

    # Load study params for default trial count
    params = load_study_params()
    num_trials = args.trials or params["trial_counts"]["pilot_per_condition"]

    # Get dimensions to run
    available = list_available_dimensions()

    if args.dimension == "all":
        dimensions = available
    else:
        if args.dimension not in available and not any(
            d.startswith(args.dimension) for d in available
        ):
            print(f"ERROR: Dimension {args.dimension} not found")
            print(f"Available: {', '.join(available)}")
            sys.exit(1)
        dimensions = [args.dimension]

    if not dimensions:
        print("No dimensions found. Create stimulus files in stimuli/main_battery/")
        print("See CLAUDE.md for the stimulus file format.")
        sys.exit(1)

    print("=" * 60)
    print("APIS Pilot Run - Phase 1")
    print("=" * 60)

    # Check total project cost
    total_cost = get_total_cost()
    if total_cost > 800:
        print(f"\nWARNING: Total project cost is ${total_cost:.2f}")
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            sys.exit(0)

    # Run pilot
    results = asyncio.run(run_pilot(dimensions, num_trials, args.dry_run))
    print_results(results)


if __name__ == "__main__":
    main()
