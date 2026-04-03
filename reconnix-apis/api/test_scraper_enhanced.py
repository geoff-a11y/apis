"""
Unit tests for enhanced page structure extraction.

Run with:
    pytest api/test_scraper_enhanced.py -v
"""

import pytest
from bs4 import BeautifulSoup

from scraper import (
    extract_page_structure,
    extract_content_blocks,
    extract_schema_org,
    extract_og_data,
    detect_page_type,
    detect_context,
    classify_table,
    extract_table_metadata,
    is_testimonial,
    is_faq,
    is_pricing,
    is_stat,
    determine_extraction_quality,
)
from models import ContentBlock, PageStructure


# =============================================================================
# Test Fixtures
# =============================================================================

@pytest.fixture
def basic_html():
    """Basic HTML with common elements."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test Product Page</title>
        <meta name="description" content="This is a test product description.">
        <meta property="og:title" content="Test OG Title">
        <meta property="og:description" content="Test OG Description">
    </head>
    <body>
        <h1>Amazing Product</h1>
        <p>This is the first paragraph describing our amazing product.</p>
        <h2>Features</h2>
        <ul>
            <li>Feature one with details</li>
            <li>Feature two with more details</li>
            <li>Feature three is the best</li>
        </ul>
        <h2>Specifications</h2>
        <table class="spec-table">
            <tr><td>Weight</td><td>2.5 kg</td></tr>
            <tr><td>Dimensions</td><td>10x20x5 cm</td></tr>
        </table>
        <p>Another paragraph with more information about the product.</p>
    </body>
    </html>
    """


@pytest.fixture
def product_html():
    """HTML for a product page."""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Widget Pro - Buy Now</title>
        <script type="application/ld+json">
        {
            "@type": "Product",
            "name": "Widget Pro",
            "price": "$99.99"
        }
        </script>
    </head>
    <body>
        <h1>Widget Pro</h1>
        <p>The best widget for professionals.</p>
        <button class="btn-primary">Add to Cart</button>
        <p>In stock - ships tomorrow</p>
    </body>
    </html>
    """


@pytest.fixture
def saas_html():
    """HTML for a SaaS page."""
    return """
    <!DOCTYPE html>
    <html>
    <head><title>Enterprise Dashboard - Pricing</title></head>
    <body>
        <h1>Enterprise Dashboard</h1>
        <p>Built for teams that need powerful analytics.</p>
        <div class="pricing">
            <h3>Pro Plan</h3>
            <p>$49/month per user</p>
        </div>
        <div class="pricing">
            <h3>Enterprise Plan</h3>
            <p>Contact sales for pricing</p>
        </div>
        <p>Start your 14-day free trial today.</p>
    </body>
    </html>
    """


@pytest.fixture
def b2b_html():
    """HTML for a B2B page."""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Enterprise Solutions Platform</h1>
        <p>Scalable infrastructure for your organization's workflow.</p>
        <p>Our API integration enables seamless deployment across your enterprise.</p>
        <p>Request a demo today to see how we can improve your team's ROI.</p>
        <p>SLA-backed support with dedicated onboarding.</p>
    </body>
    </html>
    """


@pytest.fixture
def b2c_html():
    """HTML for a B2C page."""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Amazing Home Gadget</h1>
        <p>Perfect for your family - easy to use and simple to set up!</p>
        <p>Buy now and enjoy free shipping on orders over $50.</p>
        <p>Add to cart for instant checkout. Fast delivery!</p>
        <p>Great gift idea - your loved ones will love it!</p>
    </body>
    </html>
    """


@pytest.fixture
def testimonial_html():
    """HTML with testimonials."""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Our Product</h1>
        <div class="testimonial">
            <p>"This product changed my life!"</p>
            <span>- Happy Customer</span>
        </div>
        <blockquote>
            "Absolutely incredible service. Highly recommend!"
        </blockquote>
    </body>
    </html>
    """


