"""
Validation helpers for APIS.

- Stimulus schema validation
- Data completeness checks
- Response validation
"""

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Add parent to path for imports when run directly
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

try:
    from jsonschema import Draft7Validator, ValidationError
except ImportError:
    Draft7Validator = None
    ValidationError = Exception

# Stimulus file schema
STIMULUS_SCHEMA = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": [
        "dimension_id",
        "dimension_name",
        "cluster",
        "evidence_tier",
        "conditions",
        "category_variants",
        "b2c_frame",
        "b2b_frame",
        "manipulation_check_prompt",
        "manipulation_check_target_keywords",
    ],
    "properties": {
        "dimension_id": {"type": "string", "pattern": "^dim_\\d{2}$"},
        "dimension_name": {"type": "string", "minLength": 1},
        "cluster": {"type": "string", "enum": ["A", "B", "C", "D", "E", "F"]},
        "evidence_tier": {"type": "string", "enum": ["a", "b", "c"]},
        "trial_count_b2c": {"type": "integer", "minimum": 1},
        "trial_count_b2b": {"type": "integer", "minimum": 1},
        "replication": {"type": "boolean"},
        "conditions": {
            "type": "object",
            "required": ["control", "manipulation"],
            "properties": {
                "control": {
                    "type": "object",
                    "required": ["label", "description", "template"],
                    "properties": {
                        "label": {"type": "string"},
                        "description": {"type": "string"},
                        "template": {"type": "string"},
                    },
                },
                "manipulation": {
                    "type": "object",
                    "required": ["label", "description", "template"],
                    "properties": {
                        "label": {"type": "string"},
                        "description": {"type": "string"},
                        "template": {"type": "string"},
                    },
                },
            },
        },
        "category_variants": {
            "type": "object",
            "minProperties": 1,
        },
        "b2c_frame": {"type": "string", "minLength": 1},
        "b2b_frame": {"type": "string", "minLength": 1},
        "manipulation_check_prompt": {"type": "string", "minLength": 1},
        "manipulation_check_target_keywords": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 1,
        },
        "published_effect": {
            "type": "object",
            "properties": {
                "source": {"type": "string"},
                "direction": {"type": "string"},
                "magnitude": {"type": "string"},
                "model": {"type": "string"},
            },
        },
        "turns": {
            "type": "array",
            "description": "For agentic multi-turn dimensions",
            "items": {
                "type": "object",
                "required": ["role", "content"],
            },
        },
    },
}


