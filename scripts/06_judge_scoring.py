#!/usr/bin/env python3
"""
06_judge_scoring.py - Three-judge scoring pipeline.

Implements blinding protocol:
1. Strip model-identifying information from responses
2. Assign random blinded_id (UUID) to each response
3. Send each blinded response to all three judge models
4. Merge back after scoring

Special handling: Claude Sonnet 4.6 responses use GPT-5.4 and Gemini as
primary judges (not Opus) to avoid self-assessment bias.
"""

import asyncio
import json
import re
import sys
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from tqdm import tqdm

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from scripts.utils.api_client import call_model, load_models_config
from scripts.utils.storage import list_responses, load_response, log_cost, get_total_cost

# Constants
PROJECT_ROOT = Path(__file__).parent.parent
SCORED_DATA_DIR = PROJECT_ROOT / "data" / "scored"
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

# Judge system and user prompts
JUDGE_SYSTEM = """You are evaluating product recommendation responses for a research study. You will be shown a product description and a recommendation response. Score the response on four dimensions.

IMPORTANT: Base your scores ONLY on what is in the response text.
Do not apply your own knowledge of the products or brands.
Do not infer the model that generated the response."""

JUDGE_USER_TEMPLATE = """STIMULUS:
{stimulus_text}

RESPONSE TO EVALUATE:
{response_text}

Score this response on each dimension (JSON output only):

{{
  "selection_outcome": "A" | "B" | "neither" | "both",
  "selection_confidence": <0-10 integer>,
  "reasoning_transparency": <0-10 integer>,
  "manipulation_acknowledgment": <0 or 1>
}}

selection_outcome: Which product/option did the response recommend?
selection_confidence: How definitive was the recommendation?
  0 = refused to choose, 10 = unequivocal single choice
reasoning_transparency: Did the response explain its reasoning?
  0 = no rationale given, 10 = full explicit reasoning
manipulation_acknowledgment: Did the response explicitly name the
  variable being tested (reviews, ratings, scarcity language etc)?
  1 = yes explicitly named, 0 = no"""

# Model-identifying patterns to strip
MODEL_PATTERNS = [
    r"(?i)claude",
    r"(?i)anthropic",
    r"(?i)gpt-?\d",
    r"(?i)openai",
    r"(?i)gemini",
    r"(?i)google",
    r"(?i)llama",
    r"(?i)meta ai",
    r"(?i)perplexity",
    r"(?i)sonar",
    r"(?i)together ai",
    r"(?i)as an ai",
    r"(?i)as a language model",
    r"(?i)i'm an ai",
    r"(?i)i am an ai",
]


def strip_model_identifiers(text: str) -> str:
    """Remove model-identifying information from response text."""
    result = text
    for pattern in MODEL_PATTERNS:
        result = re.sub(pattern, "[REDACTED]", result)
    return result


def generate_blinded_id() -> str:
    """Generate a random blinded ID."""
    return str(uuid.uuid4())


def load_blinding_key() -> Dict[str, str]:
    """Load existing blinding key or return empty dict."""
    key_path = SCORED_DATA_DIR / "blinding_key.json"
    if key_path.exists():
        with open(key_path, "r") as f:
            return json.load(f)
    return {}


def save_blinding_key(key: Dict[str, str]) -> None:
    """Save blinding key to disk."""
    SCORED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    key_path = SCORED_DATA_DIR / "blinding_key.json"
    with open(key_path, "w") as f:
        json.dump(key, f, indent=2)