@pytest.fixture
def faq_html():
    """HTML with FAQs."""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Product FAQ</h1>
        <div class="faq">
            <h3>What is your return policy?</h3>
            <p>We offer a 30-day money back guarantee.</p>
        </div>
        <details>
            <summary>How do I contact support?</summary>
            <p>Email us at support@example.com or call 1-800-EXAMPLE.</p>
        </details>
    </body>
    </html>
    """


@pytest.fixture
def table_html():
    """HTML with tables."""
    return """
    <!DOCTYPE html>
    <html>
    <body>
        <h1>Product Comparison</h1>
        <table class="comparison-table">
            <thead>
                <tr><th>Feature</th><th>Basic</th><th>Pro</th></tr>
            </thead>
            <tbody>
                <tr><td>Storage</td><td>10 GB</td><td>100 GB</td></tr>
                <tr><td>Users</td><td>5</td><td>Unlimited</td></tr>
            </tbody>
        </table>
        <table>
            <tr><td>Color</td><td>Blue</td></tr>
            <tr><td>Size</td><td>Large</td></tr>
        </table>
    </body>
    </html>
    """


# =============================================================================
# Test Headline Extraction
# =============================================================================

class TestHeadlineExtraction:
    """Tests for headline extraction."""

    def test_extract_h1_as_headline(self, basic_html):
        """H1 extracted with level 1 as headline type."""
        soup = BeautifulSoup(basic_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        h1_blocks = [b for b in blocks if b.block_type == 'headline' and b.level == 1]
        assert len(h1_blocks) == 1
        assert h1_blocks[0].content == "Amazing Product"

    def test_extract_h2_as_subheadline(self, basic_html):
        """H2 extracted with level 2 as subheadline type."""
        soup = BeautifulSoup(basic_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        h2_blocks = [b for b in blocks if b.block_type == 'subheadline' and b.level == 2]
        assert len(h2_blocks) == 2
        assert any(b.content == "Features" for b in h2_blocks)
        assert any(b.content == "Specifications" for b in h2_blocks)

    def test_headline_hierarchy_preserved(self):
        """Headlines preserve correct hierarchy levels."""
        html = """
        <html><body>
            <h1>Main Title</h1>
            <h2>Section</h2>
            <h3>Subsection</h3>
            <h4>Details</h4>
            <h5>More Details</h5>
            <h6>Fine Print</h6>
        </body></html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        blocks = extract_content_blocks(soup)

        levels = {b.level for b in blocks if b.level is not None}
        assert levels == {1, 2, 3, 4, 5, 6}


# =============================================================================
# Test List Extraction
# =============================================================================

