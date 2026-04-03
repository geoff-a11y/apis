"""
Pydantic models for APIS scoring API.
Maps to TypeScript interfaces in src/lib/types.ts
"""

from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field, field_validator
from datetime import datetime


class ScoreRequest(BaseModel):
    """Request to score a product URL"""
    url: str = Field(..., description="Product URL to score", min_length=10, max_length=2048)
    model_distribution: Optional[Dict[str, float]] = Field(
        None,
        description="Optional: Model distribution for client-specific scoring"
    )

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

    @field_validator('model_distribution')
    @classmethod
    def validate_distribution(cls, v: Optional[Dict[str, float]]) -> Optional[Dict[str, float]]:
        if v is not None:
            total = sum(v.values())
            if not (0.99 <= total <= 1.01):
                raise ValueError('Model distribution weights must sum to 1.0')
            for weight in v.values():
                if weight < 0 or weight > 1:
                    raise ValueError('Model weights must be between 0 and 1')
        return v


class ZoneContribution(BaseModel):
    """Contribution of a zone to signal presence"""
    zone: str = Field(..., description="Content zone (title, body, etc.)")
    score: float = Field(..., ge=0.0, le=1.0, description="Zone signal score")
    evidence: str = Field(..., description="Text snippet showing signal presence")


class SignalPresence(BaseModel):
    """Signal presence for a dimension"""
    dimension_id: str = Field(..., description="Dimension identifier (dim_01 to dim_26)")
    score: float = Field(..., ge=0.0, le=1.0, description="Overall signal score 0-1")
    zone_contributions: List[ZoneContribution]


class Recommendation(BaseModel):
    """Improvement recommendation for a dimension"""
    dimension_id: str
    current_signal: float
    target_signal: float
    gap: float
    predicted_delta: float
    copy_suggestion: str
    zone: str
    priority: Literal["high", "medium", "low"]


class SignalInteraction(BaseModel):
    """Detected interaction between two or more signals"""
    signal_ids: List[str] = Field(..., description="Dimension IDs in the interaction")
    combination_type: Literal["positive_pair", "negative_pair", "mixed_pair", "triple_combo"]
    individual_effects: Dict[str, float] = Field(..., description="Individual effect sizes")
    combined_effect: float = Field(..., description="Combined effect using interaction model")
    interaction_bonus: float = Field(..., description="Synergy/interference adjustment")
    model_used: Literal["multiplicative", "additive", "dominant", "diminishing"]


class MLScore(BaseModel):
    """ML Score response matching TypeScript interface"""
    id: str = Field(..., description="Unique score ID")
    url: str = Field(..., description="Scored URL")
    scored_at: str = Field(..., description="ISO timestamp of scoring")
    universal_score: float = Field(..., ge=0.0, le=100.0, description="Universal ML score 0-100")
    client_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Client-specific score")
    model_distribution: Optional[Dict[str, float]] = None
    signal_inventory: List[SignalPresence]
    signal_interactions: List[SignalInteraction] = Field(default_factory=list, description="Detected signal combinations")
    interaction_adjustment: float = Field(default=0.0, description="Total score adjustment from interactions")
    readability_score: float = Field(..., ge=0.0, le=100.0, description="Readability score 0-100")
    readability_flags: List[str]
    recommendations: List[Recommendation]
    platform: Optional[Literal["web", "amazon", "walmart", "google_shopping"]] = None
    extraction_quality: Literal["full", "partial", "minimal"]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    version: str = "1.0.0"


# === Benchmark Response Models ===

class ScoreRange(BaseModel):
    """Min/max score range"""
    min: float
    max: float


class BenchmarkStatsResponse(BaseModel):
    """Aggregated benchmark statistics"""
    total_pages: int = Field(..., description="Total pages in benchmark database")
    avg_score: float = Field(..., description="Average universal score")
    score_range: ScoreRange = Field(..., description="Min and max scores")
    products_count: int = Field(..., description="Number of product pages")
    services_count: int = Field(..., description="Number of service pages")
    last_updated: str = Field(..., description="ISO timestamp of last update")


