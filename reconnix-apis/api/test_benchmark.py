"""
Unit tests for benchmark service.

Run with:
    pytest api/test_benchmark.py -v
"""

import json
import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .database import Base
from .db_models import BenchmarkEntry
from .models import MLScore, SignalPresence, ZoneContribution
from . import benchmark_service


@pytest.fixture
def test_db():
    """Create a test database in memory."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()


@pytest.fixture
def sample_ml_score():
    """Create a sample MLScore for testing."""
    return MLScore(
        id="test-123",
        url="https://example.com/product",
        scored_at=datetime.utcnow().isoformat() + "Z",
        universal_score=65.5,
        signal_inventory=[
            SignalPresence(
                dimension_id="dim_01",
                score=0.8,
                zone_contributions=[
                    ZoneContribution(zone="title", score=0.5, evidence="trusted by experts")
                ]
            ),
            SignalPresence(
                dimension_id="dim_02",
                score=0.3,
                zone_contributions=[
                    ZoneContribution(zone="body", score=0.3, evidence="1000+ reviews")
                ]
            ),
        ],
        signal_interactions=[],
        interaction_adjustment=0.0,
        readability_score=75.0,
        readability_flags=[],
        recommendations=[],
        extraction_quality="full",
    )


class TestBenchmarkEntry:
    """Tests for BenchmarkEntry model."""

    def test_extract_domain(self):
        """Test domain extraction from URL."""
        assert BenchmarkEntry.extract_domain("https://example.com/path") == "example.com"
        assert BenchmarkEntry.extract_domain("https://www.example.com/path") == "example.com"
        assert BenchmarkEntry.extract_domain("http://subdomain.example.com") == "subdomain.example.com"

    def test_detect_category_b2b_saas(self):
        """Test category detection for B2B SaaS."""
        assert BenchmarkEntry.detect_category(
            "https://www.salesforce.com/products/", "salesforce.com"
        ) == "b2b_saas"
        assert BenchmarkEntry.detect_category(
            "https://www.hubspot.com/pricing", "hubspot.com"
        ) == "b2b_saas"

    def test_detect_category_electronics(self):
        """Test category detection for electronics."""
        assert BenchmarkEntry.detect_category(
            "https://www.apple.com/iphone", "apple.com"
        ) == "electronics"
        assert BenchmarkEntry.detect_category(
            "https://www.samsung.com/phone", "samsung.com"
        ) == "electronics"

    def test_detect_category_telecom(self):
        """Test category detection for telecom."""
        assert BenchmarkEntry.detect_category(
            "https://www.verizon.com/plans", "verizon.com"
        ) == "telecom"

    def test_detect_category_other(self):
        """Test category detection for unknown domain."""
        assert BenchmarkEntry.detect_category(
            "https://www.unknownsite.com/", "unknownsite.com"
        ) == "other"


class TestSaveBenchmarkEntry:
    """Tests for save_benchmark_entry function."""

    def test_save_new_entry(self, test_db, sample_ml_score):
        """Test saving a new benchmark entry."""
        entry = benchmark_service.save_benchmark_entry(test_db, sample_ml_score)
        test_db.commit()

        assert entry.id == "test-123"
        assert entry.url == "https://example.com/product"
        assert entry.universal_score == 65.5
        assert entry.extraction_quality == "full"
        assert entry.domain == "example.com"

        # Verify signal inventory is stored as JSON
        signals = json.loads(entry.signal_inventory_json)
        assert len(signals) == 2
        assert signals[0]["dimension_id"] == "dim_01"
        assert signals[0]["score"] == 0.8

    def test_update_existing_entry(self, test_db, sample_ml_score):
        """Test that re-scoring same URL updates existing entry."""
        # First save
        benchmark_service.save_benchmark_entry(test_db, sample_ml_score)
        test_db.commit()

        # Modify and save again
        sample_ml_score.universal_score = 75.0
        entry = benchmark_service.save_benchmark_entry(test_db, sample_ml_score)
        test_db.commit()

        # Should update, not create duplicate
        count = test_db.query(BenchmarkEntry).filter(
            BenchmarkEntry.url == "https://example.com/product"
        ).count()
        assert count == 1
        assert entry.universal_score == 75.0


class TestGetBenchmarkStats:
    """Tests for get_benchmark_stats function."""

    def test_stats_empty_db(self, test_db):
        """Test stats with no entries."""
        stats = benchmark_service.get_benchmark_stats(test_db)

        assert stats["total_pages"] == 0
        assert stats["avg_score"] == 0.0
        assert stats["products_count"] == 0
        assert stats["services_count"] == 0

    def test_stats_with_entries(self, test_db):
        """Test stats calculation with entries."""
        # Add test entries
        entries = [
            BenchmarkEntry(
                id="1", url="https://electronics.com/1", domain="electronics.com",
                category="electronics", universal_score=50.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            ),
            BenchmarkEntry(
                id="2", url="https://electronics.com/2", domain="electronics.com",
                category="electronics", universal_score=70.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            ),
            BenchmarkEntry(
                id="3", url="https://saas.com/1", domain="saas.com",
                category="b2b_saas", universal_score=40.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            ),
        ]
        for entry in entries:
            test_db.add(entry)
        test_db.commit()

        stats = benchmark_service.get_benchmark_stats(test_db)

        assert stats["total_pages"] == 3
        assert stats["avg_score"] == pytest.approx(53.33, rel=0.1)
        assert stats["score_range"]["min"] == 40.0
        assert stats["score_range"]["max"] == 70.0
        assert stats["products_count"] == 2  # electronics = products
        assert stats["services_count"] == 1  # b2b_saas = services


class TestGetCategoryStats:
    """Tests for get_category_stats function."""

    def test_category_stats(self, test_db):
        """Test per-category breakdown."""
        entries = [
            BenchmarkEntry(
                id="1", url="https://a.com/1", domain="a.com",
                category="electronics", universal_score=50.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            ),
            BenchmarkEntry(
                id="2", url="https://b.com/1", domain="b.com",
                category="electronics", universal_score=60.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            ),
            BenchmarkEntry(
                id="3", url="https://c.com/1", domain="c.com",
                category="software", universal_score=45.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            ),
        ]
        for entry in entries:
            test_db.add(entry)
        test_db.commit()

        stats = benchmark_service.get_category_stats(test_db)

        assert len(stats) == 2
        # Electronics should be first (higher avg)
        electronics = next(s for s in stats if s["category"] == "electronics")
        assert electronics["count"] == 2
        assert electronics["avg_score"] == 55.0


class TestGetDimensionAnalysis:
    """Tests for get_dimension_analysis function."""

    def test_dimension_analysis(self, test_db):
        """Test dimension presence rate calculation."""
        signal_inventory = json.dumps([
            {"dimension_id": "dim_01", "score": 0.6, "zone_contributions": []},
            {"dimension_id": "dim_02", "score": 0.2, "zone_contributions": []},
        ])

        entries = [
            BenchmarkEntry(
                id="1", url="https://a.com/1", domain="a.com",
                category="other", universal_score=50.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json=signal_inventory
            ),
            BenchmarkEntry(
                id="2", url="https://b.com/1", domain="b.com",
                category="other", universal_score=50.0, extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json=signal_inventory
            ),
        ]
        for entry in entries:
            test_db.add(entry)
        test_db.commit()

        analysis = benchmark_service.get_dimension_analysis(test_db)

        dim_01 = next(d for d in analysis if d["dimension_id"] == "dim_01")
        assert dim_01["avg_score"] == 0.6
        assert dim_01["presence_rate"] == 1.0  # Both pages have score >= 0.3
        assert dim_01["pages_at_target"] == 2  # Both have score >= 0.5


class TestGetTopPerformers:
    """Tests for get_top_performers function."""

    def test_top_performers(self, test_db):
        """Test getting top N pages by score."""
        entries = [
            BenchmarkEntry(
                id=str(i), url=f"https://example{i}.com", domain=f"example{i}.com",
                category="other", universal_score=float(i * 10), extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            )
            for i in range(1, 6)
        ]
        for entry in entries:
            test_db.add(entry)
        test_db.commit()

        top = benchmark_service.get_top_performers(test_db, limit=3)

        assert len(top) == 3
        assert top[0]["universal_score"] == 50.0
        assert top[1]["universal_score"] == 40.0
        assert top[2]["universal_score"] == 30.0


class TestGetBottomPerformers:
    """Tests for get_bottom_performers function."""

    def test_bottom_performers(self, test_db):
        """Test getting bottom N pages by score."""
        entries = [
            BenchmarkEntry(
                id=str(i), url=f"https://example{i}.com", domain=f"example{i}.com",
                category="other", universal_score=float(i * 10), extraction_quality="full",
                scored_at="2024-01-01T00:00:00Z", signal_inventory_json="[]"
            )
            for i in range(1, 6)
        ]
        for entry in entries:
            test_db.add(entry)
        test_db.commit()

        bottom = benchmark_service.get_bottom_performers(test_db, limit=3)

        assert len(bottom) == 3
        assert bottom[0]["universal_score"] == 10.0
        assert bottom[1]["universal_score"] == 20.0
        assert bottom[2]["universal_score"] == 30.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
