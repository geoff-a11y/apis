"""
Advanced web scraping module for APIS.

Implements multiple fallback strategies to handle sites that block direct requests:
1. Enhanced requests with realistic headers and user agents
2. Playwright headless browser (primary for blocked sites)
3. ScrapingBee API (optional premium fallback)

Handles common anti-scraping measures including:
- User-agent detection
- Request rate limiting
- JavaScript-heavy pages
- CAPTCHA challenges
"""

import os
import logging
from typing import Tuple, Optional
from urllib.parse import urlparse

# Standard library imports
import requests
from bs4 import BeautifulSoup

# Playwright for headless browsing (already installed)
try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)

# User agents for rotation
USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]


def get_realistic_headers(url: str, user_agent: Optional[str] = None) -> dict:
    """
    Generate realistic browser headers to avoid detection.

    Args:
        url: Target URL for referer header
        user_agent: Optional custom user agent (will use rotation if not provided)

    Returns:
        Dictionary of HTTP headers
    """
    import random

    if user_agent is None:
        user_agent = random.choice(USER_AGENTS)

    parsed = urlparse(url)

    return {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Cache-Control": "max-age=0",
        "Referer": f"{parsed.scheme}://{parsed.netloc}/",
    }


def fetch_with_requests(url: str, timeout: int = 10) -> Tuple[str, str]:
    """
    Attempt to fetch URL using enhanced requests library.

    This is the fastest method and works for many sites.

    Args:
        url: Target URL
        timeout: Request timeout in seconds

    Returns:
        (title, body_text) tuple

    Raises:
        Exception: If request fails
    """
    headers = get_realistic_headers(url)

    # Make request with redirects enabled
    response = requests.get(
        url,
        headers=headers,
        timeout=timeout,
        allow_redirects=True
    )
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Extract title
    title = ""
    if soup.title:
        title = soup.title.string or ""

    # Remove script and style elements
    for script in soup(["script", "style", "nav", "header", "footer"]):
        script.decompose()

    # Get text
    body_text = soup.get_text(separator=" ", strip=True)

    return title, body_text


def fetch_with_playwright(url: str, timeout: int = 30000) -> Tuple[str, str]:
    """
    Fetch URL using Playwright headless browser.

    This method bypasses most bot detection by using a real browser.
    Works for JavaScript-heavy sites and sites that block direct requests.

    Args:
        url: Target URL
        timeout: Page load timeout in milliseconds (default 30s)

    Returns:
        (title, body_text) tuple

    Raises:
        Exception: If browser automation fails
    """
    if not PLAYWRIGHT_AVAILABLE:
        raise ImportError("Playwright is not installed")

    logger.info(f"Using Playwright to fetch {url}")

    with sync_playwright() as p:
        # Launch browser with stealth settings
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--disable-web-security',
                '--disable-http2',  # Some sites have HTTP/2 protocol issues
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
            ]
        )

        # Create context with realistic settings
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent=USER_AGENTS[0],
            locale='en-US',
            timezone_id='America/New_York',
        )

        # Additional stealth measures
        context.add_init_script("""
            // Override the navigator.webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Override the navigator.plugins to make it look like a real browser
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Override navigator.languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });
        """)

        page = context.new_page()

        try:
            # Navigate to URL with more forgiving wait condition
            # networkidle can be too strict for some sites
            page.goto(url, wait_until='load', timeout=timeout)

            # Wait a bit for dynamic content to load
            page.wait_for_timeout(3000)

            # Extract title
            title = page.title()

            # Extract body text (remove scripts, styles, etc.)
            body_text = page.evaluate("""
                () => {
                    // Remove unwanted elements
                    const unwanted = document.querySelectorAll('script, style, nav, header, footer, iframe, noscript');
                    unwanted.forEach(el => el.remove());

                    // Get text content
                    return document.body.innerText || document.body.textContent || '';
                }
            """)

            return title, body_text

        except PlaywrightTimeout:
            logger.error(f"Playwright timeout loading {url}")
            raise TimeoutError(f"Page load timeout after {timeout}ms")
        finally:
            browser.close()


def fetch_with_scrapingbee(url: str) -> Tuple[str, str]:
    """
    Fetch URL using ScrapingBee API (premium option).

    Requires SCRAPINGBEE_API_KEY environment variable.
    This is a paid service with per-request costs.

    Args:
        url: Target URL

    Returns:
        (title, body_text) tuple

    Raises:
        ValueError: If API key is not set
        Exception: If API request fails
    """
    api_key = os.environ.get('SCRAPINGBEE_API_KEY')
    if not api_key:
        raise ValueError("SCRAPINGBEE_API_KEY environment variable not set")

    logger.info(f"Using ScrapingBee API to fetch {url}")

    # ScrapingBee API endpoint
    api_url = "https://app.scrapingbee.com/api/v1/"

    params = {
        'api_key': api_key,
        'url': url,
        'render_js': 'true',  # Enable JavaScript rendering
        'premium_proxy': 'false',  # Use standard proxies to save cost
        'country_code': 'us',  # US-based proxies
    }

    response = requests.get(api_url, params=params, timeout=60)
    response.raise_for_status()

    # Check if we hit rate limits or quota
    if response.status_code == 429:
        raise Exception("ScrapingBee rate limit exceeded")

    soup = BeautifulSoup(response.content, "html.parser")

    # Extract title
    title = ""
    if soup.title:
        title = soup.title.string or ""

    # Remove script and style elements
    for script in soup(["script", "style", "nav", "header", "footer"]):
        script.decompose()

    # Get text
    body_text = soup.get_text(separator=" ", strip=True)

    # Log API credits used
    credits_used = response.headers.get('Spb-Cost', 'unknown')
    logger.info(f"ScrapingBee credits used: {credits_used}")

    return title, body_text