class CategoryStatsItem(BaseModel):
    """Statistics for a single category"""
    category: str = Field(..., description="Category name")
    count: int = Field(..., description="Number of pages in category")
    avg_score: float = Field(..., description="Average score for category")
    min_score: float = Field(..., description="Minimum score in category")
    max_score: float = Field(..., description="Maximum score in category")


class CategoryStatsResponse(BaseModel):
    """Per-category breakdown of benchmark statistics"""
    categories: List[CategoryStatsItem]


class DimensionStatsItem(BaseModel):
    """Statistics for a single dimension"""
    dimension_id: str = Field(..., description="Dimension identifier (dim_01 to dim_26)")
    dimension_name: str = Field(..., description="Human-readable dimension name")
    avg_score: float = Field(..., description="Average score across all pages")
    presence_rate: float = Field(..., description="Percentage of pages with score >= 0.3")
    pages_at_target: int = Field(..., description="Number of pages with score >= 0.5")


class DimensionStatsResponse(BaseModel):
    """Dimension presence rates across benchmark"""
    dimensions: List[DimensionStatsItem]


class TopPerformerItem(BaseModel):
    """Top performing page summary"""
    url: str
    domain: str
    category: str
    universal_score: float
    extraction_quality: str


class TopPerformersResponse(BaseModel):
    """Top N pages by universal score"""
    pages: List[TopPerformerItem]


# === Scrape Request/Response Models ===

class ScrapeRequest(BaseModel):
    """Request to scrape page content"""
    url: str = Field(..., description="URL to scrape", min_length=10, max_length=2048)

    @field_validator('url')
    @classmethod
    def validate_url(cls, v: str) -> str:
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v


class ScrapeResponse(BaseModel):
    """Scraped page content"""
    title: str = Field(..., description="Page title")
    description: str = Field(..., description="Page description/meta description")
    features: List[str] = Field(..., description="Extracted features/bullet points")
    success: bool = Field(..., description="Whether scraping was successful")


# === Enhanced Scrape Models (Dynamic Page Structure) ===

ContentBlockType = Literal[
    "headline", "subheadline", "paragraph", "list",
    "table", "spec_table", "pricing", "testimonial",
    "faq", "image_caption", "cta", "badge", "stat"
]

PageType = Literal["product", "service", "saas", "landing", "unknown"]
PageContext = Literal["b2b", "b2c", "mixed"]
ExtractionQuality = Literal["full", "partial", "minimal"]


class ContentBlock(BaseModel):
    """A single content block with type and content, preserving page structure"""
    block_type: ContentBlockType = Field(..., description="Type of content block")
    level: Optional[int] = Field(None, ge=1, le=6, description="Hierarchy level for headlines (1=h1, 2=h2, etc.)")
    content: str = Field(..., description="Text content of the block")
    children: Optional[List["ContentBlock"]] = Field(None, description="Nested content blocks")
    metadata: Optional[Dict[str, any]] = Field(None, description="Additional structured data (e.g., table headers/rows, prices)")


class PageStructure(BaseModel):
    """Full page structure preserving semantic hierarchy"""
    url: str = Field(..., description="Source URL")
    title: str = Field(..., description="Page title")
    meta_description: Optional[str] = Field(None, description="Meta description tag content")
    og_data: Optional[Dict[str, str]] = Field(None, description="OpenGraph data (og:title, og:description, og:image)")
    schema_org: Optional[Dict[str, any]] = Field(None, description="JSON-LD Schema.org structured data if present")
    content_blocks: List[ContentBlock] = Field(..., description="Ordered list of content blocks preserving page structure")
    detected_page_type: PageType = Field(..., description="Auto-detected page type")
    detected_context: PageContext = Field(..., description="Auto-detected B2B/B2C context")
    extraction_quality: ExtractionQuality = Field(..., description="Quality of extraction (full/partial/minimal)")


class EnhancedScrapeResponse(BaseModel):
    """Enhanced scrape response with full page structure"""
    # Legacy fields for backward compatibility
    title: str = Field(..., description="Page title")
    description: str = Field(..., description="Page description")
    features: List[str] = Field(..., description="Extracted features (legacy)")
    success: bool = Field(..., description="Whether scraping was successful")
    # Enhanced fields
    structure: Optional[PageStructure] = Field(None, description="Full page structure with all content blocks")
