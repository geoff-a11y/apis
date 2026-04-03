"""
Seed the benchmark database from existing JSON files.

Run from the project root:
    python -m api.seed_benchmark
"""

import json
import uuid
from pathlib import Path
from datetime import datetime

from database import init_database, get_db_session
from db_models import BenchmarkEntry

# Data directory
DATA_DIR = Path(__file__).parent.parent / "data"


def seed_from_expansion_results():
    """
    Seed from benchmark_results_expansion.json which has full signal data.
    """
    results_file = DATA_DIR / "benchmark_results_expansion.json"
    if not results_file.exists():
        print(f"File not found: {results_file}")
        return 0

    with open(results_file) as f:
        data = json.load(f)

    results = data.get("results", [])
    count = 0

    with get_db_session() as db:
        for result in results:
            if result.get("status") != "success":
                continue

            url = result.get("url")
            if not url:
                continue

            # Check if already exists
            existing = db.query(BenchmarkEntry).filter(
                BenchmarkEntry.url == url
            ).first()
            if existing:
                continue

            # Extract data
            domain = BenchmarkEntry.extract_domain(url)
            category = result.get("category") or BenchmarkEntry.detect_category(url, domain)
            universal_score = result.get("universal_score", 0.0)
            extraction_quality = result.get("extraction_quality", "partial")
            scored_at = result.get("scored_at", datetime.utcnow().isoformat() + "Z")

            # Build signal inventory JSON
            signal_inventory = result.get("signal_inventory", [])
            signal_inventory_json = json.dumps([
                {
                    "dimension_id": s.get("dimension_id"),
                    "score": s.get("score", 0.0),
                    "zone_contributions": s.get("zone_contributions", [])
                }
                for s in signal_inventory
            ])

            entry = BenchmarkEntry(
                id=str(uuid.uuid4()),
                url=url,
                domain=domain,
                category=category,
                universal_score=universal_score,
                extraction_quality=extraction_quality,
                scored_at=scored_at,
                signal_inventory_json=signal_inventory_json,
            )
            db.add(entry)
            count += 1

        db.commit()

    print(f"Seeded {count} entries from expansion results")
    return count


def seed_from_original_benchmark():
    """
    Seed from benchmark_analysis.json's all_pages.
    These have less detail but should still be included.
    """
    analysis_file = DATA_DIR / "benchmark_analysis.json"
    if not analysis_file.exists():
        print(f"File not found: {analysis_file}")
        return 0

    with open(analysis_file) as f:
        data = json.load(f)

    pages = data.get("all_pages", [])
    count = 0
    seen_urls = set()

    with get_db_session() as db:
        # Get all existing URLs
        existing_urls = set(
            row[0] for row in db.query(BenchmarkEntry.url).all()
        )

        for page in pages:
            url = page.get("url")
            if not url:
                continue

            # Skip if already exists in DB or already seen in this batch
            if url in existing_urls or url in seen_urls:
                continue
            seen_urls.add(url)

            domain = page.get("domain") or BenchmarkEntry.extract_domain(url)
            category = page.get("category") or BenchmarkEntry.detect_category(url, domain)
            universal_score = page.get("universal_score", 0.0)

            # Original data doesn't have full signal inventory
            signal_inventory_json = json.dumps([])

            entry = BenchmarkEntry(
                id=str(uuid.uuid4()),
                url=url,
                domain=domain,
                category=category,
                universal_score=universal_score,
                extraction_quality="partial",
                scored_at=data.get("generated_at", datetime.utcnow().isoformat() + "Z"),
                signal_inventory_json=signal_inventory_json,
            )
            db.add(entry)
            count += 1

        db.commit()

    print(f"Seeded {count} entries from original benchmark")
    return count


def main():
    """Initialize database and seed all benchmark data."""
    print("Initializing database...")
    init_database()

    print("Seeding from expansion results...")
    expansion_count = seed_from_expansion_results()

    print("Seeding from original benchmark...")
    original_count = seed_from_original_benchmark()

    print(f"\nTotal entries seeded: {expansion_count + original_count}")

    # Show database stats
    with get_db_session() as db:
        total = db.query(BenchmarkEntry).count()
        print(f"Total entries in database: {total}")


if __name__ == "__main__":
    main()