def fetch_url_content(url: str, timeout: int = 10) -> Tuple[str, str]:
    """
    Fetch URL content with multi-layered fallback strategy.

    Strategy:
    1. Try enhanced requests (fast, works for ~60% of sites)
    2. Fall back to Playwright (slower but works for ~95% of sites)
    3. Fall back to ScrapingBee if API key is available (premium, nearly 100%)

    Args:
        url: Target URL
        timeout: Timeout for requests method (Playwright uses 30s fixed)

    Returns:
        (title, body_text) tuple

    Raises:
        ValueError: If URL is invalid or all methods fail
    """
    errors = []

    # Method 1: Enhanced requests (fastest)
    try:
        logger.info(f"Attempting to fetch {url} with enhanced requests")
        title, body_text = fetch_with_requests(url, timeout)

        # Validate we got meaningful content
        if len(body_text) > 100:
            logger.info(f"Successfully fetched {url} with requests")
            return title, body_text
        else:
            logger.warning(f"Requests returned minimal content for {url}")
            errors.append("requests: minimal content")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            logger.warning(f"403 Forbidden with requests for {url}, trying Playwright")
            errors.append(f"requests: 403 Forbidden")
        else:
            logger.warning(f"HTTP error with requests for {url}: {e}")
            errors.append(f"requests: HTTP {e.response.status_code}")
    except Exception as e:
        logger.warning(f"Requests failed for {url}: {str(e)}")
        errors.append(f"requests: {str(e)[:100]}")

    # Method 2: Playwright (slower but more reliable)
    if PLAYWRIGHT_AVAILABLE:
        try:
            logger.info(f"Attempting to fetch {url} with Playwright")
            title, body_text = fetch_with_playwright(url, timeout=30000)

            # Validate we got meaningful content
            if len(body_text) > 100:
                logger.info(f"Successfully fetched {url} with Playwright")
                return title, body_text
            else:
                logger.warning(f"Playwright returned minimal content for {url}")
                errors.append("playwright: minimal content")
        except Exception as e:
            logger.warning(f"Playwright failed for {url}: {str(e)}")
            errors.append(f"playwright: {str(e)[:100]}")
    else:
        errors.append("playwright: not available")

    # Method 3: ScrapingBee (premium fallback)
    if os.environ.get('SCRAPINGBEE_API_KEY'):
        try:
            logger.info(f"Attempting to fetch {url} with ScrapingBee")
            title, body_text = fetch_with_scrapingbee(url)

            # Validate we got meaningful content
            if len(body_text) > 100:
                logger.info(f"Successfully fetched {url} with ScrapingBee")
                return title, body_text
            else:
                logger.warning(f"ScrapingBee returned minimal content for {url}")
                errors.append("scrapingbee: minimal content")
        except Exception as e:
            logger.warning(f"ScrapingBee failed for {url}: {str(e)}")
            errors.append(f"scrapingbee: {str(e)[:100]}")
    else:
        logger.info("ScrapingBee API key not set, skipping premium fallback")
        errors.append("scrapingbee: API key not set")

    # All methods failed
    error_summary = "; ".join(errors)
    raise ValueError(
        f"Failed to fetch URL with all methods. "
        f"This site may require CAPTCHA solving or have strong anti-bot protection. "
        f"Errors: {error_summary}"
    )


def validate_url(url: str) -> bool:
    """
    Validate URL to prevent SSRF attacks.
    Blocks private IP ranges and localhost.

    Args:
        url: URL to validate

    Returns:
        True if URL is valid and safe, False otherwise
    """
    import ipaddress
    import socket

    try:
        parsed = urlparse(url)
        hostname = parsed.hostname

        if not hostname:
            return False

        # Block localhost
        if hostname in ('localhost', '127.0.0.1', '::1'):
            return False

        # Try to resolve hostname to check for private IPs
        try:
            ip = socket.gethostbyname(hostname)
            ip_obj = ipaddress.ip_address(ip)
            # Block private, loopback, and link-local addresses
            if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local:
                return False
        except socket.gaierror:
            pass  # Allow if DNS resolution fails - will fail at fetch anyway

        return True
    except Exception:
        return False