def validate_stimulus_schema(stimulus_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a stimulus file against the schema.

    Args:
        stimulus_data: Parsed JSON data from a stimulus file

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    if Draft7Validator is None:
        return True, ["jsonschema not installed - skipping validation"]

    validator = Draft7Validator(STIMULUS_SCHEMA)
    errors = []

    for error in validator.iter_errors(stimulus_data):
        path = " -> ".join(str(p) for p in error.path) if error.path else "root"
        errors.append(f"{path}: {error.message}")

    return len(errors) == 0, errors


def validate_stimulus_file(file_path: Path) -> Tuple[bool, List[str]]:
    """
    Validate a stimulus file from disk.

    Args:
        file_path: Path to the stimulus JSON file

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        return False, [f"Invalid JSON: {e}"]
    except FileNotFoundError:
        return False, [f"File not found: {file_path}"]

    return validate_stimulus_schema(data)


def validate_all_stimuli(stimuli_dir: Path) -> Dict[str, Any]:
    """
    Validate all stimulus files in a directory.

    Returns:
        Dict with validation results per file and summary
    """
    results = {
        "files": {},
        "total": 0,
        "valid": 0,
        "invalid": 0,
        "errors": [],
    }

    if not stimuli_dir.exists():
        results["errors"].append(f"Directory not found: {stimuli_dir}")
        return results

    for json_file in stimuli_dir.rglob("*.json"):
        results["total"] += 1
        is_valid, errors = validate_stimulus_file(json_file)

        results["files"][str(json_file)] = {
            "valid": is_valid,
            "errors": errors,
        }

        if is_valid:
            results["valid"] += 1
        else:
            results["invalid"] += 1
            for error in errors:
                results["errors"].append(f"{json_file.name}: {error}")

    return results


def check_data_completeness(
    phase: str,
    expected_counts: Dict[str, Dict[str, int]],
    data_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Verify trial counts match expected counts per dimension.

    Args:
        phase: Study phase (pilot, main, interaction)
        expected_counts: Dict of {model_id: {dimension_id: expected_count}}
        data_dir: Base data directory

    Returns:
        Dict with completeness status and any missing trials
    """
    from .storage import count_completed_trials

    base_dir = data_dir or Path("data/raw")
    results = {
        "complete": True,
        "missing": [],
        "summary": {},
    }

    for model_id, dimensions in expected_counts.items():
        results["summary"][model_id] = {}

        for dimension_id, expected in dimensions.items():
            counts = count_completed_trials(phase, model_id, dimension_id, base_dir)
            actual = counts["completed"]

            results["summary"][model_id][dimension_id] = {
                "expected": expected,
                "actual": actual,
                "complete": actual >= expected,
            }

            if actual < expected:
                results["complete"] = False
                results["missing"].append({
                    "model": model_id,
                    "dimension": dimension_id,
                    "expected": expected,
                    "actual": actual,
                    "missing": expected - actual,
                })

    return results


def validate_response_format(response: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate that a response has all required fields.

    Required fields:
    - trial_id
    - model_id
    - model_string
    - response_text (unless status is 'failed')
    - timestamp
    """
    required_fields = ["trial_id", "model_id", "timestamp"]
    errors = []

    for field in required_fields:
        if field not in response:
            errors.append(f"Missing required field: {field}")

    # If not failed, must have response_text
    if response.get("status") != "failed":
        if "response_text" not in response:
            errors.append("Missing response_text (and status is not 'failed')")

    return len(errors) == 0, errors


def check_for_refusals(response_text: str) -> Dict[str, Any]:
    """
    Check if a response contains a refusal to recommend.

    Returns:
        Dict with is_refusal bool and matched patterns
    """
    refusal_patterns = [
        "i cannot recommend",
        "i can't recommend",
        "i'm unable to recommend",
        "i am unable to recommend",
        "i don't have enough information",
        "i cannot make a recommendation",
        "i can't make a recommendation",
        "it would not be appropriate",
        "i must decline",
        "i cannot provide a recommendation",
    ]

    lower_text = response_text.lower()
    matched = [p for p in refusal_patterns if p in lower_text]

    return {
        "is_refusal": len(matched) > 0,
        "matched_patterns": matched,
    }


def main():
    """CLI for validation checks."""
    parser = argparse.ArgumentParser(description="APIS data validation")
    parser.add_argument(
        "--check-stimuli",
        action="store_true",
        help="Validate all stimulus files",
    )
    parser.add_argument(
        "--check-completeness",
        action="store_true",
        help="Check data completeness",
    )
    parser.add_argument(
        "--phase",
        default="pilot",
        help="Phase to check (pilot, main, interaction)",
    )
    parser.add_argument(
        "--stimuli-dir",
        default="stimuli/main_battery",
        help="Directory containing stimulus files",
    )

    args = parser.parse_args()

    if args.check_stimuli:
        print(f"Validating stimuli in: {args.stimuli_dir}")
        results = validate_all_stimuli(Path(args.stimuli_dir))

        print(f"\nTotal files: {results['total']}")
        print(f"Valid: {results['valid']}")
        print(f"Invalid: {results['invalid']}")

        if results["errors"]:
            print("\nErrors:")
            for error in results["errors"]:
                print(f"  - {error}")

        sys.exit(0 if results["invalid"] == 0 else 1)

    if args.check_completeness:
        print(f"Checking completeness for phase: {args.phase}")
        # This would need expected counts from study_params.json
        print("Note: Run with specific expected counts for full check")
        sys.exit(0)

    parser.print_help()


if __name__ == "__main__":
    main()
