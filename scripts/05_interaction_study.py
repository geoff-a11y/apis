#!/usr/bin/env python3
"""
05_interaction_study.py - Signal interaction study.

Tests how persuasion signals combine:
- Single signals (8 conditions, reused from main battery)
- Positive pairs (6 conditions)
- Negative pairs (6 conditions)
- Mixed pairs (16 conditions)
- Triple combos (5 conditions)

35 conditions × 40 trials × 6 models = 8,400 total trials
"""

import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from tqdm import tqdm

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.api_client import call_model, load_models_config
from scripts.utils.storage import response_exists, log_cost, get_total_cost

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
INTERACTION_DIR = PROJECT_ROOT / "stimuli" / "interaction_study"
CONFIG_DIR = PROJECT_ROOT / "config"
PHASE = "interaction"


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


def load_interaction_conditions() -> List[Dict[str, Any]]:
    """
    Load all interaction study conditions from subdirectories.

    Returns:
        List of condition dicts
    """
    conditions = []

    subdirs = [
        "single_signal",
        "positive_pairs",
        "negative_pairs",
        "mixed_pairs",
        "triple_combos",
    ]

    for subdir in subdirs:
        subdir_path = INTERACTION_DIR / subdir
        if not subdir_path.exists():
            continue

        for json_file in subdir_path.glob("*.json"):
            try:
                with open(json_file, "r") as f:
                    data = json.load(f)
                    data["condition_type"] = subdir
                    data["source_file"] = str(json_file)
                    conditions.append(data)
            except json.JSONDecodeError as e:
                print(f"  WARNING: Invalid JSON in {json_file}: {e}")

    return conditions


def generate_trial_id(
    condition_id: str,
    model_id: str,
    trial_num: int,
) -> str:
    """Generate a unique trial ID for interaction study."""
    return f"int_{condition_id}_{model_id}_{trial_num:03d}"


async def run_interaction_study():
    """
    Run the signal interaction study.
    """
    params = load_study_params()
    brands = load_brands()
    system_prompt = load_system_prompt()
    models_config = load_models_config()
    test_models = models_config.get("models", [])

    trials_per_condition = params["trial_counts"]["interaction_study_per_condition"]

    # Load conditions
    conditions = load_interaction_conditions()

    if not conditions:
        print("No interaction study conditions found.")
        print("Create condition files in stimuli/interaction_study/")
        return

    print(f"\nLoaded {len(conditions)} interaction conditions")
    print(f"Trials per condition: {trials_per_condition}")
    print(f"Models: {len(test_models)}")

    total_trials = len(conditions) * trials_per_condition * len(test_models)
    print(f"Total trials: {total_trials:,}")

    # Cost estimate
    cost_per_trial = 0.005
    estimated_cost = total_trials * cost_per_trial
    print(f"Estimated cost: ${estimated_cost:.2f}")

    if estimated_cost > 50:
        print(f"\nWARNING: Estimated cost exceeds $50")
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return

    # Check total project cost
    total_cost = get_total_cost()
    if total_cost > 800:
        print(f"WARNING: Total project cost is ${total_cost:.2f}")
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return

    print("\n" + "=" * 60)
    print("Starting interaction study")
    print("=" * 60)

    # Progress tracking
    start_time = datetime.utcnow()
    completed_count = 0
    skipped_count = 0
    failed_count = 0
    total_actual_cost = 0.0

    pbar = tqdm(total=total_trials, desc="Interaction study")

    results_by_type = {
        "single_signal": {"completed": 0, "cost": 0.0},
        "positive_pairs": {"completed": 0, "cost": 0.0},
        "negative_pairs": {"completed": 0, "cost": 0.0},
        "mixed_pairs": {"completed": 0, "cost": 0.0},
        "triple_combos": {"completed": 0, "cost": 0.0},
    }

    for condition in conditions:
        condition_id = condition.get("condition_id", "unknown")
        condition_type = condition.get("condition_type", "unknown")
        template = condition.get("template", "")

        if not template:
            print(f"\n  WARNING: No template for {condition_id}, skipping")
            continue

        for model in test_models:
            model_id = model["id"]

            for trial_num in range(trials_per_condition):
                trial_id = generate_trial_id(condition_id, model_id, trial_num)

                # Check if already completed
                if response_exists(PHASE, model_id, condition_id, trial_id):
                    skipped_count += 1
                    pbar.update(1)
                    continue

                # Build prompt
                # Use B2C context and recommendation intent for interaction study
                user_prompt = f"""A consumer is looking to make a purchase. Based on the following information, which option would you recommend?

{template}

Please provide your recommendation with reasoning."""

                # Make API call
                result = await call_model(
                    model_id=model_id,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    trial_id=trial_id,
                    phase=PHASE,
                    dimension_id=condition_id,
                )

                if result.get("error"):
                    failed_count += 1
                else:
                    completed_count += 1
                    cost = result.get("cost_usd", 0)
                    total_actual_cost += cost
                    results_by_type[condition_type]["completed"] += 1
                    results_by_type[condition_type]["cost"] += cost

                pbar.update(1)
                pbar.set_postfix({
                    "done": completed_count,
                    "skip": skipped_count,
                    "cost": f"${total_actual_cost:.2f}",
                })

    pbar.close()

    # Final summary
    print("\n" + "=" * 60)
    print("INTERACTION STUDY COMPLETE")
    print("=" * 60)

    print(f"\nTrials completed: {completed_count:,}")
    print(f"Trials skipped:   {skipped_count:,} (already existed)")
    print(f"Trials failed:    {failed_count:,}")
    print(f"Total cost:       ${total_actual_cost:.2f}")

    print("\nBy condition type:")
    for ctype, data in results_by_type.items():
        if data["completed"] > 0:
            print(f"  {ctype}: {data['completed']} trials, ${data['cost']:.2f}")

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    print(f"\nElapsed time: {elapsed/60:.1f} minutes")

    # Log cost
    if completed_count > 0:
        log_cost(
            script="05_interaction_study.py",
            model_id="all",
            trials_run=completed_count,
            prompt_tokens=0,
            completion_tokens=0,
            cost_usd=total_actual_cost,
        )

    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. Run judge scoring: python scripts/06_judge_scoring.py")
    print("=" * 60)


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Interaction Study")
    print("=" * 60)

    asyncio.run(run_interaction_study())


if __name__ == "__main__":
    main()
