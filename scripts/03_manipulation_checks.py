#!/usr/bin/env python3
"""
03_manipulation_checks.py - Phase 2: Manipulation check analysis.

Reads pilot responses and runs manipulation checks:
1. Sends manipulation_check_prompt to GPT-5.4 for each condition B response
2. Scores whether target keywords appear (binary: pass/fail)
3. Computes fail rate across trials

Output: data/analysis/manipulation_check_results.csv

Dimensions with fail_rate > 0.30 are flagged as REDESIGN.
"""

import asyncio
import csv
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from tqdm import tqdm

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.api_client import call_model
from scripts.utils.storage import list_responses, load_response

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
STIMULI_DIR = PROJECT_ROOT / "stimuli" / "main_battery"
ANALYSIS_DIR = PROJECT_ROOT / "data" / "analysis"
PILOT_MODEL = "gpt4o"
PHASE = "pilot"
FAIL_THRESHOLD = 0.30


def load_dimension_stimuli(dimension_id: str) -> Optional[Dict[str, Any]]:
    """Load stimulus file for a dimension."""
    for f in STIMULI_DIR.glob(f"{dimension_id}*.json"):
        with open(f, "r") as fh:
            return json.load(fh)
    return None


def get_pilot_responses(dimension_id: str) -> List[Dict[str, Any]]:
    """
    Get all pilot responses for a dimension's manipulation condition.

    Returns:
        List of response dicts for manipulation condition only
    """
    responses = []
    response_files = list_responses(PHASE, PILOT_MODEL, dimension_id)

    for resp_file in response_files:
        resp = load_response(
            PHASE,
            PILOT_MODEL,
            dimension_id,
            resp_file.stem,
        )

        if resp is None:
            continue

        # Only include manipulation condition responses
        trial_id = resp.get("trial_id", "")
        if "_manipulation_" in trial_id and resp.get("status") != "failed":
            responses.append(resp)

    return responses


async def run_manipulation_check(
    response: Dict[str, Any],
    check_prompt: str,
    dimension_id: str,
) -> Dict[str, Any]:
    """
    Run manipulation check on a single response.

    Returns:
        Dict with check results
    """
    original_response = response.get("response_text", "")
    trial_id = response.get("trial_id", "unknown")

    # Build the check prompt
    user_prompt = f"""Here is a product recommendation response:

---
{original_response}
---

{check_prompt}"""

    # Call model for manipulation check
    check_trial_id = f"manip_check_{trial_id}"

    result = await call_model(
        model_id=PILOT_MODEL,
        system_prompt="You are analyzing a product recommendation response.",
        user_prompt=user_prompt,
        trial_id=check_trial_id,
        phase="manipulation_checks",
        dimension_id=dimension_id,
        save_to_disk=True,
    )

    return {
        "original_trial_id": trial_id,
        "check_trial_id": check_trial_id,
        "check_response": result.get("response_text", ""),
        "error": result.get("error"),
    }


def score_manipulation_check(
    check_response: str,
    target_keywords: List[str],
) -> bool:
    """
    Score whether the manipulation check passed.

    A check passes if ANY of the target keywords appear in the response.

    Returns:
        True if passed (keyword found), False if failed
    """
    if not check_response:
        return False

    response_lower = check_response.lower()

    for keyword in target_keywords:
        if keyword.lower() in response_lower:
            return True

    return False


