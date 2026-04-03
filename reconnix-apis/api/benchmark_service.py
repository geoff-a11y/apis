"""
Benchmark database service - CRUD operations and aggregation queries.
"""

import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from db_models import BenchmarkEntry
from models import MLScore

logger = logging.getLogger(__name__)


def save_benchmark_entry(db: Session, ml_score: MLScore) -> BenchmarkEntry:
    """
    Save or update a benchmark entry from an MLScore result.

    If URL already exists, updates the existing entry.
    Returns the created/updated BenchmarkEntry.
    """
    domain = BenchmarkEntry.extract_domain(ml_score.url)
    category = BenchmarkEntry.detect_category(ml_score.url, domain)

    # Serialize signal inventory to JSON
    signal_inventory_json = json.dumps([
        {
            "dimension_id": s.dimension_id,
            "score": s.score,
            "zone_contributions": [
                {"zone": z.zone, "score": z.score, "evidence": z.evidence}
                for z in s.zone_contributions
            ]
        }
        for s in ml_score.signal_inventory
    ])

    # Check if entry exists
    existing = db.query(BenchmarkEntry).filter(
        BenchmarkEntry.url == ml_score.url
    ).first()

    if existing:
        # Update existing entry
        existing.universal_score = ml_score.universal_score
        existing.extraction_quality = ml_score.extraction_quality
        existing.scored_at = ml_score.scored_at
        existing.signal_inventory_json = signal_inventory_json
        existing.updated_at = datetime.utcnow()
        logger.info(f"Updated benchmark entry for {ml_score.url}")
        return existing
    else:
        # Create new entry
        entry = BenchmarkEntry(
            id=ml_score.id,
            url=ml_score.url,
            domain=domain,
            category=category,
            universal_score=ml_score.universal_score,
            extraction_quality=ml_score.extraction_quality,
            scored_at=ml_score.scored_at,
            signal_inventory_json=signal_inventory_json,
        )
        db.add(entry)
        logger.info(f"Created benchmark entry for {ml_score.url}")
        return entry


def get_benchmark_stats(db: Session) -> Dict[str, Any]:
    """
    Get aggregated benchmark statistics.

    Returns:
        {
            "total_pages": int,
            "avg_score": float,
            "score_range": {"min": float, "max": float},
            "products_count": int,
            "services_count": int,
            "last_updated": str
        }
    """
    # Get aggregate stats
    result = db.query(
        func.count(BenchmarkEntry.id).label('total'),
        func.avg(BenchmarkEntry.universal_score).label('avg'),
        func.min(BenchmarkEntry.universal_score).label('min'),
        func.max(BenchmarkEntry.universal_score).label('max'),
        func.max(BenchmarkEntry.updated_at).label('last_updated'),
    ).first()

    if not result or result.total == 0:
        return {
            "total_pages": 0,
            "avg_score": 0.0,
            "score_range": {"min": 0.0, "max": 0.0},
            "products_count": 0,
            "services_count": 0,
            "last_updated": datetime.utcnow().isoformat() + "Z",
        }

    # Count product vs service categories
    product_categories = ['electronics', 'apparel', 'home_goods', 'personal_care',
                          'food_beverage', 'telecom', 'software', 'retail']
    service_categories = ['b2b_saas', 'b2b_enterprise_software', 'b2b_cloud_infrastructure',
                          'financial_services_consumer', 'healthcare_services',
                          'travel_hospitality', 'b2b_professional_services']

    products_count = db.query(func.count(BenchmarkEntry.id)).filter(
        BenchmarkEntry.category.in_(product_categories)
    ).scalar() or 0

    services_count = db.query(func.count(BenchmarkEntry.id)).filter(
        BenchmarkEntry.category.in_(service_categories)
    ).scalar() or 0

    return {
        "total_pages": result.total,
        "avg_score": round(result.avg, 2) if result.avg else 0.0,
        "score_range": {
            "min": round(result.min, 2) if result.min else 0.0,
            "max": round(result.max, 2) if result.max else 0.0,
        },
        "products_count": products_count,
        "services_count": services_count,
        "last_updated": result.last_updated.isoformat() + "Z" if result.last_updated else datetime.utcnow().isoformat() + "Z",
    }


def get_category_stats(db: Session) -> List[Dict[str, Any]]:
    """
    Get per-category breakdown of benchmark statistics.

    Returns list of:
        {
            "category": str,
            "count": int,
            "avg_score": float,
            "min_score": float,
            "max_score": float
        }
    """
    results = db.query(
        BenchmarkEntry.category,
        func.count(BenchmarkEntry.id).label('count'),
        func.avg(BenchmarkEntry.universal_score).label('avg'),
        func.min(BenchmarkEntry.universal_score).label('min'),
        func.max(BenchmarkEntry.universal_score).label('max'),
    ).group_by(BenchmarkEntry.category).order_by(desc('avg')).all()

    return [
        {
            "category": r.category or "other",
            "count": r.count,
            "avg_score": round(r.avg, 2) if r.avg else 0.0,
            "min_score": round(r.min, 2) if r.min else 0.0,
            "max_score": round(r.max, 2) if r.max else 0.0,
        }
        for r in results
    ]


