"""
Integration tests for benchmark API endpoints.

These tests use FastAPI's TestClient against the real application
with the seeded benchmark database (530 entries).

Run with:
    pytest api/test_benchmark_integration.py -v

Note: The unit tests (test_benchmark.py) use an in-memory test database.
These integration tests verify the full API works with real data.
"""

import pytest
from fastapi.testclient import TestClient

from .main import app


@pytest.fixture(scope="module")
def client():
    """Create test client for the real app."""
    return TestClient(app)


class TestBenchmarkStatsEndpoint:
    """Tests for GET /benchmark/stats endpoint."""

    def test_benchmark_stats_success(self, client):
        """Test successful stats retrieval."""
        response = client.get("/benchmark/stats")

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "total_pages" in data
        assert "avg_score" in data
        assert "score_range" in data
        assert "products_count" in data
        assert "services_count" in data
        assert "last_updated" in data

        # Check reasonable values (seeded database has ~530 entries)
        assert data["total_pages"] >= 100
        assert 0 <= data["avg_score"] <= 100
        assert data["score_range"]["min"] >= 0
        assert data["score_range"]["max"] <= 100


class TestBenchmarkCategoriesEndpoint:
    """Tests for GET /benchmark/categories endpoint."""

    def test_categories_success(self, client):
        """Test successful category stats retrieval."""
        response = client.get("/benchmark/categories")

        assert response.status_code == 200
        data = response.json()

        assert "categories" in data
        # Should have multiple categories
        assert len(data["categories"]) >= 5

        # Each category should have expected structure
        for cat in data["categories"]:
            assert "category" in cat
            assert "count" in cat
            assert "avg_score" in cat
            assert "min_score" in cat
            assert "max_score" in cat


class TestBenchmarkDimensionsEndpoint:
    """Tests for GET /benchmark/dimensions endpoint."""

    def test_dimensions_success(self, client):
        """Test successful dimension stats retrieval."""
        response = client.get("/benchmark/dimensions")

        assert response.status_code == 200
        data = response.json()

        assert "dimensions" in data
        # Should have 26 dimensions
        assert len(data["dimensions"]) >= 20

        # Each dimension should have expected structure
        for dim in data["dimensions"]:
            assert "dimension_id" in dim
            assert "dimension_name" in dim
            assert "avg_score" in dim
            assert "presence_rate" in dim
            assert "pages_at_target" in dim


class TestBenchmarkTopPerformersEndpoint:
    """Tests for GET /benchmark/top-performers endpoint."""

    def test_top_performers_default(self, client):
        """Test top performers with default limit."""
        response = client.get("/benchmark/top-performers")

        assert response.status_code == 200
        data = response.json()

        assert "pages" in data
        assert len(data["pages"]) == 10  # Default limit

        # Should be sorted by score descending
        scores = [p["universal_score"] for p in data["pages"]]
        assert scores == sorted(scores, reverse=True)

    def test_top_performers_with_limit(self, client):
        """Test top performers with custom limit."""
        response = client.get("/benchmark/top-performers?limit=5")

        assert response.status_code == 200
        data = response.json()

        assert len(data["pages"]) == 5

    def test_top_performers_invalid_limit(self, client):
        """Test top performers with invalid limit."""
        response = client.get("/benchmark/top-performers?limit=0")
        assert response.status_code == 422

        response = client.get("/benchmark/top-performers?limit=101")
        assert response.status_code == 422


class TestBenchmarkBottomPerformersEndpoint:
    """Tests for GET /benchmark/bottom-performers endpoint."""

    def test_bottom_performers(self, client):
        """Test bottom performers retrieval."""
        response = client.get("/benchmark/bottom-performers?limit=5")

        assert response.status_code == 200
        data = response.json()

        assert len(data["pages"]) == 5

        # Should be sorted by score ascending
        scores = [p["universal_score"] for p in data["pages"]]
        assert scores == sorted(scores)


class TestRootEndpoint:
    """Tests for GET / endpoint."""

    def test_root_includes_benchmark_endpoints(self, client):
        """Test that root endpoint lists benchmark endpoints."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()

        assert "endpoints" in data
        assert "benchmark_stats" in data["endpoints"]
        assert "benchmark_categories" in data["endpoints"]
        assert "benchmark_dimensions" in data["endpoints"]
        assert "benchmark_top" in data["endpoints"]
        assert "benchmark_bottom" in data["endpoints"]


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_check(self, client):
        """Test health endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()

        assert data["status"] in ["healthy", "degraded"]
        assert "timestamp" in data
        assert "version" in data


class TestAPIDocumentation:
    """Tests for API documentation endpoints."""

    def test_openapi_schema(self, client):
        """Test OpenAPI schema is available."""
        response = client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()

        assert "paths" in data
        assert "/benchmark/stats" in data["paths"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
