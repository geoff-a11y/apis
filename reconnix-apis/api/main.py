"""
FastAPI backend for APIS webapp scoring.

Endpoints:
  POST /score - Score a product URL
  POST /scrape - Extract page content (title, description, features)
  GET /health - Health check
  GET /benchmark/stats - Aggregated benchmark statistics
  GET /benchmark/categories - Per-category breakdown
  GET /benchmark/dimensions - Dimension presence rates
  GET /benchmark/top-performers - Top N scored pages
"""

import os
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime
import logging

from models import (
    ScoreRequest, MLScore, HealthResponse,
    BenchmarkStatsResponse, CategoryStatsResponse, DimensionStatsResponse,
    TopPerformersResponse, CategoryStatsItem, DimensionStatsItem, TopPerformerItem,
    ScrapeRequest, ScrapeResponse
)
from database import init_database, get_db
import benchmark_service
from scraper import fetch_html
from scorer import score_url

# Get allowed origins from environment variable
ALLOWED_ORIGINS = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
).split(",")

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API version
API_VERSION = "1.0.0"

# OpenAPI tags for documentation organization
tags_metadata = [
    {
        "name": "scoring",
        "description": "ML scoring endpoints for product URLs",
    },
    {
        "name": "benchmark",
        "description": "Benchmark database statistics and analysis",
    },
    {
        "name": "health",
        "description": "Health check and monitoring endpoints",
    },
]

# Create FastAPI app
app = FastAPI(
    title="APIS Scoring API",
    description="Agent Psychology Intelligence System - ML Scoring Backend",
    version=API_VERSION,
    openapi_tags=tags_metadata,
)

# Configure CORS with environment-based origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on application startup."""
    logger.info("Initializing benchmark database...")
    init_database()
    logger.info("Database initialized successfully")


# === Benchmark Endpoints ===

@app.get("/benchmark/stats", response_model=BenchmarkStatsResponse, tags=["benchmark"])
async def get_benchmark_stats(db: Session = Depends(get_db)):
    """
    Get aggregated benchmark statistics.

    Returns total pages, average score, score range, and counts by type.
    """
    stats = benchmark_service.get_benchmark_stats(db)
    return BenchmarkStatsResponse(
        total_pages=stats["total_pages"],
        avg_score=stats["avg_score"],
        score_range=stats["score_range"],
        products_count=stats["products_count"],
        services_count=stats["services_count"],
        last_updated=stats["last_updated"],
    )


@app.get("/benchmark/categories", response_model=CategoryStatsResponse, tags=["benchmark"])
async def get_category_stats(db: Session = Depends(get_db)):
    """
    Get per-category breakdown of benchmark statistics.

    Returns statistics grouped by category (electronics, b2b_saas, etc.).
    """
    stats = benchmark_service.get_category_stats(db)
    return CategoryStatsResponse(
        categories=[CategoryStatsItem(**item) for item in stats]
    )


@app.get("/benchmark/dimensions", response_model=DimensionStatsResponse, tags=["benchmark"])
async def get_dimension_stats(db: Session = Depends(get_db)):
    """
    Get dimension presence rates across all benchmark entries.

    Returns average score and presence rate for each of the 26 dimensions.
    """
    stats = benchmark_service.get_dimension_analysis(db)
    return DimensionStatsResponse(
        dimensions=[DimensionStatsItem(**item) for item in stats]
    )


@app.get("/benchmark/top-performers", response_model=TopPerformersResponse, tags=["benchmark"])
async def get_top_performers(
    limit: int = Query(10, ge=1, le=100, description="Number of results"),
    db: Session = Depends(get_db)
):
    """
    Get top N pages by universal score.

    Args:
        limit: Number of results to return (default 10, max 100)
    """
    pages = benchmark_service.get_top_performers(db, limit)
    return TopPerformersResponse(
        pages=[TopPerformerItem(**item) for item in pages]
    )


@app.get("/benchmark/bottom-performers", response_model=TopPerformersResponse, tags=["benchmark"])
async def get_bottom_performers(
    limit: int = Query(10, ge=1, le=100, description="Number of results"),
    db: Session = Depends(get_db)
):
    """
    Get bottom N pages by universal score.

    Args:
        limit: Number of results to return (default 10, max 100)
    """
    pages = benchmark_service.get_bottom_performers(db, limit)
    return TopPerformersResponse(
        pages=[TopPerformerItem(**item) for item in pages]
    )


# === Scrape Endpoint ===