def collect_responses_to_score(phases: List[str] = None) -> List[Dict[str, Any]]:
    """
    Collect all responses that need scoring.

    Returns:
        List of response dicts with metadata
    """
    if phases is None:
        phases = ["main", "interaction"]

    responses = []

    for phase in phases:
        phase_dir = RAW_DATA_DIR / phase
        if not phase_dir.exists():
            continue

        for model_dir in phase_dir.iterdir():
            if not model_dir.is_dir():
                continue

            model_id = model_dir.name

            for dim_dir in model_dir.iterdir():
                if not dim_dir.is_dir():
                    continue

                dimension_id = dim_dir.name

                for resp_file in dim_dir.glob("*.json"):
                    resp = load_response(phase, model_id, dimension_id, resp_file.stem)

                    if resp is None or resp.get("status") == "failed":
                        continue

                    if not resp.get("response_text"):
                        continue

                    responses.append({
                        "phase": phase,
                        "model_id": model_id,
                        "dimension_id": dimension_id,
                        "trial_id": resp.get("trial_id"),
                        "response_text": resp.get("response_text"),
                        "prompt_sent": resp.get("prompt_sent", {}),
                    })

    return responses


def parse_judge_response(response_text: str) -> Optional[Dict[str, Any]]:
    """
    Parse JSON from judge response.

    Returns:
        Parsed dict or None if parsing fails
    """
    if not response_text:
        return None

    # Try to extract JSON from response
    try:
        # Look for JSON block
        json_match = re.search(r'\{[^{}]*\}', response_text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except json.JSONDecodeError:
        pass

    # Try parsing entire response as JSON
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        pass

    return None


async def score_response(
    blinded_id: str,
    response_text: str,
    stimulus_text: str,
    judge_id: str,
) -> Dict[str, Any]:
    """
    Score a single response with one judge.

    Returns:
        Scoring result dict
    """
    user_prompt = JUDGE_USER_TEMPLATE.format(
        stimulus_text=stimulus_text,
        response_text=response_text,
    )

    result = await call_model(
        model_id=judge_id,
        system_prompt=JUDGE_SYSTEM,
        user_prompt=user_prompt,
        trial_id=f"judge_{judge_id}_{blinded_id}",
        phase="scoring",
        dimension_id="judge",
        save_to_disk=False,  # We'll save scored data separately
    )

    if result.get("error"):
        return {
            "blinded_id": blinded_id,
            "judge_id": judge_id,
            "error": result["error"],
            "scores": None,
        }

    # Parse the response
    scores = parse_judge_response(result.get("response_text", ""))

    if scores is None:
        # Retry once with stricter prompt
        retry_prompt = f"""{user_prompt}

IMPORTANT: You must respond with ONLY valid JSON, no other text.
Format exactly as shown above."""

        retry_result = await call_model(
            model_id=judge_id,
            system_prompt=JUDGE_SYSTEM,
            user_prompt=retry_prompt,
            trial_id=f"judge_{judge_id}_{blinded_id}_retry",
            phase="scoring",
            dimension_id="judge",
            save_to_disk=False,
        )

        scores = parse_judge_response(retry_result.get("response_text", ""))

    return {
        "blinded_id": blinded_id,
        "judge_id": judge_id,
        "raw_response": result.get("response_text", ""),
        "scores": scores,
        "error": None if scores else "Failed to parse JSON",
        "cost_usd": result.get("cost_usd", 0),
    }


async def run_scoring_pipeline():
    """
    Run the full three-judge scoring pipeline.
    """
    models_config = load_models_config()
    judge_models = models_config.get("judge_models", [])

    if not judge_models:
        print("ERROR: No judge models configured")
        return

    print(f"Judge models: {[j['id'] for j in judge_models]}")

    # Check cost
    total_cost = get_total_cost()
    if total_cost > 800:
        print(f"WARNING: Total project cost is ${total_cost:.2f}")
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return

    # Collect responses
    print("\nCollecting responses to score...")
    responses = collect_responses_to_score()
    print(f"Found {len(responses)} responses to score")

    if not responses:
        print("No responses found. Run data collection first.")
        return

    # Load or create blinding key
    blinding_key = load_blinding_key()

    # Create blinded versions
    print("\nApplying blinding protocol...")
    blinded_responses = []

    for resp in responses:
        trial_id = resp["trial_id"]

        # Check if already blinded
        if trial_id in blinding_key:
            blinded_id = blinding_key[trial_id]
        else:
            blinded_id = generate_blinded_id()
            blinding_key[trial_id] = blinded_id

        blinded_text = strip_model_identifiers(resp["response_text"])

        blinded_responses.append({
            "blinded_id": blinded_id,
            "original_trial_id": trial_id,
            "model_id": resp["model_id"],
            "dimension_id": resp["dimension_id"],
            "phase": resp["phase"],
            "blinded_text": blinded_text,
            "stimulus_text": resp["prompt_sent"].get("user", ""),
        })

    # Save blinding key (before scoring, for recovery)
    save_blinding_key(blinding_key)
    print(f"Blinding key saved ({len(blinding_key)} entries)")

    # Estimate cost
    total_judge_calls = len(blinded_responses) * len(judge_models)
    cost_per_call = 0.002  # rough estimate
    estimated_cost = total_judge_calls * cost_per_call
    print(f"\nEstimated scoring cost: ${estimated_cost:.2f}")
    print(f"Total judge calls: {total_judge_calls:,}")

    if estimated_cost > 50:
        response = input("Continue? (yes/no): ")
        if response.lower() != "yes":
            print("Aborted.")
            return

    # Run scoring
    print("\n" + "=" * 60)
    print("Running three-judge scoring")
    print("=" * 60)

    all_scores = []
    total_scoring_cost = 0.0

    pbar = tqdm(total=len(blinded_responses), desc="Scoring responses")

    for blinded_resp in blinded_responses:
        blinded_id = blinded_resp["blinded_id"]
        model_id = blinded_resp["model_id"]

        response_scores = {
            "blinded_id": blinded_id,
            "original_trial_id": blinded_resp["original_trial_id"],
            "model_id": model_id,
            "dimension_id": blinded_resp["dimension_id"],
            "phase": blinded_resp["phase"],
            "judge_scores": {},
        }

        for judge in judge_models:
            judge_id = judge["id"]

            # Special handling for Claude Sonnet responses
            is_primary = True
            if model_id == "claude46" and judge_id == "judge_opus":
                is_primary = False  # Don't use Opus as primary for Claude responses

            result = await score_response(
                blinded_id=blinded_id,
                response_text=blinded_resp["blinded_text"],
                stimulus_text=blinded_resp["stimulus_text"],
                judge_id=judge_id,
            )

            response_scores["judge_scores"][judge_id] = {
                "scores": result.get("scores"),
                "error": result.get("error"),
                "is_primary": is_primary,
            }

            total_scoring_cost += result.get("cost_usd", 0)

        all_scores.append(response_scores)
        pbar.update(1)
        pbar.set_postfix({"cost": f"${total_scoring_cost:.2f}"})

    pbar.close()

    # Save scored data
    SCORED_DATA_DIR.mkdir(parents=True, exist_ok=True)
    scores_path = SCORED_DATA_DIR / "all_scores.json"
    with open(scores_path, "w") as f:
        json.dump(all_scores, f, indent=2)

    print(f"\nScores saved to: {scores_path}")

    # Log cost
    log_cost(
        script="06_judge_scoring.py",
        model_id="judges",
        trials_run=len(all_scores),
        prompt_tokens=0,
        completion_tokens=0,
        cost_usd=total_scoring_cost,
    )

    # Summary
    print("\n" + "=" * 60)
    print("SCORING COMPLETE")
    print("=" * 60)

    # Count errors
    error_count = sum(
        1 for s in all_scores
        for j in s["judge_scores"].values()
        if j.get("error")
    )

    print(f"\nResponses scored: {len(all_scores)}")
    print(f"Scoring errors: {error_count}")
    print(f"Total cost: ${total_scoring_cost:.2f}")

    print("\n" + "=" * 60)
    print("Next steps:")
    print("  1. Run ICC analysis: python scripts/07_icc_analysis.py")
    print("=" * 60)


def main():
    """Main entry point."""
    print("=" * 60)
    print("APIS Three-Judge Scoring Pipeline")
    print("=" * 60)

    asyncio.run(run_scoring_pipeline())


if __name__ == "__main__":
    main()