async def analyze_dimension(
    dimension_id: str,
    dim_data: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Run manipulation check analysis for a single dimension.

    Returns:
        Results dict with pass/fail rates
    """
    check_prompt = dim_data.get("manipulation_check_prompt", "")
    target_keywords = dim_data.get("manipulation_check_target_keywords", [])

    if not check_prompt or not target_keywords:
        return {
            "dimension_id": dimension_id,
            "status": "SKIP",
            "reason": "Missing manipulation_check_prompt or target_keywords",
            "n_responses": 0,
            "pass_count": 0,
            "fail_count": 0,
            "pass_rate": 0.0,
            "fail_rate": 0.0,
        }

    # Get manipulation condition responses
    responses = get_pilot_responses(dimension_id)

    if not responses:
        return {
            "dimension_id": dimension_id,
            "status": "SKIP",
            "reason": "No pilot responses found",
            "n_responses": 0,
            "pass_count": 0,
            "fail_count": 0,
            "pass_rate": 0.0,
            "fail_rate": 0.0,
        }

    # Run manipulation checks
    pass_count = 0
    fail_count = 0
    failed_trials = []

    for resp in tqdm(responses, desc=f"  {dimension_id}", leave=False):
        check_result = await run_manipulation_check(resp, check_prompt, dimension_id)

        if check_result.get("error"):
            continue

        passed = score_manipulation_check(
            check_result["check_response"],
            target_keywords,
        )

        if passed:
            pass_count += 1
        else:
            fail_count += 1
            failed_trials.append(check_result["original_trial_id"])

    total = pass_count + fail_count
    pass_rate = pass_count / total if total > 0 else 0.0
    fail_rate = fail_count / total if total > 0 else 0.0

    # Determine status
    if fail_rate > FAIL_THRESHOLD:
        status = "REDESIGN"
    elif fail_rate > 0.15:
        status = "FLAG"
    else:
        status = "PASS"

    return {
        "dimension_id": dimension_id,
        "status": status,
        "n_responses": total,
        "pass_count": pass_count,
        "fail_count": fail_count,
        "pass_rate": round(pass_rate, 3),
        "fail_rate": round(fail_rate, 3),
        "pass_threshold": 1 - FAIL_THRESHOLD,
        "failed_trials": failed_trials,
        "target_keywords": target_keywords,
    }


async def run_all_checks() -> List[Dict[str, Any]]:
    """
    Run manipulation checks for all dimensions with pilot data.

    Returns:
        List of results per dimension
    """
    results = []

    # Find all dimensions with pilot data
    pilot_dir = PROJECT_ROOT / "data" / "raw" / PHASE / PILOT_MODEL
    if not pilot_dir.exists():
        print("No pilot data found. Run 02_pilot_run.py first.")
        return results

    dimension_dirs = [d for d in pilot_dir.iterdir() if d.is_dir()]

    print(f"\nFound {len(dimension_dirs)} dimensions with pilot data")
    print("-" * 50)

    for dim_dir in sorted(dimension_dirs):
        dimension_id = dim_dir.name
        dim_data = load_dimension_stimuli(dimension_id)

        if dim_data is None:
            print(f"  WARNING: No stimulus file for {dimension_id}")
            continue

        result = await analyze_dimension(dimension_id, dim_data)
        results.append(result)

    return results


def save_results(results: List[Dict[str, Any]]) -> Path:
    """
    Save results to CSV.

    Returns:
        Path to output file
    """
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)
    output_path = ANALYSIS_DIR / "manipulation_check_results.csv"

    fieldnames = [
        "dimension_id",
        "status",
        "n_responses",
        "pass_count",
        "fail_count",
        "pass_rate",
        "fail_rate",
        "pass_threshold",
    ]

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    return output_path


def print_results(results: List[Dict[str, Any]]) -> None:
    """Print results summary."""
    print("\n" + "=" * 60)
    print("MANIPULATION CHECK RESULTS")
    print("=" * 60)

    # Summary table
    print(f"\n{'Dimension':<20} {'Status':<10} {'Pass Rate':<12} {'N':<6}")
    print("-" * 50)

    pass_dims = []
    flag_dims = []
    redesign_dims = []
    skip_dims = []

    for result in sorted(results, key=lambda x: x["dimension_id"]):
        dim_id = result["dimension_id"]
        status = result["status"]
        pass_rate = result["pass_rate"]
        n = result["n_responses"]

        status_display = status
        if status == "PASS":
            pass_dims.append(dim_id)
        elif status == "FLAG":
            flag_dims.append(dim_id)
            status_display = "FLAG ⚠️"
        elif status == "REDESIGN":
            redesign_dims.append(dim_id)
            status_display = "REDESIGN ❌"
        else:
            skip_dims.append(dim_id)
            status_display = "SKIP"

        print(f"{dim_id:<20} {status_display:<10} {pass_rate:.1%}        {n:<6}")

    # Summary counts
    print("\n" + "-" * 50)
    print(f"PASS:     {len(pass_dims)} dimensions")
    print(f"FLAG:     {len(flag_dims)} dimensions (pass rate 70-85%)")
    print(f"REDESIGN: {len(redesign_dims)} dimensions (pass rate <70%)")
    print(f"SKIP:     {len(skip_dims)} dimensions (no data)")

    # Action items
    if redesign_dims:
        print("\n" + "=" * 60)
        print("ACTION REQUIRED")
        print("=" * 60)
        print("\nThe following dimensions MUST be redesigned before Phase 3:")
        for dim_id in redesign_dims:
            result = next(r for r in results if r["dimension_id"] == dim_id)
            keywords = result.get("target_keywords", [])
            print(f"\n  {dim_id}:")
            print(f"    Fail rate: {result['fail_rate']:.1%}")
            print(f"    Target keywords: {', '.join(keywords[:5])}")
            if result.get("failed_trials"):
                print(f"    Failed trials (first 3): {result['failed_trials'][:3]}")

    if flag_dims:
        print("\n" + "-" * 50)
        print("FLAGGED dimensions (review recommended but not blocking):")
        for dim_id in flag_dims:
            result = next(r for r in results if r["dimension_id"] == dim_id)
            print(f"  {dim_id}: {result['fail_rate']:.1%} fail rate")


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Manipulation Check Analysis - Phase 2")
    print("=" * 60)

    # Run checks
    results = asyncio.run(run_all_checks())

    if not results:
        print("\nNo results to analyze. Run pilot study first.")
        sys.exit(1)

    # Save results
    output_path = save_results(results)
    print(f"\nResults saved to: {output_path}")

    # Print summary
    print_results(results)

    # Exit code based on results
    redesign_count = sum(1 for r in results if r["status"] == "REDESIGN")
    if redesign_count > 0:
        print(f"\n❌ {redesign_count} dimension(s) require redesign before Phase 3.")
        print("Fix these and re-run pilot before pre-registration.")
        sys.exit(1)
    else:
        print("\n✓ All dimensions passed manipulation checks.")
        print("Ready for pre-registration and Phase 3.")
        sys.exit(0)


if __name__ == "__main__":
    main()