@app.post("/scrape", response_model=ScrapeResponse, tags=["scoring"])
async def scrape_page(request: ScrapeRequest):
    """
    Scrape page content for the Page Optimizer.

    Uses Playwright with fallback methods to extract:
    - Page title
    - Description/meta description
    - Key features/bullet points

    Args:
        request: ScrapeRequest with URL

    Returns:
        ScrapeResponse with extracted content
    """
    from bs4 import BeautifulSoup
    import re
    import asyncio
    from concurrent.futures import ThreadPoolExecutor

    try:
        logger.info(f"Scraping URL: {request.url}")

        # Validate URL
        if not request.url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=400,
                detail="URL must start with http:// or https://"
            )

        # Run sync scraper in thread pool to avoid async/sync conflict
        loop = asyncio.get_event_loop()
        with ThreadPoolExecutor() as executor:
            html, method = await loop.run_in_executor(executor, fetch_html, request.url)
        logger.info(f"Fetched {request.url} using {method}")

        # Parse HTML
        soup = BeautifulSoup(html, 'html.parser')

        # Extract title
        title = None
        h1 = soup.find('h1')
        if h1:
            title = h1.get_text(strip=True)
        if not title:
            og_title = soup.find('meta', property='og:title')
            if og_title:
                title = og_title.get('content', '')
        if not title:
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.get_text(strip=True)
        if not title:
            title = 'Product'

        # Extract description
        description = ''
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc:
            description = meta_desc.get('content', '')
        if not description:
            og_desc = soup.find('meta', property='og:description')
            if og_desc:
                description = og_desc.get('content', '')
        if not description:
            # Try first paragraph
            first_p = soup.find('p')
            if first_p:
                description = first_p.get_text(strip=True)[:300]

        # Extract features from lists
        features = []
        for li in soup.find_all('li'):
            text = li.get_text(strip=True)
            if 10 < len(text) < 150 and len(features) < 8:
                # Clean up the text
                text = re.sub(r'\s+', ' ', text)
                features.append(text)

        # If no features, try bullet-like elements
        if not features:
            for p in soup.find_all('p'):
                text = p.get_text(strip=True)
                if 20 < len(text) < 200 and len(features) < 5:
                    text = re.sub(r'\s+', ' ', text)
                    features.append(text)

        # Default features if none found
        if not features:
            features = ['Quality product', 'Great value', 'Trusted brand']

        return ScrapeResponse(
            title=title[:100],
            description=description[:500] or 'High-quality product.',
            features=features[:8],
            success=True
        )

    except ValueError as e:
        logger.error(f"ValueError scraping {request.url}: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error scraping {request.url}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to scrape page: {str(e)}"
        )


@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health_check():
    """
    Health check endpoint.

    Checks:
        - API availability
        - Data files loaded (dimensions, effect_sizes)

    Returns:
        HealthResponse with status and timestamp
    """
    from scorer import DIMENSIONS, EFFECT_SIZES

    # Check data dependencies
    if not DIMENSIONS or not EFFECT_SIZES:
        return HealthResponse(
            status="degraded",
            timestamp=datetime.utcnow().isoformat() + "Z",
            version=API_VERSION,
        )

    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat() + "Z",
        version=API_VERSION,
    )


@app.post("/score", response_model=MLScore, tags=["scoring"])
async def score_product(request: ScoreRequest, db: Session = Depends(get_db)):
    """
    Score a product URL.

    Scores the URL and automatically saves the result to the benchmark database.
    If the URL was previously scored, updates the existing entry.

    Args:
        request: ScoreRequest with URL and optional model distribution

    Returns:
        MLScore with universal score, signal inventory, and recommendations

    Raises:
        HTTPException: If URL cannot be fetched or scored
    """
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from functools import partial

    try:
        logger.info(f"Scoring URL: {request.url}")

        # Validate URL format
        if not request.url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=400,
                detail="URL must start with http:// or https://"
            )

        # Run sync scorer in thread pool to avoid async/sync Playwright conflict
        loop = asyncio.get_event_loop()
        score_func = partial(score_url, url=request.url, model_distribution=request.model_distribution)
        with ThreadPoolExecutor() as executor:
            ml_score = await loop.run_in_executor(executor, score_func)

        logger.info(
            f"Scored URL {request.url}: universal_score={ml_score.universal_score}"
        )

        # Save to benchmark database
        try:
            benchmark_service.save_benchmark_entry(db, ml_score)
            db.commit()
            logger.info(f"Saved benchmark entry for {request.url}")
        except Exception as e:
            logger.error(f"Failed to save benchmark entry: {e}")
            # Don't fail the request if benchmark save fails
            db.rollback()

        return ml_score

    except ValueError as e:
        error_msg = str(e)
        logger.error(f"ValueError scoring {request.url}: {error_msg}")

        # Provide helpful error messages for common issues
        if "403" in error_msg or "Forbidden" in error_msg:
            detail = (
                "This website is blocking our requests. "
                "We tried multiple methods including headless browser automation. "
                "Some sites have very strong anti-bot protection. "
                "Try a different product URL or contact support."
            )
        elif "Failed to fetch URL with all methods" in error_msg:
            detail = (
                f"Unable to access this URL after trying multiple scraping methods. "
                f"The site may require CAPTCHA solving or have advanced anti-bot measures. "
                f"Details: {error_msg}"
            )
        elif "timeout" in error_msg.lower():
            detail = "Request timed out. The website may be slow or unreachable. Please try again."
        elif "Invalid or blocked URL" in error_msg:
            detail = "Invalid URL or blocked hostname (localhost/private IPs not allowed for security)."
        else:
            detail = f"Unable to fetch URL: {error_msg}"

        raise HTTPException(
            status_code=400,
            detail=detail
        )
    except TimeoutError as e:
        logger.error(f"Timeout scoring {request.url}: {str(e)}")
        raise HTTPException(
            status_code=504,
            detail="Request timed out while loading the page. Please try again."
        )
    except Exception as e:
        logger.error(f"Error scoring {request.url}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.get("/", tags=["health"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "APIS Scoring API",
        "version": API_VERSION,
        "description": "Agent Psychology Intelligence System - ML Scoring Backend",
        "endpoints": {
            "health": "GET /health",
            "score": "POST /score",
            "benchmark_stats": "GET /benchmark/stats",
            "benchmark_categories": "GET /benchmark/categories",
            "benchmark_dimensions": "GET /benchmark/dimensions",
            "benchmark_top": "GET /benchmark/top-performers",
            "benchmark_bottom": "GET /benchmark/bottom-performers",
        },
        "documentation": "/docs",
    }
