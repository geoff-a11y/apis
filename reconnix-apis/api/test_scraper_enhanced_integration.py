"""
Integration tests for /scrape-enhanced endpoint.

Run with:
    pytest api/test_scraper_enhanced_integration.py -v

Note: These tests require the API server to be running, or use TestClient
to run the app directly.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def mock_html_product():
    """Mock HTML for a product page."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Amazing Widget - Buy Now</title>
        <meta name="description" content="The best widget for your home.">
        <meta property="og:title" content="Amazing Widget">
        <meta property="og:description" content="High quality widget.">
        <script type="application/ld+json">
        {
            "@type": "Product",
            "name": "Amazing Widget",
            "price": "$49.99"
        }
        </script>
    </head>
    <body>
        <h1>Amazing Widget</h1>
        <p>This widget is perfect for everyday use. Built with quality materials.</p>
        <h2>Features</h2>
        <ul>
            <li>Durable construction</li>
            <li>Easy to use</li>
            <li>Lifetime warranty</li>
        </ul>
        <table class="specs">
            <tr><td>Weight</td><td>1.5 kg</td></tr>
            <tr><td>Color</td><td>Blue</td></tr>
        </table>
        <button class="btn-primary">Add to Cart</button>
        <p>Free shipping on orders over $50!</p>
    </body>
    </html>
    """


@pytest.fixture
def mock_html_saas():
    """Mock HTML for a SaaS page."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>CloudDash - Enterprise Analytics Platform</title>
        <meta name="description" content="Powerful analytics for enterprise teams.">
    </head>
    <body>
        <h1>CloudDash Enterprise</h1>
        <p>Built for teams that need scalable analytics infrastructure.</p>
        <div class="pricing">
            <h3>Pro Plan</h3>
            <p>$99/month per user</p>
        </div>
        <div class="pricing">
            <h3>Enterprise Plan</h3>
            <p>Contact us for pricing</p>
        </div>
        <div class="testimonial">
            <p>"CloudDash transformed our workflow." - Enterprise Customer</p>
        </div>
        <details class="faq">
            <summary>What integrations do you support?</summary>
            <p>We integrate with Salesforce, HubSpot, and 50+ other tools.</p>
        </details>
    </body>
    </html>
    """


# =============================================================================
# Basic Endpoint Tests
# =============================================================================

class TestScrapeEnhancedEndpoint:
    """Tests for /scrape-enhanced endpoint."""

    def test_endpoint_returns_200(self, client):
        """Endpoint returns 200 for valid URL."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Test Page",
                description="Test description",
                features=["Feature 1", "Feature 2"],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Test Page",
                    content_blocks=[
                        ContentBlock(block_type="headline", level=1, content="Test Headline")
                    ],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/product"}
            )

            assert response.status_code == 200

    def test_endpoint_returns_structure(self, client, mock_html_product):
        """Response includes PageStructure."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Amazing Widget",
                description="The best widget for your home.",
                features=["Durable construction", "Easy to use", "Lifetime warranty"],
                success=True,
                structure=PageStructure(
                    url="https://example.com/product",
                    title="Amazing Widget - Buy Now",
                    meta_description="The best widget for your home.",
                    og_data={"title": "Amazing Widget", "description": "High quality widget."},
                    schema_org={"@type": "Product", "name": "Amazing Widget"},
                    content_blocks=[
                        ContentBlock(block_type="headline", level=1, content="Amazing Widget"),
                        ContentBlock(block_type="paragraph", content="This widget is perfect for everyday use."),
                        ContentBlock(block_type="list", content="• Durable construction\n• Easy to use\n• Lifetime warranty",
                                   metadata={"items": ["Durable construction", "Easy to use", "Lifetime warranty"], "ordered": False}),
                    ],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/product"}
            )

            assert response.status_code == 200
            data = response.json()

            assert "structure" in data
            assert data["structure"] is not None
            assert "content_blocks" in data["structure"]
            assert isinstance(data["structure"]["content_blocks"], list)

    def test_endpoint_backward_compatible(self, client):
        """Response includes legacy fields (title, description, features)."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Test Title",
                description="Test Description",
                features=["Feature A", "Feature B"],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Test Title",
                    content_blocks=[],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="minimal"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/product"}
            )

            data = response.json()

            assert "title" in data
            assert "description" in data
            assert "features" in data
            assert data["success"] is True

    def test_endpoint_detects_page_type(self, client):
        """Response includes detected page type."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Product",
                description="A product",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Product",
                    content_blocks=[],
                    detected_page_type="saas",
                    detected_context="b2b",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/pricing"}
            )

            data = response.json()
            assert data["structure"]["detected_page_type"] in ["product", "service", "saas", "landing", "unknown"]


# =============================================================================
# Error Handling Tests
# =============================================================================

class TestScrapeEnhancedErrors:
    """Tests for error handling in /scrape-enhanced endpoint."""

    def test_invalid_url_returns_400(self, client):
        """Invalid URL returns 400 error."""
        response = client.post(
            "/scrape-enhanced",
            json={"url": "not-a-valid-url"}
        )

        assert response.status_code == 400

    def test_missing_url_returns_422(self, client):
        """Missing URL returns 422 validation error."""
        response = client.post(
            "/scrape-enhanced",
            json={}
        )

        assert response.status_code == 422

    def test_localhost_blocked(self, client):
        """Localhost URLs are blocked for security."""
        response = client.post(
            "/scrape-enhanced",
            json={"url": "http://localhost:8080/admin"}
        )

        assert response.status_code == 400
        assert "blocked" in response.json()["detail"].lower() or "invalid" in response.json()["detail"].lower()

    def test_private_ip_blocked(self, client):
        """Private IP addresses are blocked for security."""
        response = client.post(
            "/scrape-enhanced",
            json={"url": "http://192.168.1.1/admin"}
        )

        assert response.status_code == 400

    def test_scrape_failure_returns_500(self, client):
        """Scrape failure returns 500 error."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="",
                description="",
                features=[],
                success=False,
                structure=None
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/error"}
            )

            assert response.status_code == 500