def get_dimension_analysis(db: Session) -> List[Dict[str, Any]]:
    """
    Get dimension presence rates across all benchmark entries.

    Returns list of:
        {
            "dimension_id": str,
            "dimension_name": str,
            "avg_score": float,
            "presence_rate": float,
            "pages_at_target": int
        }
    """
    # Get all entries with their signal inventories
    entries = db.query(BenchmarkEntry.signal_inventory_json).all()

    if not entries:
        return []

    # Aggregate dimension stats
    dim_stats: Dict[str, Dict[str, Any]] = {}
    total_pages = len(entries)

    for entry in entries:
        signals = json.loads(entry.signal_inventory_json)
        for signal in signals:
            dim_id = signal["dimension_id"]
            score = signal["score"]

            if dim_id not in dim_stats:
                dim_stats[dim_id] = {
                    "scores": [],
                    "present_count": 0,
                    "at_target_count": 0,
                }

            dim_stats[dim_id]["scores"].append(score)
            if score >= 0.3:  # Threshold for "present"
                dim_stats[dim_id]["present_count"] += 1
            if score >= 0.5:  # Threshold for "at target"
                dim_stats[dim_id]["at_target_count"] += 1

    # Dimension name mapping
    dim_names = {
        "dim_01": "third_party_authority",
        "dim_02": "social_proof_sensitivity",
        "dim_03": "platform_endorsement",
        "dim_04": "scarcity_urgency",
        "dim_05": "anchoring_susceptibility",
        "dim_06": "brand_premium_acceptance",
        "dim_07": "free_trial_conversion",
        "dim_08": "bundle_preference",
        "dim_09": "sustainability_premium",
        "dim_10": "privacy_tradeoff",
        "dim_11": "local_preference",
        "dim_12": "novelty_seeking",
        "dim_13": "risk_aversion",
        "dim_14": "warranty_weight",
        "dim_15": "return_policy_sensitivity",
        "dim_16": "negative_review_weight",
        "dim_17": "recency_bias",
        "dim_18": "specificity_preference",
        "dim_19": "comparison_framing",
        "dim_20": "information_seeking_depth",
        "dim_21": "clarification_requests",
        "dim_22": "recommendation_revision",
        "dim_23": "confidence_calibration",
        "dim_24": "ethical_concern_weight",
        "dim_25": "default_option_bias",
        "dim_26": "loss_framing_sensitivity",
    }

    results = []
    for dim_id in sorted(dim_stats.keys()):
        stats = dim_stats[dim_id]
        scores = stats["scores"]
        avg_score = sum(scores) / len(scores) if scores else 0
        presence_rate = stats["present_count"] / total_pages if total_pages > 0 else 0

        results.append({
            "dimension_id": dim_id,
            "dimension_name": dim_names.get(dim_id, dim_id),
            "avg_score": round(avg_score, 3),
            "presence_rate": round(presence_rate, 2),
            "pages_at_target": stats["at_target_count"],
        })

    return results


def get_top_performers(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get top N pages by universal score.

    Returns list of:
        {
            "url": str,
            "domain": str,
            "category": str,
            "universal_score": float,
            "extraction_quality": str
        }
    """
    results = db.query(BenchmarkEntry).order_by(
        desc(BenchmarkEntry.universal_score)
    ).limit(limit).all()

    return [
        {
            "url": r.url,
            "domain": r.domain,
            "category": r.category,
            "universal_score": round(r.universal_score, 2),
            "extraction_quality": r.extraction_quality,
        }
        for r in results
    ]


def get_bottom_performers(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Get bottom N pages by universal score.
    """
    results = db.query(BenchmarkEntry).order_by(
        BenchmarkEntry.universal_score
    ).limit(limit).all()

    return [
        {
            "url": r.url,
            "domain": r.domain,
            "category": r.category,
            "universal_score": round(r.universal_score, 2),
            "extraction_quality": r.extraction_quality,
        }
        for r in results
    ]


def get_entry_by_url(db: Session, url: str) -> Optional[BenchmarkEntry]:
    """Get a benchmark entry by URL."""
    return db.query(BenchmarkEntry).filter(BenchmarkEntry.url == url).first()


def count_entries(db: Session) -> int:
    """Count total benchmark entries."""
    return db.query(func.count(BenchmarkEntry.id)).scalar() or 0
