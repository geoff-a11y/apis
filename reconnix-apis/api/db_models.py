"""
SQLAlchemy ORM models for APIS benchmark database.
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Text, Index, DateTime
from .database import Base


class BenchmarkEntry(Base):
    """
    Stores scored page results for benchmark database.

    Each URL is unique - rescoring the same URL updates the existing entry.
    """
    __tablename__ = "benchmark_entries"

    id = Column(String(36), primary_key=True)
    url = Column(String(2048), nullable=False, unique=True, index=True)
    domain = Column(String(255), nullable=False, index=True)
    category = Column(String(100), index=True)
    universal_score = Column(Float, nullable=False, index=True)
    extraction_quality = Column(String(20), nullable=False)
    scored_at = Column(String(30), nullable=False)
    signal_inventory_json = Column(Text, nullable=False)  # JSON blob
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Composite indexes for common queries
    __table_args__ = (
        Index('idx_benchmark_category_score', 'category', 'universal_score'),
    )

    def __repr__(self):
        return f"<BenchmarkEntry(url='{self.url[:50]}...', score={self.universal_score})>"

    @staticmethod
    def extract_domain(url: str) -> str:
        """Extract domain from URL."""
        from urllib.parse import urlparse
        parsed = urlparse(url)
        domain = parsed.netloc
        # Remove www. prefix if present
        if domain.startswith("www."):
            domain = domain[4:]
        return domain

    @staticmethod
    def detect_category(url: str, domain: str) -> str:
        """
        Detect category from URL and domain.
        Returns category string or 'other' if unknown.
        """
        url_lower = url.lower()
        domain_lower = domain.lower()

        # B2B SaaS patterns
        b2b_saas_domains = [
            'salesforce', 'hubspot', 'zendesk', 'slack', 'notion', 'asana',
            'monday', 'airtable', 'figma', 'miro', 'linear', 'vercel',
            'supabase', 'planetscale', 'datadog', 'newrelic', 'splunk'
        ]
        if any(d in domain_lower for d in b2b_saas_domains):
            return 'b2b_saas'

        # Enterprise software
        enterprise_domains = ['servicenow', 'workday', 'sap', 'oracle', 'microsoft']
        if any(d in domain_lower for d in enterprise_domains):
            return 'b2b_enterprise_software'

        # Cloud infrastructure
        cloud_domains = ['aws.amazon', 'cloud.google', 'azure', 'digitalocean', 'heroku']
        if any(d in domain_lower for d in cloud_domains):
            return 'b2b_cloud_infrastructure'

        # Telecom
        telecom_domains = ['verizon', 'att.com', 't-mobile', 'sprint', 'xfinity', 'comcast']
        if any(d in domain_lower for d in telecom_domains):
            return 'telecom'

        # Electronics
        electronics_domains = ['apple', 'samsung', 'sony', 'dell', 'hp.com', 'lenovo', 'razer', 'logitech']
        if any(d in domain_lower for d in electronics_domains):
            return 'electronics'

        # Software (consumer)
        if 'github' in domain_lower or 'gitlab' in domain_lower:
            return 'software'

        # E-commerce / retail
        ecommerce_domains = ['amazon', 'walmart', 'target', 'bestbuy', 'costco']
        if any(d in domain_lower for d in ecommerce_domains):
            return 'retail'

        # Financial services
        finance_domains = ['chase', 'bankofamerica', 'wellsfargo', 'fidelity', 'schwab', 'robinhood']
        if any(d in domain_lower for d in finance_domains):
            return 'financial_services_consumer'

        # Healthcare
        healthcare_domains = ['teladoc', 'zocdoc', 'healthgrades', 'webmd']
        if any(d in domain_lower for d in healthcare_domains):
            return 'healthcare_services'

        # Travel
        travel_domains = ['booking', 'expedia', 'kayak', 'airbnb', 'vrbo', 'tripadvisor']
        if any(d in domain_lower for d in travel_domains):
            return 'travel_hospitality'

        # Food/beverage
        food_domains = ['doordash', 'ubereats', 'grubhub', 'instacart', 'soylent', 'huel']
        if any(d in domain_lower for d in food_domains):
            return 'food_beverage'

        # Home goods
        home_domains = ['ikea', 'wayfair', 'williams-sonoma', 'crateandbarrel', 'westelm']
        if any(d in domain_lower for d in home_domains):
            return 'home_goods'

        # Personal care / beauty
        beauty_domains = ['sephora', 'ulta', 'glossier', 'paulaschoice', 'theordinary']
        if any(d in domain_lower for d in beauty_domains):
            return 'personal_care'

        # Apparel
        apparel_domains = ['nike', 'adidas', 'allbirds', 'everlane', 'warbyparker', 'gap']
        if any(d in domain_lower for d in apparel_domains):
            return 'apparel'

        # Default to 'other'
        return 'other'
