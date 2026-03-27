"""
Response storage and retrieval for APIS.

All responses are saved immediately after receipt.
Path structure: data/raw/{phase}/{model_id}/{dimension_id}/{trial_id}.json

Data integrity rules:
- Raw response files are write-once (never overwrite)
- Every response includes exact prompt, model string, timestamp
- Failed trials are flagged with status: "failed", not deleted
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

load_dotenv()

# Base paths from environment or defaults
RAW_DATA_DIR = Path(os.getenv("RAW_DATA_DIR", "data/raw"))
SCORED_DATA_DIR = Path(os.getenv("SCORED_DATA_DIR", "data/scored"))
ANALYSIS_DATA_DIR = Path(os.getenv("ANALYSIS_DATA_DIR", "data/analysis"))


def get_response_path(
    phase: str,
    model_id: str,
    dimension_id: str,
    trial_id: str,
    base_dir: Optional[Path] = None,
) -> Path:
    """
    Generate the file path for a response.

    Args:
        phase: Study phase (pilot, main, interaction)
        model_id: Model identifier
        dimension_id: Dimension identifier
        trial_id: Unique trial identifier

    Returns:
        Path to the response JSON file
    """
    base = base_dir or RAW_DATA_DIR
    return base / phase / model_id / dimension_id / f"{trial_id}.json"


def response_exists(
    phase: str,
    model_id: str,
    dimension_id: str,
    trial_id: str,
    base_dir: Optional[Path] = None,
) -> bool:
    """Check if a response file already exists (for resumability)."""
    path = get_response_path(phase, model_id, dimension_id, trial_id, base_dir)
    return path.exists()


def save_response(
    response: Dict[str, Any],
    phase: str,
    model_id: str,
    dimension_id: str,
    trial_id: str,
    base_dir: Optional[Path] = None,
    allow_overwrite: bool = False,
) -> Path:
    """
    Save a response to disk immediately.

    Args:
        response: The response dict to save
        phase: Study phase
        model_id: Model identifier
        dimension_id: Dimension identifier
        trial_id: Unique trial identifier
        allow_overwrite: If False, raises error if file exists

    Returns:
        Path where the response was saved

    Raises:
        FileExistsError: If file exists and allow_overwrite is False
    """
    path = get_response_path(phase, model_id, dimension_id, trial_id, base_dir)

    if path.exists() and not allow_overwrite:
        raise FileExistsError(
            f"Response file already exists: {path}. "
            "Raw response files are write-once by design."
        )

    # Ensure directory exists
    path.parent.mkdir(parents=True, exist_ok=True)

    # Add metadata if not present
    if "saved_at" not in response:
        response["saved_at"] = datetime.utcnow().isoformat() + "Z"

    # Write atomically (write to temp, then rename)
    temp_path = path.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(response, f, indent=2, ensure_ascii=False)

    temp_path.rename(path)
    return path


def load_response(
    phase: str,
    model_id: str,
    dimension_id: str,
    trial_id: str,
    base_dir: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """
    Load a response from disk.

    Returns:
        The response dict, or None if file doesn't exist
    """
    path = get_response_path(phase, model_id, dimension_id, trial_id, base_dir)

    if not path.exists():
        return None

    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def mark_trial_failed(
    phase: str,
    model_id: str,
    dimension_id: str,
    trial_id: str,
    error_message: str,
    error_type: str = "unknown",
    base_dir: Optional[Path] = None,
) -> Path:
    """
    Create a failed trial record (instead of deleting).

    Per data integrity rules, we never delete from data/raw.
    """
    response = {
        "trial_id": trial_id,
        "model_id": model_id,
        "dimension_id": dimension_id,
        "phase": phase,
        "status": "failed",
        "error_type": error_type,
        "error_message": error_message,
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    return save_response(response, phase, model_id, dimension_id, trial_id, base_dir)


def list_responses(
    phase: str,
    model_id: Optional[str] = None,
    dimension_id: Optional[str] = None,
    base_dir: Optional[Path] = None,
) -> list:
    """
    List all response files matching the criteria.

    Returns:
        List of Path objects for matching response files
    """
    base = base_dir or RAW_DATA_DIR
    search_path = base / phase

    if model_id:
        search_path = search_path / model_id
        if dimension_id:
            search_path = search_path / dimension_id

    if not search_path.exists():
        return []

    return list(search_path.rglob("*.json"))


def count_completed_trials(
    phase: str,
    model_id: str,
    dimension_id: str,
    base_dir: Optional[Path] = None,
) -> Dict[str, int]:
    """
    Count completed vs failed trials for a dimension/model combo.

    Returns:
        Dict with 'completed', 'failed', 'total' counts
    """
    responses = list_responses(phase, model_id, dimension_id, base_dir)

    completed = 0
    failed = 0

    for path in responses:
        try:
            with open(path, "r") as f:
                data = json.load(f)
                if data.get("status") == "failed":
                    failed += 1
                else:
                    completed += 1
        except (json.JSONDecodeError, KeyError):
            failed += 1

    return {
        "completed": completed,
        "failed": failed,
        "total": completed + failed,
    }


def get_cost_log_path(base_dir: Optional[Path] = None) -> Path:
    """Get path to the cost log CSV."""
    base = base_dir or Path("data")
    return base / "cost_log.csv"


def log_cost(
    script: str,
    model_id: str,
    trials_run: int,
    prompt_tokens: int,
    completion_tokens: int,
    cost_usd: float,
    base_dir: Optional[Path] = None,
) -> None:
    """
    Append a cost entry to the cost log.

    Format: timestamp, script, model_id, trials_run, prompt_tokens,
            completion_tokens, cost_usd
    """
    path = get_cost_log_path(base_dir)
    path.parent.mkdir(parents=True, exist_ok=True)

    # Create header if file doesn't exist
    write_header = not path.exists()

    with open(path, "a", encoding="utf-8") as f:
        if write_header:
            f.write(
                "timestamp,script,model_id,trials_run,"
                "prompt_tokens,completion_tokens,cost_usd\n"
            )

        timestamp = datetime.utcnow().isoformat() + "Z"
        f.write(
            f"{timestamp},{script},{model_id},{trials_run},"
            f"{prompt_tokens},{completion_tokens},{cost_usd:.6f}\n"
        )


def get_total_cost(base_dir: Optional[Path] = None) -> float:
    """Get total project cost from the cost log."""
    path = get_cost_log_path(base_dir)

    if not path.exists():
        return 0.0

    total = 0.0
    with open(path, "r", encoding="utf-8") as f:
        next(f)  # Skip header
        for line in f:
            parts = line.strip().split(",")
            if len(parts) >= 7:
                try:
                    total += float(parts[6])
                except ValueError:
                    pass

    return total


if __name__ == "__main__":
    # Test storage functions
    print("Testing storage module...")

    test_response = {
        "trial_id": "test_001",
        "model_id": "gpt54",
        "response_text": "Test response",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }

    # Test path generation
    path = get_response_path("pilot", "gpt54", "dim_01", "test_001")
    print(f"Generated path: {path}")

    # Test existence check
    exists = response_exists("pilot", "gpt54", "dim_01", "test_001")
    print(f"Response exists: {exists}")

    print("Storage module tests complete.")
