#!/usr/bin/env python3
"""
01_build_stimuli.py - Generate and validate all stimulus prompts.

This script:
1. Validates every stimulus file against the schema
2. Expands all template strings using category variants and brand register
3. Writes registration/stimulus_library_v1.json for OSF upload

Run before pre-registration.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.validators import validate_stimulus_file

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
STIMULI_DIR = PROJECT_ROOT / "stimuli"
MAIN_BATTERY_DIR = STIMULI_DIR / "main_battery"
INTERACTION_DIR = STIMULI_DIR / "interaction_study"
CONFIG_DIR = PROJECT_ROOT / "config"
REGISTRATION_DIR = PROJECT_ROOT / "registration"
BRANDS_FILE = STIMULI_DIR / "brands.json"
SYSTEM_PROMPT_FILE = STIMULI_DIR / "system_prompt.txt"

# Load configs
def load_json(path: Path) -> Dict[str, Any]:
    """Load JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_study_params() -> Dict[str, Any]:
    """Load study parameters."""
    return load_json(CONFIG_DIR / "study_params.json")


def load_brands() -> Dict[str, Any]:
    """Load brand register."""
    return load_json(BRANDS_FILE)


def load_system_prompt() -> str:
    """Load system prompt."""
    with open(SYSTEM_PROMPT_FILE, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_dimensions() -> List[Dict[str, Any]]:
    """Load dimension configurations."""
    config = load_json(CONFIG_DIR / "dimensions.json")
    return config.get("dimensions", [])


def expand_template(
    template: str,
    category_variant: Dict[str, Any],
    brands: Dict[str, Any],
    category: str,
) -> str:
    """
    Expand a template string with category variant and brand data.

    Supports placeholders: {brand}, {product}, {features}, {price}, and any
    custom fields defined in the category variant.
    """
    # Get brand data
    brand_slot = category_variant.get("brand_slot", "brand_a")
    category_brands = brands.get("brands", {}).get(category, {})
    brand_data = category_brands.get(brand_slot, {"name": "Brand"})

    # Build replacement dict
    replacements = {
        "brand": brand_data.get("name", "Brand"),
        **category_variant,
    }

    # Remove non-string values
    replacements = {k: str(v) for k, v in replacements.items() if isinstance(v, (str, int, float))}

    # Expand template
    result = template
    for key, value in replacements.items():
        result = result.replace(f"{{{key}}}", str(value))

    return result


def generate_prompt(
    dimension_data: Dict[str, Any],
    condition: str,  # "control" or "manipulation"
    context: str,  # "b2c" or "b2b"
    intent_type: str,
    category: str,
    brands: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Generate a complete prompt for a single trial.

    Returns:
        Dict with system_prompt, user_prompt, and metadata
    """
    system_prompt = load_system_prompt()

    # Get condition template
    condition_data = dimension_data["conditions"].get(condition, {})
    template = condition_data.get("template", "")

    # Get category variant
    category_variant = dimension_data.get("category_variants", {}).get(category, {})

    if not category_variant:
        return None  # Skip if category not defined for this dimension

    # Expand template
    product_description = expand_template(template, category_variant, brands, category)

    # Get frame
    frame_key = f"{context}_frame"
    frame = dimension_data.get(frame_key, "")
    product_type = category_variant.get("product", "product")
    frame = frame.replace("{product_type}", product_type)

    # Get Option B (neutral competitor) for comparison/delegated intents
    option_b = category_variant.get("option_b", "")

    # Build user prompt based on intent type
    if intent_type == "recommendation":
        user_prompt = f"{frame}\n\n{product_description}\n\nPlease provide your recommendation."
    elif intent_type == "comparison":
        # For comparison: present both options explicitly
        if option_b:
            user_prompt = f"{frame}\n\nOption A: {product_description}\n\nOption B: {option_b}\n\nPlease compare the options and recommend one."
        else:
            # Fallback if no option_b defined (shouldn't happen)
            user_prompt = f"{frame}\n\n{product_description}\n\nPlease compare the options and recommend one."
    elif intent_type == "delegated_purchase":
        # For delegated purchase: present both options explicitly
        if option_b:
            user_prompt = f"{frame}\n\nOption A: {product_description}\n\nOption B: {option_b}\n\nIf you were making this purchase on behalf of the user, which would you choose?"
        else:
            # Fallback if no option_b defined (shouldn't happen)
            user_prompt = f"{frame}\n\n{product_description}\n\nIf you were making this purchase on behalf of the user, which would you choose?"
    else:
        user_prompt = f"{frame}\n\n{product_description}"

    return {
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "metadata": {
            "dimension_id": dimension_data.get("dimension_id"),
            "dimension_name": dimension_data.get("dimension_name"),
            "condition": condition,
            "condition_label": condition_data.get("label"),
            "context": context,
            "intent_type": intent_type,
            "category": category,
            "frame": frame,
            "product_description": product_description,
            "option_b": option_b if option_b else None,
        },
    }


def validate_all_stimuli() -> Tuple[int, int, List[str]]:
    """
    Validate all stimulus files in main_battery and interaction_study.

    Returns:
        Tuple of (valid_count, invalid_count, error_list)
    """
    valid = 0
    invalid = 0
    errors = []

    # Validate main battery
    if MAIN_BATTERY_DIR.exists():
        for json_file in MAIN_BATTERY_DIR.glob("*.json"):
            is_valid, file_errors = validate_stimulus_file(json_file)
            if is_valid:
                valid += 1
            else:
                invalid += 1
                for err in file_errors:
                    errors.append(f"{json_file.name}: {err}")

    # Validate interaction study
    for subdir in INTERACTION_DIR.iterdir():
        if subdir.is_dir():
            for json_file in subdir.glob("*.json"):
                # Interaction stimuli have different schema - basic validation
                try:
                    with open(json_file, "r") as f:
                        json.load(f)
                    valid += 1
                except json.JSONDecodeError as e:
                    invalid += 1
                    errors.append(f"{json_file.name}: Invalid JSON - {e}")

    return valid, invalid, errors


def generate_all_prompts() -> Dict[str, Any]:
    """
    Generate all prompts for the stimulus library.

    Returns:
        Complete stimulus library dict
    """
    params = load_study_params()
    brands = load_brands()

    contexts = params.get("contexts", ["b2c", "b2b"])
    intent_types = params.get("intent_types", ["recommendation", "comparison", "delegated_purchase"])
    categories = params.get("categories", [])

    library = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "version": "v1",
        "total_prompts": 0,
        "breakdown": {
            "by_dimension": {},
            "by_condition": {"control": 0, "manipulation": 0},
            "by_context": {"b2c": 0, "b2b": 0},
        },
        "prompts": [],
    }

    # Load all dimension stimulus files
    prompt_id = 0
    for dim_file in sorted(MAIN_BATTERY_DIR.glob("dim_*.json")):
        with open(dim_file, "r") as f:
            dim_data = json.load(f)

        dimension_id = dim_data.get("dimension_id", dim_file.stem)
        library["breakdown"]["by_dimension"][dimension_id] = 0

        for condition in ["control", "manipulation"]:
            for context in contexts:
                for intent in intent_types:
                    for category in categories:
                        prompt = generate_prompt(
                            dim_data, condition, context, intent, category, brands
                        )

                        if prompt is None:
                            continue

                        prompt_id += 1
                        prompt["prompt_id"] = f"prompt_{prompt_id:06d}"
                        library["prompts"].append(prompt)

                        # Update counts
                        library["total_prompts"] += 1
                        library["breakdown"]["by_dimension"][dimension_id] += 1
                        library["breakdown"]["by_condition"][condition] += 1
                        library["breakdown"]["by_context"][context] += 1

    return library


def estimate_api_costs(library: Dict[str, Any], params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Estimate total API costs for the main run.

    Returns:
        Cost estimates by model and total
    """
    # Approximate tokens per prompt
    avg_prompt_tokens = 400  # system + user prompt
    avg_completion_tokens = 300  # typical response

    # Pricing per 1M tokens (rough estimates)
    pricing = {
        "gpt54": {"input": 5.0, "output": 15.0},
        "o3": {"input": 10.0, "output": 40.0},
        "gemini31": {"input": 1.25, "output": 5.0},
        "claude46": {"input": 3.0, "output": 15.0},
        "llama4": {"input": 0.8, "output": 0.8},
        "perplexity": {"input": 3.0, "output": 15.0},
    }

    # Calculate trials per condition
    trial_counts = params.get("trial_counts", {})
    replication_trials = trial_counts.get("replication_dims_per_condition", 60)
    novel_trials = trial_counts.get("novel_dims_per_condition", 100)

    # Estimate total calls
    # 26 dimensions × 2 conditions × 2 contexts × 3 intents × 8 categories × trials × 6 models
    # But not all combos exist, so use prompt count as base
    unique_prompts = library["total_prompts"]
    avg_trials = (replication_trials + novel_trials) / 2
    total_calls_per_model = unique_prompts * avg_trials / (8 * 3 * 2)  # Rough estimate

    estimates = {"by_model": {}, "total": 0.0}

    for model_id, prices in pricing.items():
        input_cost = (total_calls_per_model * avg_prompt_tokens / 1_000_000) * prices["input"]
        output_cost = (total_calls_per_model * avg_completion_tokens / 1_000_000) * prices["output"]
        model_cost = input_cost + output_cost
        estimates["by_model"][model_id] = round(model_cost, 2)
        estimates["total"] += model_cost

    estimates["total"] = round(estimates["total"], 2)
    estimates["estimated_calls_per_model"] = int(total_calls_per_model)

    return estimates


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Stimulus Builder")
    print("=" * 60)

    # Step 1: Validate all stimulus files
    print("\n[1/3] Validating stimulus files...")
    valid, invalid, errors = validate_all_stimuli()
    print(f"  Valid files: {valid}")
    print(f"  Invalid files: {invalid}")

    if invalid > 0:
        print("\n  ERRORS (must fix before proceeding):")
        for error in errors:
            print(f"    - {error}")
        print("\nFix errors and re-run. Exiting.")
        sys.exit(1)

    if valid == 0:
        print("\n  WARNING: No stimulus files found.")
        print("  Create stimulus files in stimuli/main_battery/ before running.")
        print("  See CLAUDE.md for the stimulus file format.")

    # Step 2: Generate all prompts
    print("\n[2/3] Generating prompt library...")
    library = generate_all_prompts()
    print(f"  Total unique prompts: {library['total_prompts']}")
    print(f"  By condition: {library['breakdown']['by_condition']}")
    print(f"  By context: {library['breakdown']['by_context']}")

    # Step 3: Write stimulus library
    print("\n[3/3] Writing stimulus library...")
    REGISTRATION_DIR.mkdir(parents=True, exist_ok=True)
    output_path = REGISTRATION_DIR / "stimulus_library_v1.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(library, f, indent=2, ensure_ascii=False)

    print(f"  Written to: {output_path}")

    # Cost estimates
    print("\n" + "=" * 60)
    print("Cost Estimates (Main Run)")
    print("=" * 60)

    params = load_study_params()
    costs = estimate_api_costs(library, params)

    print(f"\n  Estimated calls per model: {costs['estimated_calls_per_model']:,}")
    print("\n  By model:")
    for model, cost in costs["by_model"].items():
        print(f"    {model}: ${cost:.2f}")
    print(f"\n  TOTAL ESTIMATED COST: ${costs['total']:.2f}")

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"  Stimulus files validated: {valid}")
    print(f"  Unique prompts generated: {library['total_prompts']}")
    print(f"  Stimulus library: {output_path}")
    print("\nNext steps:")
    print("  1. Review stimulus_library_v1.json")
    print("  2. Run pilot: python scripts/02_pilot_run.py")
    print("=" * 60)


if __name__ == "__main__":
    main()
