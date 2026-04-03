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

    # Remove non-content elements comprehensively
    # This prevents garbage like state dropdowns, legal text, forms from being extracted
    elements_to_remove = [
        "script", "style", "nav", "header", "footer",
        "form", "select", "option", "input", "textarea", "button",
        "aside", "sidebar", "menu", "menubar",
        "noscript", "iframe", "embed", "object",
        "svg", "canvas", "video", "audio",
    ]
    for element in soup(elements_to_remove):
        element.decompose()

    # Remove elements by common class/id patterns that indicate non-content
    for element in soup.find_all(class_=lambda x: x and any(
        pattern in str(x).lower() for pattern in [
            'cookie', 'privacy', 'modal', 'popup', 'banner', 'alert',
            'sidebar', 'aside', 'nav', 'menu', 'footer', 'header',
            'legal', 'disclaimer', 'terms', 'policy', 'consent',
            'dropdown', 'select', 'filter', 'sort', 'pagination',
            'breadcrumb', 'social', 'share', 'subscribe', 'newsletter',
            'cart', 'checkout', 'login', 'signup', 'signin',
        ]
    )):
        element.decompose()

    for element in soup.find_all(id=lambda x: x and any(
        pattern in str(x).lower() for pattern in [
            'cookie', 'privacy', 'modal', 'popup', 'banner', 'alert',
            'sidebar', 'nav', 'menu', 'footer', 'header',
            'legal', 'disclaimer', 'terms', 'policy',
            'dropdown', 'filter', 'sort',
        ]
    )):
        element.decompose()

    # Get text
    body_text = soup.get_text(separator=" ", strip=True)

    # Post-process to remove common patterns that slip through
    import re
    # Remove state lists (common in form dropdowns)
    body_text = re.sub(
        r'\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|'
        r'Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|'
        r'Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|'
        r'Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|'
        r'New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|'
        r'Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|'
        r'Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\s*',
        ' ', body_text, flags=re.IGNORECASE
    )
    # Clean up multiple spaces
    body_text = re.sub(r'\s+', ' ', body_text).strip()

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

            # Extract body text (remove scripts, styles, forms, and non-content elements)
            body_text = page.evaluate("""
                () => {
                    // Remove unwanted elements comprehensively
                    const unwantedSelectors = [
                        'script', 'style', 'nav', 'header', 'footer', 'iframe', 'noscript',
                        'form', 'select', 'option', 'input', 'textarea', 'button',
                        'aside', 'menu', 'menubar', 'svg', 'canvas', 'video', 'audio',
                        '[class*="cookie"]', '[class*="privacy"]', '[class*="modal"]',
                        '[class*="popup"]', '[class*="banner"]', '[class*="sidebar"]',
                        '[class*="dropdown"]', '[class*="legal"]', '[class*="disclaimer"]',
                        '[class*="consent"]', '[class*="newsletter"]', '[class*="subscribe"]',
                        '[id*="cookie"]', '[id*="privacy"]', '[id*="modal"]', '[id*="popup"]',
                        '[id*="sidebar"]', '[id*="dropdown"]', '[id*="legal"]'
                    ];
                    const unwanted = document.querySelectorAll(unwantedSelectors.join(', '));
                    unwanted.forEach(el => el.remove());

                    // Get text content
                    let text = document.body.innerText || document.body.textContent || '';

                    // Remove state lists that slip through
                    const states = /\\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\\s*/gi;
                    text = text.replace(states, ' ');

                    // Clean up multiple spaces
                    text = text.replace(/\\s+/g, ' ').trim();

                    return text;
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

    # Remove non-content elements comprehensively
    elements_to_remove = [
        "script", "style", "nav", "header", "footer",
        "form", "select", "option", "input", "textarea", "button",
        "aside", "sidebar", "menu", "menubar",
        "noscript", "iframe", "embed", "object",
        "svg", "canvas", "video", "audio",
    ]
    for element in soup(elements_to_remove):
        element.decompose()

    # Remove elements by common class/id patterns
    for element in soup.find_all(class_=lambda x: x and any(
        pattern in str(x).lower() for pattern in [
            'cookie', 'privacy', 'modal', 'popup', 'banner', 'alert',
            'sidebar', 'aside', 'nav', 'menu', 'footer', 'header',
            'legal', 'disclaimer', 'terms', 'policy', 'consent',
            'dropdown', 'select', 'filter', 'sort', 'pagination',
        ]
    )):
        element.decompose()

    # Get text
    body_text = soup.get_text(separator=" ", strip=True)

    # Post-process to remove state lists
    import re
    body_text = re.sub(
        r'\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|'
        r'Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|'
        r'Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|'
        r'Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|'
        r'New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|'
        r'Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|'
        r'Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming)\s*',
        ' ', body_text, flags=re.IGNORECASE
    )
    body_text = re.sub(r'\s+', ' ', body_text).strip()

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


def fetch_html(url: str, timeout: int = 30000) -> Tuple[str, str]:
    """
    Fetch raw HTML from a URL with multi-layered fallback strategy.

    Returns raw HTML for further parsing by the caller.

    Strategy:
    1. Try enhanced requests (fast, works for ~60% of sites)
    2. Fall back to Playwright (slower but works for ~95% of sites)

    Args:
        url: Target URL
        timeout: Timeout in milliseconds for Playwright (default 30s)

    Returns:
        (html, method) tuple where method is 'requests' or 'playwright'

    Raises:
        ValueError: If URL is invalid or all methods fail
    """
    errors = []

    # Method 1: Enhanced requests (fastest)
    try:
        logger.info(f"Fetching HTML from {url} with requests")
        headers = get_realistic_headers(url)
        response = requests.get(
            url,
            headers=headers,
            timeout=timeout // 1000,  # Convert to seconds
            allow_redirects=True
        )
        response.raise_for_status()

        # Validate we got meaningful content
        if len(response.text) > 100:
            logger.info(f"Successfully fetched HTML from {url} with requests")
            return response.text, "requests"
        else:
            errors.append("requests: minimal content")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 403:
            logger.warning(f"403 Forbidden for {url}, trying Playwright")
            errors.append("requests: 403 Forbidden")
        else:
            errors.append(f"requests: HTTP {e.response.status_code}")
    except Exception as e:
        errors.append(f"requests: {str(e)[:100]}")

    # Method 2: Playwright (slower but more reliable)
    if PLAYWRIGHT_AVAILABLE:
        try:
            logger.info(f"Fetching HTML from {url} with Playwright")

            with sync_playwright() as p:
                browser = p.chromium.launch(
                    headless=True,
                    args=[
                        '--disable-blink-features=AutomationControlled',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                    ]
                )

                context = browser.new_context(
                    viewport={'width': 1920, 'height': 1080},
                    user_agent=USER_AGENTS[0],
                    locale='en-US',
                )

                # Stealth measures
                context.add_init_script("""
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """)

                page = context.new_page()

                try:
                    page.goto(url, wait_until='load', timeout=timeout)
                    page.wait_for_timeout(2000)  # Wait for dynamic content
                    html = page.content()

                    if len(html) > 100:
                        logger.info(f"Successfully fetched HTML from {url} with Playwright")
                        return html, "playwright"
                    else:
                        errors.append("playwright: minimal content")
                finally:
                    browser.close()

        except Exception as e:
            errors.append(f"playwright: {str(e)[:100]}")
    else:
        errors.append("playwright: not available")

    # All methods failed
    error_summary = "; ".join(errors)
    raise ValueError(f"Failed to fetch HTML with all methods. Errors: {error_summary}")


# ============================================================================
# Enhanced Page Structure Extraction
# ============================================================================

import json
import re
from typing import List, Dict, Any, Optional
from models import (
    ContentBlock, PageStructure, EnhancedScrapeResponse,
    ContentBlockType, PageType, PageContext, ExtractionQuality
)


# B2B indicator keywords
B2B_KEYWORDS = [
    'enterprise', 'business', 'corporate', 'b2b', 'saas', 'platform',
    'solution', 'workflow', 'integration', 'api', 'dashboard', 'analytics',
    'team', 'organization', 'company', 'roi', 'compliance', 'scalable',
    'deployment', 'infrastructure', 'procurement', 'vendor', 'stakeholder',
    'demo', 'pilot', 'contract', 'sla', 'support plan', 'onboarding',
]

# B2C indicator keywords
B2C_KEYWORDS = [
    'buy now', 'add to cart', 'shop', 'order', 'checkout', 'shipping',
    'free delivery', 'returns', 'warranty', 'gift', 'deal', 'sale',
    'discount', 'coupon', 'save', 'personal', 'family', 'home',
    'everyday', 'lifestyle', 'easy', 'simple', 'fast', 'instant',
    'try', 'love', 'enjoy', 'perfect for', 'great for',
]


def detect_page_type(soup: BeautifulSoup, schema_data: Optional[Dict]) -> PageType:
    """Detect page type from schema.org data and content patterns."""
    # Check schema.org first
    if schema_data:
        schema_type = schema_data.get('@type', '').lower()
        if 'product' in schema_type:
            return 'product'
        if 'service' in schema_type:
            return 'service'
        if 'softwareapplication' in schema_type:
            return 'saas'

    # Check for pricing patterns (SaaS indicator)
    text = soup.get_text().lower()
    if any(p in text for p in ['per month', '/mo', 'per user', 'monthly', 'annually', 'pricing plans', 'free trial']):
        if any(p in text for p in ['enterprise', 'team', 'business plan', 'pro plan']):
            return 'saas'

    # Check for product indicators
    if any(p in text for p in ['add to cart', 'buy now', 'in stock', 'ships', 'delivery']):
        return 'product'

    # Check for service indicators
    if any(p in text for p in ['book now', 'schedule', 'consultation', 'our services', 'we offer']):
        return 'service'

    # Check meta tags
    og_type = soup.find('meta', property='og:type')
    if og_type:
        og_value = og_type.get('content', '').lower()
        if 'product' in og_value:
            return 'product'

    return 'landing'


def detect_context(soup: BeautifulSoup) -> PageContext:
    """Detect B2B vs B2C context from content patterns."""
    text = soup.get_text().lower()

    b2b_score = sum(1 for kw in B2B_KEYWORDS if kw in text)
    b2c_score = sum(1 for kw in B2C_KEYWORDS if kw in text)

    if b2b_score > b2c_score * 1.5:
        return 'b2b'
    elif b2c_score > b2b_score * 1.5:
        return 'b2c'
    else:
        return 'mixed'


def extract_schema_org(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Extract JSON-LD Schema.org data if present."""
    scripts = soup.find_all('script', type='application/ld+json')

    for script in scripts:
        try:
            data = json.loads(script.string)
            # Handle arrays of schemas
            if isinstance(data, list):
                # Find most relevant (Product, Service, etc.)
                for item in data:
                    if isinstance(item, dict) and item.get('@type') in [
                        'Product', 'Service', 'SoftwareApplication', 'Organization'
                    ]:
                        return item
                return data[0] if data else None
            return data
        except (json.JSONDecodeError, TypeError):
            continue

    return None


def extract_og_data(soup: BeautifulSoup) -> Optional[Dict[str, str]]:
    """Extract OpenGraph meta tags."""
    og_data = {}

    og_tags = ['og:title', 'og:description', 'og:image', 'og:type', 'og:url']
    for tag in og_tags:
        meta = soup.find('meta', property=tag)
        if meta and meta.get('content'):
            og_data[tag.replace('og:', '')] = meta['content']

    return og_data if og_data else None


def is_testimonial(element) -> bool:
    """Check if element looks like a testimonial."""
    classes = ' '.join(element.get('class', [])).lower()
    element_id = (element.get('id') or '').lower()

    testimonial_patterns = ['testimonial', 'review', 'quote', 'customer-', 'client-']
    if any(p in classes or p in element_id for p in testimonial_patterns):
        return True

    # Check for blockquote with attribution
    if element.name == 'blockquote':
        return True

    return False


def is_faq(element) -> bool:
    """Check if element looks like an FAQ."""
    classes = ' '.join(element.get('class', [])).lower()
    element_id = (element.get('id') or '').lower()

    faq_patterns = ['faq', 'accordion', 'question', 'q-and-a', 'qanda']
    if any(p in classes or p in element_id for p in faq_patterns):
        return True

    # Check for details/summary pattern
    if element.name == 'details':
        return True

    return False


def is_pricing(element) -> bool:
    """Check if element looks like pricing content."""
    classes = ' '.join(element.get('class', [])).lower()
    element_id = (element.get('id') or '').lower()

    pricing_patterns = ['pricing', 'price', 'plan', 'tier', 'package']
    if any(p in classes or p in element_id for p in pricing_patterns):
        return True

    # Check for currency patterns in text
    text = element.get_text()
    if re.search(r'[$€£]\s*\d+', text):
        return True

    return False


def is_stat(element) -> bool:
    """Check if element looks like a stat/metric."""
    classes = ' '.join(element.get('class', [])).lower()

    stat_patterns = ['stat', 'metric', 'number', 'counter', 'achievement']
    if any(p in classes for p in stat_patterns):
        return True

    # Check for large number patterns
    text = element.get_text().strip()
    if re.match(r'^[\d,]+[+%]?$', text) or re.match(r'^\d+[KMB]\+?', text):
        return True

    return False


def extract_table_metadata(table) -> Dict[str, Any]:
    """Extract table structure with headers and rows."""
    metadata = {'headers': [], 'rows': []}

    # Extract headers
    thead = table.find('thead')
    if thead:
        header_row = thead.find('tr')
        if header_row:
            metadata['headers'] = [th.get_text(strip=True) for th in header_row.find_all(['th', 'td'])]
    else:
        # Try first row as header
        first_row = table.find('tr')
        if first_row and first_row.find('th'):
            metadata['headers'] = [th.get_text(strip=True) for th in first_row.find_all('th')]

    # Extract rows (limit to first 10 for size)
    tbody = table.find('tbody') or table
    rows = tbody.find_all('tr')[:10]
    for row in rows:
        cells = [td.get_text(strip=True) for td in row.find_all(['td', 'th'])]
        if cells and cells != metadata['headers']:
            metadata['rows'].append(cells)

    return metadata


def classify_table(table) -> ContentBlockType:
    """Classify table as regular table or spec_table."""
    # Check class names
    classes = ' '.join(table.get('class', [])).lower()
    if any(p in classes for p in ['spec', 'specification', 'feature', 'comparison', 'compare']):
        return 'spec_table'

    # Check if it's a two-column key-value table (common for specs)
    rows = table.find_all('tr')
    if rows:
        cells_per_row = [len(row.find_all(['td', 'th'])) for row in rows[:5]]
        if cells_per_row and all(c == 2 for c in cells_per_row):
            return 'spec_table'

    return 'table'


def extract_content_blocks(soup: BeautifulSoup) -> List[ContentBlock]:
    """
    Walk DOM tree and extract content blocks preserving structure.

    Extracts: headlines, paragraphs, lists, tables, testimonials, FAQs,
    pricing blocks, stats, CTAs, and badges.
    """
    blocks = []

    # Find main content area (try common selectors)
    main_content = (
        soup.find('main') or
        soup.find('article') or
        soup.find(id='content') or
        soup.find(class_='content') or
        soup.find(id='main') or
        soup.find(class_='main') or
        soup.body or
        soup
    )

    if not main_content:
        return blocks

    # Remove unwanted elements
    for element in main_content.find_all([
        'script', 'style', 'nav', 'header', 'footer', 'aside',
        'noscript', 'iframe', 'form', 'select', 'input', 'textarea'
    ]):
        element.decompose()

    # Remove by class patterns
    for element in main_content.find_all(class_=lambda x: x and any(
        p in str(x).lower() for p in [
            'cookie', 'modal', 'popup', 'banner', 'nav', 'menu',
            'sidebar', 'footer', 'header', 'social', 'share'
        ]
    )):
        element.decompose()

    def process_element(element, depth=0) -> Optional[ContentBlock]:
        """Process a single element into a ContentBlock."""
        if element.name is None:
            return None

        # Skip already-decomposed elements
        if not hasattr(element, 'name'):
            return None

        # Headlines (h1-h6)
        if element.name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
            text = element.get_text(strip=True)
            if text and len(text) > 2:
                level = int(element.name[1])
                block_type = 'headline' if level <= 2 else 'subheadline'
                return ContentBlock(
                    block_type=block_type,
                    level=level,
                    content=text[:500]  # Cap length
                )

        # Paragraphs
        if element.name == 'p':
            text = element.get_text(strip=True)
            if text and len(text) > 10:
                return ContentBlock(
                    block_type='paragraph',
                    content=text[:2000]
                )

        # Lists
        if element.name in ['ul', 'ol']:
            items = []
            for li in element.find_all('li', recursive=False):
                text = li.get_text(strip=True)
                if text:
                    items.append(text[:500])

            if items:
                return ContentBlock(
                    block_type='list',
                    content='\n'.join(f'• {item}' for item in items[:20]),
                    metadata={'items': items[:20], 'ordered': element.name == 'ol'}
                )

        # Tables
        if element.name == 'table':
            table_type = classify_table(element)
            metadata = extract_table_metadata(element)
            if metadata['rows']:
                # Create text summary of table
                content_parts = []
                if metadata['headers']:
                    content_parts.append(' | '.join(metadata['headers']))
                for row in metadata['rows'][:5]:
                    content_parts.append(' | '.join(row))

                return ContentBlock(
                    block_type=table_type,
                    content='\n'.join(content_parts),
                    metadata=metadata
                )

        # Blockquotes (often testimonials)
        if element.name == 'blockquote':
            text = element.get_text(strip=True)
            if text:
                return ContentBlock(
                    block_type='testimonial',
                    content=text[:1000]
                )

        # Details/Summary (FAQs)
        if element.name == 'details':
            summary = element.find('summary')
            question = summary.get_text(strip=True) if summary else ''
            # Get answer (rest of content)
            answer_parts = [child.get_text(strip=True) for child in element.children
                           if child.name != 'summary' and hasattr(child, 'get_text')]
            answer = ' '.join(answer_parts)

            if question:
                return ContentBlock(
                    block_type='faq',
                    content=f"Q: {question}\nA: {answer[:500]}",
                    metadata={'question': question, 'answer': answer[:500]}
                )

        # Figure with caption
        if element.name == 'figure':
            caption = element.find('figcaption')
            if caption:
                return ContentBlock(
                    block_type='image_caption',
                    content=caption.get_text(strip=True)[:300]
                )

        # Check for special div types
        if element.name == 'div':
            # Testimonials
            if is_testimonial(element):
                text = element.get_text(strip=True)
                if text and len(text) > 20:
                    return ContentBlock(
                        block_type='testimonial',
                        content=text[:1000]
                    )

            # FAQs
            if is_faq(element):
                text = element.get_text(strip=True)
                if text:
                    return ContentBlock(
                        block_type='faq',
                        content=text[:1000]
                    )

            # Pricing
            if is_pricing(element):
                text = element.get_text(strip=True)
                if text:
                    # Try to extract price
                    price_match = re.search(r'[$€£]\s*[\d,]+(?:\.\d{2})?', text)
                    return ContentBlock(
                        block_type='pricing',
                        content=text[:1000],
                        metadata={'price': price_match.group() if price_match else None}
                    )

            # Stats
            if is_stat(element):
                text = element.get_text(strip=True)
                if text:
                    return ContentBlock(
                        block_type='stat',
                        content=text[:200]
                    )

        # Buttons and CTAs
        if element.name in ['button', 'a']:
            classes = ' '.join(element.get('class', [])).lower()
            if any(p in classes for p in ['cta', 'btn-primary', 'button-primary', 'action']):
                text = element.get_text(strip=True)
                if text and len(text) < 50:
                    return ContentBlock(
                        block_type='cta',
                        content=text
                    )

        return None

    # Walk through relevant elements
    seen_content = set()

    for element in main_content.find_all([
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'ul', 'ol', 'table', 'blockquote',
        'details', 'figure', 'div', 'button', 'a'
    ]):
        # Skip nested elements we'll process separately
        if element.find_parent(['ul', 'ol', 'table', 'blockquote', 'details', 'figure']):
            if element.name not in ['li', 'tr', 'td', 'th', 'summary', 'figcaption']:
                continue

        block = process_element(element)
        if block:
            # Deduplicate by content hash
            content_hash = hash(block.content[:100])
            if content_hash not in seen_content:
                seen_content.add(content_hash)
                blocks.append(block)

    return blocks


def determine_extraction_quality(blocks: List[ContentBlock]) -> ExtractionQuality:
    """Determine quality of extraction based on content found."""
    if not blocks:
        return 'minimal'

    # Count meaningful blocks
    headlines = sum(1 for b in blocks if b.block_type in ['headline', 'subheadline'])
    paragraphs = sum(1 for b in blocks if b.block_type == 'paragraph')
    lists = sum(1 for b in blocks if b.block_type == 'list')
    total_content_length = sum(len(b.content) for b in blocks)

    # Full extraction: multiple headlines, paragraphs, and good content length
    if headlines >= 2 and paragraphs >= 3 and total_content_length > 1000:
        return 'full'

    # Partial: some structure found
    if (headlines >= 1 or paragraphs >= 2) and total_content_length > 300:
        return 'partial'

    return 'minimal'


def extract_page_structure(url: str, html: str) -> PageStructure:
    """
    Extract full page structure from HTML.

    Walks the DOM tree and extracts all semantic content blocks while
    preserving hierarchy and detecting page type and B2B/B2C context.

    Args:
        url: Source URL
        html: Raw HTML content

    Returns:
        PageStructure with all extracted content blocks
    """
    soup = BeautifulSoup(html, 'html.parser')

    # Extract metadata
    title = soup.title.string.strip() if soup.title and soup.title.string else ''

    meta_desc = None
    meta_tag = soup.find('meta', attrs={'name': 'description'})
    if meta_tag and meta_tag.get('content'):
        meta_desc = meta_tag['content']

    og_data = extract_og_data(soup)
    schema_org = extract_schema_org(soup)

    # Extract content blocks
    content_blocks = extract_content_blocks(soup)

    # Detect page type and context
    page_type = detect_page_type(soup, schema_org)
    context = detect_context(soup)

    # Determine extraction quality
    quality = determine_extraction_quality(content_blocks)

    return PageStructure(
        url=url,
        title=title[:500],
        meta_description=meta_desc[:1000] if meta_desc else None,
        og_data=og_data,
        schema_org=schema_org,
        content_blocks=content_blocks,
        detected_page_type=page_type,
        detected_context=context,
        extraction_quality=quality
    )


def scrape_enhanced(url: str, timeout: int = 30000) -> EnhancedScrapeResponse:
    """
    Scrape URL and return enhanced response with full page structure.

    Maintains backward compatibility with legacy fields (title, description, features)
    while adding the new PageStructure with all content blocks.

    Args:
        url: URL to scrape
        timeout: Timeout in milliseconds

    Returns:
        EnhancedScrapeResponse with legacy fields and full structure
    """
    try:
        # Fetch HTML
        html, method = fetch_html(url, timeout=timeout)

        # Extract page structure
        structure = extract_page_structure(url, html)

        # Build legacy fields for backward compatibility
        description = structure.meta_description or ''
        if not description:
            # Try to build from first paragraph
            paragraphs = [b for b in structure.content_blocks if b.block_type == 'paragraph']
            if paragraphs:
                description = paragraphs[0].content[:500]

        # Extract features from lists
        features = []
        for block in structure.content_blocks:
            if block.block_type == 'list' and block.metadata:
                items = block.metadata.get('items', [])
                features.extend(items[:8 - len(features)])
                if len(features) >= 8:
                    break

        return EnhancedScrapeResponse(
            title=structure.title,
            description=description,
            features=features[:8],
            success=True,
            structure=structure
        )

    except Exception as e:
        logger.error(f"Enhanced scrape failed for {url}: {e}")
        return EnhancedScrapeResponse(
            title='',
            description='',
            features=[],
            success=False,
            structure=None
        )