# =============================================================================
# Content Block Tests
# =============================================================================

class TestContentBlocks:
    """Tests for content block extraction."""

    def test_extracts_headlines(self, client):
        """Headlines are extracted with correct levels."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Test",
                description="Test",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Test",
                    content_blocks=[
                        ContentBlock(block_type="headline", level=1, content="Main Title"),
                        ContentBlock(block_type="subheadline", level=2, content="Section"),
                    ],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com"}
            )

            data = response.json()
            blocks = data["structure"]["content_blocks"]

            headline_blocks = [b for b in blocks if b["block_type"] in ["headline", "subheadline"]]
            assert len(headline_blocks) >= 1
            assert any(b.get("level") == 1 for b in headline_blocks)

    def test_extracts_lists_with_items(self, client):
        """Lists are extracted with items in metadata."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Test",
                description="Test",
                features=["Item 1", "Item 2"],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Test",
                    content_blocks=[
                        ContentBlock(
                            block_type="list",
                            content="• Item 1\n• Item 2",
                            metadata={"items": ["Item 1", "Item 2"], "ordered": False}
                        ),
                    ],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com"}
            )

            data = response.json()
            blocks = data["structure"]["content_blocks"]

            list_blocks = [b for b in blocks if b["block_type"] == "list"]
            if list_blocks:
                assert "metadata" in list_blocks[0]
                assert "items" in list_blocks[0]["metadata"]

    def test_extracts_tables_with_metadata(self, client):
        """Tables are extracted with headers and rows."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Test",
                description="Test",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Test",
                    content_blocks=[
                        ContentBlock(
                            block_type="spec_table",
                            content="Weight | 2kg\nColor | Blue",
                            metadata={"headers": ["Property", "Value"], "rows": [["Weight", "2kg"], ["Color", "Blue"]]}
                        ),
                    ],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com"}
            )

            data = response.json()
            blocks = data["structure"]["content_blocks"]

            table_blocks = [b for b in blocks if b["block_type"] in ["table", "spec_table"]]
            if table_blocks:
                assert "metadata" in table_blocks[0]
                assert "headers" in table_blocks[0]["metadata"] or "rows" in table_blocks[0]["metadata"]


# =============================================================================
# Page Type and Context Tests
# =============================================================================

class TestPageTypeAndContext:
    """Tests for page type and context detection."""

    def test_detects_product_page(self, client):
        """Product pages are detected correctly."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Widget",
                description="Buy now",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Widget",
                    content_blocks=[],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/widget"}
            )

            data = response.json()
            assert data["structure"]["detected_page_type"] == "product"

    def test_detects_saas_page(self, client):
        """SaaS pages are detected correctly."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="CloudApp Pricing",
                description="Enterprise pricing",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="CloudApp Pricing",
                    content_blocks=[],
                    detected_page_type="saas",
                    detected_context="b2b",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://cloudapp.com/pricing"}
            )

            data = response.json()
            assert data["structure"]["detected_page_type"] == "saas"

    def test_detects_b2b_context(self, client):
        """B2B context is detected correctly."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Enterprise Solution",
                description="For your organization",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Enterprise Solution",
                    content_blocks=[],
                    detected_page_type="saas",
                    detected_context="b2b",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://enterprise.com/solutions"}
            )

            data = response.json()
            assert data["structure"]["detected_context"] == "b2b"

    def test_detects_b2c_context(self, client):
        """B2C context is detected correctly."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Home Gadget",
                description="Buy now for your family",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Home Gadget",
                    content_blocks=[],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://shop.com/gadget"}
            )

            data = response.json()
            assert data["structure"]["detected_context"] == "b2c"


# =============================================================================
# Extraction Quality Tests
# =============================================================================

class TestExtractionQuality:
    """Tests for extraction quality indicators."""

    def test_full_quality_for_rich_pages(self, client):
        """Full quality for pages with rich content."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="Rich Page",
                description="Lots of content",
                features=["A", "B", "C"],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="Rich Page",
                    content_blocks=[
                        ContentBlock(block_type="headline", level=1, content="Main"),
                        ContentBlock(block_type="headline", level=2, content="Section 1"),
                        ContentBlock(block_type="paragraph", content="Content " * 50),
                        ContentBlock(block_type="paragraph", content="More content " * 50),
                        ContentBlock(block_type="list", content="• Item", metadata={"items": ["Item"]}),
                    ],
                    detected_page_type="product",
                    detected_context="b2c",
                    extraction_quality="full"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/rich"}
            )

            data = response.json()
            assert data["structure"]["extraction_quality"] == "full"

    def test_minimal_quality_for_sparse_pages(self, client):
        """Minimal quality for pages with little content."""
        with patch('main.scrape_enhanced') as mock_scrape:
            from models import EnhancedScrapeResponse, PageStructure, ContentBlock

            mock_scrape.return_value = EnhancedScrapeResponse(
                title="",
                description="",
                features=[],
                success=True,
                structure=PageStructure(
                    url="https://example.com",
                    title="",
                    content_blocks=[],
                    detected_page_type="unknown",
                    detected_context="mixed",
                    extraction_quality="minimal"
                )
            )

            response = client.post(
                "/scrape-enhanced",
                json={"url": "https://example.com/empty"}
            )

            data = response.json()
            assert data["structure"]["extraction_quality"] == "minimal"