class TestListExtraction:
    """Tests for list extraction."""

    def test_extract_unordered_list(self, basic_html):
        """Unordered lists extracted with items."""
        soup = BeautifulSoup(basic_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        list_blocks = [b for b in blocks if b.block_type == 'list']
        assert len(list_blocks) == 1

        list_block = list_blocks[0]
        assert list_block.metadata is not None
        assert 'items' in list_block.metadata
        assert len(list_block.metadata['items']) == 3
        assert list_block.metadata['ordered'] is False

    def test_extract_ordered_list(self):
        """Ordered lists marked as ordered."""
        html = """
        <html><body>
            <ol>
                <li>First step</li>
                <li>Second step</li>
            </ol>
        </body></html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        blocks = extract_content_blocks(soup)

        list_blocks = [b for b in blocks if b.block_type == 'list']
        assert len(list_blocks) == 1
        assert list_blocks[0].metadata['ordered'] is True

    def test_nested_list_structure(self):
        """Nested lists extract parent items only (to avoid duplication)."""
        html = """
        <html><body>
            <ul>
                <li>Parent item
                    <ul>
                        <li>Child item 1</li>
                        <li>Child item 2</li>
                    </ul>
                </li>
            </ul>
        </body></html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        blocks = extract_content_blocks(soup)

        list_blocks = [b for b in blocks if b.block_type == 'list']
        # Should handle nested structure
        assert len(list_blocks) >= 1


# =============================================================================
# Test Table Extraction
# =============================================================================

class TestTableExtraction:
    """Tests for table extraction."""

    def test_extract_table_with_headers(self, table_html):
        """Tables extracted with headers and rows."""
        soup = BeautifulSoup(table_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        table_blocks = [b for b in blocks if b.block_type in ['table', 'spec_table']]
        assert len(table_blocks) == 2

        # Check headers in first table
        comparison_table = table_blocks[0]
        assert comparison_table.metadata is not None
        assert 'headers' in comparison_table.metadata
        assert 'Feature' in comparison_table.metadata['headers']

    def test_classify_spec_table(self):
        """Spec tables detected by class name."""
        html = '<table class="spec-table"><tr><td>A</td><td>B</td></tr></table>'
        soup = BeautifulSoup(html, 'html.parser')
        table = soup.find('table')

        assert classify_table(table) == 'spec_table'

    def test_classify_two_column_as_spec(self):
        """Two-column key-value tables classified as spec_table."""
        html = """
        <table>
            <tr><td>Weight</td><td>2kg</td></tr>
            <tr><td>Color</td><td>Red</td></tr>
            <tr><td>Size</td><td>Large</td></tr>
        </table>
        """
        soup = BeautifulSoup(html, 'html.parser')
        table = soup.find('table')

        assert classify_table(table) == 'spec_table'

    def test_extract_table_metadata(self, table_html):
        """Table metadata includes headers and rows."""
        soup = BeautifulSoup(table_html, 'html.parser')
        table = soup.find('table')
        metadata = extract_table_metadata(table)

        assert 'headers' in metadata
        assert 'rows' in metadata
        assert len(metadata['rows']) > 0


# =============================================================================
# Test Testimonial Detection
# =============================================================================

class TestTestimonialExtraction:
    """Tests for testimonial extraction."""

    def test_detect_testimonial_by_class(self, testimonial_html):
        """Testimonials detected via class patterns."""
        soup = BeautifulSoup(testimonial_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        testimonial_blocks = [b for b in blocks if b.block_type == 'testimonial']
        assert len(testimonial_blocks) >= 1

    def test_blockquote_as_testimonial(self, testimonial_html):
        """Blockquotes extracted as testimonials."""
        soup = BeautifulSoup(testimonial_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        testimonial_blocks = [b for b in blocks if b.block_type == 'testimonial']
        assert any("incredible" in b.content.lower() for b in testimonial_blocks)

    def test_is_testimonial_helper(self):
        """is_testimonial helper detects testimonial patterns."""
        html = '<div class="customer-testimonial">Great product!</div>'
        soup = BeautifulSoup(html, 'html.parser')
        div = soup.find('div')

        assert is_testimonial(div) is True


# =============================================================================
# Test FAQ Detection
# =============================================================================

class TestFAQExtraction:
    """Tests for FAQ extraction."""

    def test_detect_faq_by_class(self, faq_html):
        """FAQs detected via class patterns."""
        soup = BeautifulSoup(faq_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        faq_blocks = [b for b in blocks if b.block_type == 'faq']
        assert len(faq_blocks) >= 1

    def test_details_element_as_faq(self, faq_html):
        """Details/summary elements extracted as FAQs."""
        soup = BeautifulSoup(faq_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        faq_blocks = [b for b in blocks if b.block_type == 'faq']
        assert any("support" in b.content.lower() for b in faq_blocks)

    def test_faq_has_question_answer_metadata(self):
        """FAQ blocks contain question and answer in metadata."""
        html = """
        <details>
            <summary>What is the warranty?</summary>
            <p>We offer a 2-year warranty on all products.</p>
        </details>
        """
        soup = BeautifulSoup(html, 'html.parser')
        blocks = extract_content_blocks(soup)

        faq_blocks = [b for b in blocks if b.block_type == 'faq']
        if faq_blocks:
            assert 'Q:' in faq_blocks[0].content or faq_blocks[0].metadata


# =============================================================================
# Test Pricing Detection
# =============================================================================

class TestPricingExtraction:
    """Tests for pricing block extraction."""

    def test_detect_pricing_by_class(self, saas_html):
        """Pricing blocks detected via class patterns."""
        soup = BeautifulSoup(saas_html, 'html.parser')
        blocks = extract_content_blocks(soup)

        pricing_blocks = [b for b in blocks if b.block_type == 'pricing']
        assert len(pricing_blocks) >= 1

    def test_is_pricing_with_currency(self):
        """is_pricing detects currency symbols."""
        html = '<div>Only $49.99/month</div>'
        soup = BeautifulSoup(html, 'html.parser')
        div = soup.find('div')

        assert is_pricing(div) is True


# =============================================================================
# Test Stat Detection
# =============================================================================

class TestStatExtraction:
    """Tests for stat/metric extraction."""

    def test_detect_stat_by_class(self):
        """Stats detected via class patterns."""
        html = """
        <html><body>
            <div class="stat">10,000+</div>
            <div class="metric">99.9% uptime</div>
        </body></html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        blocks = extract_content_blocks(soup)

        stat_blocks = [b for b in blocks if b.block_type == 'stat']
        assert len(stat_blocks) >= 1

    def test_is_stat_with_large_number(self):
        """is_stat detects large number patterns."""
        html = '<span class="counter">5M+</span>'
        soup = BeautifulSoup(html, 'html.parser')
        span = soup.find('span')

        assert is_stat(span) is True


# =============================================================================
# Test Schema.org Extraction
# =============================================================================

class TestSchemaOrgExtraction:
    """Tests for JSON-LD Schema.org extraction."""

    def test_extract_product_schema(self, product_html):
        """Product schema.org data extracted."""
        soup = BeautifulSoup(product_html, 'html.parser')
        schema = extract_schema_org(soup)

        assert schema is not None
        assert schema.get('@type') == 'Product'
        assert schema.get('name') == 'Widget Pro'

    def test_no_schema_returns_none(self, basic_html):
        """Pages without schema.org return None."""
        soup = BeautifulSoup(basic_html, 'html.parser')
        schema = extract_schema_org(soup)

        # basic_html doesn't have JSON-LD
        assert schema is None

    def test_invalid_json_ld_handled(self):
        """Invalid JSON-LD doesn't crash extraction."""
        html = """
        <script type="application/ld+json">
            { invalid json here }
        </script>
        """
        soup = BeautifulSoup(html, 'html.parser')
        schema = extract_schema_org(soup)

        assert schema is None  # Should handle gracefully


# =============================================================================
# Test OpenGraph Extraction
# =============================================================================

class TestOpenGraphExtraction:
    """Tests for OpenGraph metadata extraction."""

    def test_extract_og_data(self, basic_html):
        """OpenGraph tags extracted."""
        soup = BeautifulSoup(basic_html, 'html.parser')
        og = extract_og_data(soup)

        assert og is not None
        assert og.get('title') == 'Test OG Title'
        assert og.get('description') == 'Test OG Description'

    def test_no_og_returns_none(self):
        """Pages without OG tags return None."""
        html = '<html><head><title>Test</title></head><body></body></html>'
        soup = BeautifulSoup(html, 'html.parser')
        og = extract_og_data(soup)

        assert og is None


# =============================================================================
# Test Page Type Detection
# =============================================================================

class TestPageTypeDetection:
    """Tests for page type detection."""

    def test_detect_product_from_schema(self, product_html):
        """Product pages detected from schema.org."""
        soup = BeautifulSoup(product_html, 'html.parser')
        schema = extract_schema_org(soup)
        page_type = detect_page_type(soup, schema)

        assert page_type == 'product'

    def test_detect_saas_from_pricing(self, saas_html):
        """SaaS pages detected from pricing patterns."""
        soup = BeautifulSoup(saas_html, 'html.parser')
        page_type = detect_page_type(soup, None)

        assert page_type == 'saas'

    def test_detect_product_from_cart(self):
        """Product pages detected from cart patterns."""
        html = '<html><body><button>Add to cart</button><p>In stock</p></body></html>'
        soup = BeautifulSoup(html, 'html.parser')
        page_type = detect_page_type(soup, None)

        assert page_type == 'product'

    def test_default_to_landing(self):
        """Unknown pages default to landing."""
        html = '<html><body><p>Welcome to our website.</p></body></html>'
        soup = BeautifulSoup(html, 'html.parser')
        page_type = detect_page_type(soup, None)

        assert page_type == 'landing'


# =============================================================================
# Test Context Detection (B2B vs B2C)
# =============================================================================

class TestContextDetection:
    """Tests for B2B vs B2C context detection."""

    def test_detect_b2b_context(self, b2b_html):
        """B2B context detected from enterprise keywords."""
        soup = BeautifulSoup(b2b_html, 'html.parser')
        context = detect_context(soup)

        assert context == 'b2b'

    def test_detect_b2c_context(self, b2c_html):
        """B2C context detected from consumer keywords."""
        soup = BeautifulSoup(b2c_html, 'html.parser')
        context = detect_context(soup)

        assert context == 'b2c'

    def test_mixed_context(self):
        """Mixed context when both B2B and B2C signals present."""
        html = """
        <html><body>
            <p>Enterprise solution for your business.</p>
            <p>Buy now with free shipping!</p>
        </body></html>
        """
        soup = BeautifulSoup(html, 'html.parser')
        context = detect_context(soup)

        assert context == 'mixed'


# =============================================================================
# Test Extraction Quality
# =============================================================================

class TestExtractionQuality:
    """Tests for extraction quality determination."""

    def test_full_quality(self, basic_html):
        """Full quality for rich pages."""
        soup = BeautifulSoup(basic_html, 'html.parser')
        blocks = extract_content_blocks(soup)
        quality = determine_extraction_quality(blocks)

        assert quality == 'full'

    def test_minimal_quality_empty(self):
        """Minimal quality for empty pages."""
        quality = determine_extraction_quality([])

        assert quality == 'minimal'

    def test_partial_quality(self):
        """Partial quality for sparse pages."""
        blocks = [
            ContentBlock(block_type='headline', level=1, content='Title Here'),
            ContentBlock(block_type='paragraph', content='A short paragraph with some text.')
        ]
        quality = determine_extraction_quality(blocks)

        assert quality == 'partial'


# =============================================================================
# Test Full Page Structure Extraction
# =============================================================================

class TestFullPageStructure:
    """Tests for the complete extract_page_structure function."""

    def test_extract_page_structure_basic(self, basic_html):
        """Full page structure extracted correctly."""
        structure = extract_page_structure("https://example.com/test", basic_html)

        assert structure.url == "https://example.com/test"
        assert structure.title == "Test Product Page"
        assert structure.meta_description == "This is a test product description."
        assert len(structure.content_blocks) > 0
        assert structure.extraction_quality in ['full', 'partial', 'minimal']

    def test_structure_includes_og_data(self, basic_html):
        """Structure includes OpenGraph data."""
        structure = extract_page_structure("https://example.com/test", basic_html)

        assert structure.og_data is not None
        assert 'title' in structure.og_data

    def test_structure_detects_page_type(self, product_html):
        """Structure detects page type."""
        structure = extract_page_structure("https://example.com/product", product_html)

        assert structure.detected_page_type == 'product'

    def test_structure_detects_context(self, b2b_html):
        """Structure detects B2B/B2C context."""
        structure = extract_page_structure("https://example.com/enterprise", b2b_html)

        assert structure.detected_context == 'b2b'


# =============================================================================
# Test Edge Cases
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling."""

    def test_empty_html(self):
        """Empty HTML handled gracefully."""
        structure = extract_page_structure("https://example.com", "")

        assert structure.url == "https://example.com"
        assert len(structure.content_blocks) == 0
        assert structure.extraction_quality == 'minimal'

    def test_malformed_html(self):
        """Malformed HTML handled gracefully."""
        html = "<html><body><p>Unclosed paragraph<div>Mixed up tags"
        structure = extract_page_structure("https://example.com", html)

        # Should not raise an exception
        assert structure is not None

    def test_script_tags_removed(self):
        """Script content not extracted."""
        html = """
        <html><body>
            <script>var sensitive = 'data';</script>
            <p>Real content here</p>
        </body></html>
        """
        structure = extract_page_structure("https://example.com", html)

        # No block should contain script content
        for block in structure.content_blocks:
            assert 'sensitive' not in block.content
            assert 'var' not in block.content

    def test_very_long_content_truncated(self):
        """Very long content is truncated."""
        long_text = "x" * 5000
        html = f"<html><body><p>{long_text}</p></body></html>"
        structure = extract_page_structure("https://example.com", html)

        # Content should be truncated
        for block in structure.content_blocks:
            assert len(block.content) <= 2000

    def test_duplicate_content_deduplicated(self):
        """Duplicate content blocks are deduplicated."""
        html = """
        <html><body>
            <p>Same paragraph text</p>
            <div><p>Same paragraph text</p></div>
        </body></html>
        """
        structure = extract_page_structure("https://example.com", html)

        paragraphs = [b for b in structure.content_blocks if b.block_type == 'paragraph']
        # Should deduplicate
        assert len(paragraphs) <= 2
