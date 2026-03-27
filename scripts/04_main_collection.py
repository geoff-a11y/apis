#!/usr/bin/env python3
"""
04_main_collection.py - Phase 3: Main data collection.

Full battery across:
- 26 dimensions
- 6 models
- 2 contexts (B2C, B2B)
- 3 intent types
- 8 categories
- 60-100 trials per condition

Resumable: checks for existing responses before each call.
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
from scripts.utils.rate_limiter import CONCURRENCY_LIMITS

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
STIMULI_DIR = PROJECT_ROOT / "stimuli" / "main_battery"
CONFIG_DIR = PROJECT_ROOT / "config"
PHASE = "main"

# Pre-registration reminder
PRE_REG_REMINDER = "Reminder: confirm OSF pre-registration is complete before this run counts."


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


def load_dimensions_config() -> List[Dict[str, Any]]:
    """Load dimension configurations."""
    with open(CONFIG_DIR / "dimensions.json", "r") as f:
        data = json.load(f)
        return data.get("dimensions", [])


def load_dimension_stimuli(dimension_id: str) -> Optional[Dict[str, Any]]:
    """Load stimulus file for a dimension."""
    for f in STIMULI_DIR.glob(f"{dimension_id}*.json"):
        with open(f, "r") as fh:
            return json.load(fh)
    return None


def get_trial_count(dim_config: Dict[str, Any], context: str, params: Dict[str, Any]) -> int:
    """Get trial count for a dimension based on its tier and context."""
    trial_counts = params.get("trial_counts", {})

    if dim_config.get("replication", False):
        if context == "b2c":
            return trial_counts.get("replication_dims_per_condition", 60)
        else:
            return trial_counts.get("b2b_replication_per_condition", 80)
    else:
        return trial_counts.get("novel_dims_per_condition", 100)


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


async def collect_dimension_data(
    dimension_id: str,
    dim_data: Dict[str, Any],
    dim_config: Dict[str, Any],
    models: List[Dict[str, Any]],
    params: Dict[str, Any],
    brands: Dict[str, Any],
    system_prompt: str,
    progress_callback=None,
) -> Dict[str, Any]:
    """
    Collect data for a single dimension across all models.

    Returns:
        Results dict with counts and costs
    """
    contexts = params.get("contexts", ["b2c", "b2b"])
    intent_types = params.get("intent_types", ["recommendation", "comparison", "delegated_purchase"])
    categories = params.get("categories", [])

    results = {
        "dimension_id": dimension_id,
        "trials_planned": 0,
        "trials_completed": 0,
        "trials_skipped": 0,
        "trials_failed": 0,
        "total_cost": 0.0,
    }

    # Check if this is a multi-turn agentic dimension
    is_agentic = dim_config.get("agentic", False)
    turns = dim_data.get("turns", [])

    for condition in ["control", "manipulation"]:
        condition_data = dim_data["conditions"].get(condition, {})
        template = condition_data.get("template", "")

        for context in contexts:
            trial_count = get_trial_count(dim_config, context, params)
            frame_key = f"{context}_frame"
            base_frame = dim_data.get(frame_key, "")

            for intent in intent_types:
                for category in categories:
                    category_variant = dim_data.get("category_variants", {}).get(category)
                    if not category_variant:
                        continue

                    # Expand template
                    product_description = expand_template(template, category_variant, brands, category)

                    # Build frame
                    product_type = category_variant.get("product", "product")
                    frame = base_frame.replace("{product_type}", product_type)

                    # Build user prompt based on intent type
                    if intent == "recommendation":
                        user_prompt = f"{frame}\n\n{product_description}\n\nPlease provide your recommendation."
                    elif intent == "comparison":
                        user_prompt = f"{frame}\n\n{product_description}\n\nPlease compare the options and recommend one."
                    else:  # delegated_purchase
                        user_prompt = f"{frame}\n\n{product_description}\n\nIf you were making this purchase on behalf of the user, which would you choose?"

                    for model in models:
                        model_id = model["id"]

                        for trial_num in range(trial_count):
                            trial_id = generate_trial_id(
                                dimension_id, condition, context, intent, category, model_id, trial_num
                            )

                            results["trials_planned"] += 1

                            # Check if already completed (resumability)
                            if response_exists(PHASE, model_id, dimension_id, trial_id):
                                results["trials_skipped"] += 1
                                if progress_callback:
                                    progress_callback(skipped=True)
                                continue

                            # Make API call
                            if is_agentic and turns:
                                # Multi-turn conversation
                                result = await run_multi_turn_trial(
                                    model_id, system_prompt, turns, trial_id, dimension_id
                                )
                            else:
                                result = await call_model(
                                    model_id=model_id,
                                    system_prompt=system_prompt,
                                    user_prompt=user_prompt,
                                    trial_id=trial_id,
                                    phase=PHASE,
                                    dimension_id=dimension_id,
                                )

                            if result.get("error"):
                                results["trials_failed"] += 1
                            else:
                                results["trials_completed"] += 1
                                results["total_cost"] += result.get("cost_usd", 0)

                            if progress_callback:
                                progress_callback(completed=not result.get("error"))

    return results


async def run_multi_turn_trial(
    model_id: str,
    system_prompt: str,
    turns: List[Dict[str, Any]],
    trial_id: str,
    dimension_id: str,
) -> Dict[str, Any]:
    """
    Run a multi-turn agentic trial.

    Accumulates conversation history across turns.
    """
    conversation_history = []
    total_cost = 0.0
    all_responses = []

    for turn_idx, turn in enumerate(turns):
        role = turn.get("role", "user")
        content = turn.get("content", "")

        if role == "user":
            # Build prompt with conversation history
            history_text = "\n\n".join([
                f"{msg['role'].upper()}: {msg['content']}"
                for msg in conversation_history
            ])

            if history_text:
                user_prompt = f"Previous conversation:\n{history_text}\n\nUser: {content}"
            else:
                user_prompt = content

            # Make API call
            turn_trial_id = f"{trial_id}_turn{turn_idx:02d}"
            result = await call_model(
                model_id=model_id,
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                trial_id=turn_trial_id,
                phase=PHASE,
                dimension_id=dimension_id,
            )

            if result.get("error"):
                return result

            total_cost += result.get("cost_usd", 0)
            all_responses.append(result)

            # Add to conversation history
            conversation_history.append({"role": "user", "content": content})
            conversation_history.append({
                "role": "assistant",
                "content": result.get("response_text", "")
            })

    # Return combined result
    return {
        "trial_id": trial_id,
        "model_id": model_id,
        "multi_turn": True,
        "num_turns": len(turns),
        "responses": all_responses,
        "cost_usd": total_cost,
        "error": None,
    }


async def run_full_battery():
    """
    Run the full main battery data collection.
    """
    # Pre-registration reminder
    print(PRE_REG_REMINDER)
    print()

    params = load_study_params()
    brands = load_brands()
    system_prompt = load_system_prompt()
    models_config = load_models_config()
    test_models = models_config.get("models", [])
    dimensions_config = load_dimensions_config()

    # Check total project cost
    total_cost = get_total_cost()
    if total_cost > 800:
        print(f"WARNING: Total project cost is ${total_cost:.2f}")
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return

    # Estimate total trials
    total_estimated = 0
    for dim_config in dimensions_config:
        trial_count = get_trial_count(dim_config, "b2c", params)
        # rough estimate: 2 conditions × 2 contexts × 3 intents × 8 categories × 6 models
        total_estimated += trial_count * 2 * 2 * 3 * 8 * len(test_models)

    print(f"\nEstimated total trials: {total_estimated:,}")
    print(f"Models: {len(test_models)}")
    print(f"Dimensions: {len(dimensions_config)}")

    # Cost estimate
    cost_per_trial = 0.005  # rough estimate
    estimated_cost = total_estimated * cost_per_trial
    print(f"Estimated cost: ${estimated_cost:.2f}")

    if estimated_cost > 50:
        print(f"\nWARNING: Estimated cost exceeds $50")
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return

    print("\n" + "=" * 60)
    print("Starting main data collection")
    print("=" * 60)

    # Progress tracking
    start_time = datetime.utcnow()
    completed_count = 0
    skipped_count = 0
    total_actual_cost = 0.0

    # Progress bar
    pbar = tqdm(total=total_estimated, desc="Total progress")

    def update_progress(completed=False, skipped=False):
        nonlocal completed_count, skipped_count
        if completed:
            completed_count += 1
        if skipped:
            skipped_count += 1
        pbar.update(1)

        # Log progress every 100 trials
        if (completed_count + skipped_count) % 100 == 0:
            elapsed = (datetime.utcnow() - start_time).total_seconds()
            rate = (completed_count + skipped_count) / elapsed if elapsed > 0 else 0
            remaining = (total_estimated - completed_count - skipped_count) / rate if rate > 0 else 0
            pbar.set_postfix({
                "done": completed_count,
                "skip": skipped_count,
                "cost": f"${total_actual_cost:.2f}",
            })

    # Process each dimension
    all_results = []

    for dim_config in dimensions_config:
        dimension_id = dim_config["id"]
        dim_data = load_dimension_stimuli(dimension_id)

        if dim_data is None:
            print(f"\n  WARNING: No stimulus file for {dimension_id}, skipping")
            continue

        result = await collect_dimension_data(
            dimension_id=dimension_id,
            dim_data=dim_data,
            dim_config=dim_config,
            models=test_models,
            params=params,
            brands=brands,
            system_prompt=system_prompt,
            progress_callback=update_progress,
        )

        all_results.append(result)
        total_actual_cost += result["total_cost"]

    pbar.close()

    # Final summary
    print("\n" + "=" * 60)
    print("COLLECTION COMPLETE")
    print("=" * 60)

    total_planned = sum(r["trials_planned"] for r in all_results)
    total_completed = sum(r["trials_completed"] for r in all_results)
    total_skipped = sum(r["trials_skipped"] for r in all_results)
    total_failed = sum(r["trials_failed"] for r in all_results)

    print(f"\nTrials planned:   {total_planned:,}")
    print(f"Trials completed: {total_completed:,}")
    print(f"Trials skipped:   {total_skipped:,} (already existed)")
    print(f"Trials failed:    {total_failed:,}")
    print(f"Total cost:       ${total_actual_cost:.2f}")

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    print(f"\nElapsed time: {elapsed/3600:.1f} hours")

    # Log total cost
    if total_completed > 0:
        log_cost(
            script="04_main_collection.py",
            model_id="all",
            trials_run=total_completed,
            prompt_tokens=0,
            completion_tokens=0,
            cost_usd=total_actual_cost,
        )

    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. Run interaction study: python scripts/05_interaction_study.py")
    print("  2. Run judge scoring: python scripts/06_judge_scoring.py")
    print("=" * 60)


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Main Data Collection - Phase 3")
    print("=" * 60)

    asyncio.run(run_full_battery())


if __name__ == "__main__":
    main()
