"""
Per-provider rate limiting for APIS API calls.

Rate limits (requests per minute):
- OpenAI: 500 RPM
- Anthropic: 50 RPM
- Google: 60 RPM
- Together AI: 100 RPM
- Perplexity: 20 RPM
"""

import asyncio
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional

# Rate limits per provider (requests per minute)
RATE_LIMITS: Dict[str, int] = {
    "openai": 500,
    "anthropic": 50,
    "google": 60,
    "together": 100,
    "perplexity": 20,
}

# Concurrency limits per provider
CONCURRENCY_LIMITS: Dict[str, int] = {
    "openai": 20,
    "anthropic": 5,
    "google": 10,
    "together": 10,
    "perplexity": 5,
}


@dataclass
class RateLimiter:
    """Token bucket rate limiter with sliding window."""

    provider: str
    rpm_limit: int = field(default=60)
    concurrency_limit: int = field(default=5)

    # Internal state
    _request_times: list = field(default_factory=list, repr=False)
    _semaphore: Optional[asyncio.Semaphore] = field(default=None, repr=False)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False)

    def __post_init__(self):
        self._semaphore = asyncio.Semaphore(self.concurrency_limit)

    async def acquire(self) -> None:
        """Wait until we can make a request within rate limits."""
        async with self._lock:
            now = time.time()
            window_start = now - 60.0  # 1 minute window

            # Remove old request times outside the window
            self._request_times = [
                t for t in self._request_times if t > window_start
            ]

            # If we're at the limit, wait
            if len(self._request_times) >= self.rpm_limit:
                # Wait until the oldest request falls out of the window
                oldest = self._request_times[0]
                wait_time = oldest - window_start + 0.1  # Add small buffer
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                    # Re-clean after waiting
                    now = time.time()
                    window_start = now - 60.0
                    self._request_times = [
                        t for t in self._request_times if t > window_start
                    ]

            # Record this request
            self._request_times.append(time.time())

    async def __aenter__(self):
        """Context manager entry - acquire rate limit and semaphore."""
        await self.acquire()
        await self._semaphore.acquire()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - release semaphore."""
        self._semaphore.release()
        return False

    @property
    def current_usage(self) -> int:
        """Current number of requests in the sliding window."""
        now = time.time()
        window_start = now - 60.0
        return len([t for t in self._request_times if t > window_start])

    @property
    def available_capacity(self) -> int:
        """Number of requests available before hitting rate limit."""
        return max(0, self.rpm_limit - self.current_usage)


# Global rate limiters per provider
_rate_limiters: Dict[str, RateLimiter] = {}
_init_lock = asyncio.Lock()


async def get_rate_limiter(provider: str) -> RateLimiter:
    """Get or create a rate limiter for a provider."""
    global _rate_limiters

    if provider not in _rate_limiters:
        async with _init_lock:
            # Double-check after acquiring lock
            if provider not in _rate_limiters:
                rpm = RATE_LIMITS.get(provider, 60)
                concurrency = CONCURRENCY_LIMITS.get(provider, 5)
                _rate_limiters[provider] = RateLimiter(
                    provider=provider,
                    rpm_limit=rpm,
                    concurrency_limit=concurrency,
                )

    return _rate_limiters[provider]


def get_rate_limiter_sync(provider: str) -> RateLimiter:
    """Synchronous version for initialization."""
    global _rate_limiters

    if provider not in _rate_limiters:
        rpm = RATE_LIMITS.get(provider, 60)
        concurrency = CONCURRENCY_LIMITS.get(provider, 5)
        _rate_limiters[provider] = RateLimiter(
            provider=provider,
            rpm_limit=rpm,
            concurrency_limit=concurrency,
        )

    return _rate_limiters[provider]


def reset_all_limiters() -> None:
    """Reset all rate limiters (useful for testing)."""
    global _rate_limiters
    _rate_limiters = {}


if __name__ == "__main__":
    # Test the rate limiter
    async def test():
        limiter = await get_rate_limiter("anthropic")
        print(f"Provider: {limiter.provider}")
        print(f"RPM Limit: {limiter.rpm_limit}")
        print(f"Concurrency: {limiter.concurrency_limit}")
        print(f"Current usage: {limiter.current_usage}")
        print(f"Available: {limiter.available_capacity}")

        # Test acquiring
        async with limiter:
            print("Acquired rate limit slot")

        print(f"After acquire - usage: {limiter.current_usage}")

    asyncio.run(test())
