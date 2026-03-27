"""
Unified async API client for APIS.

Supports all 6 test models and 3 judge models with:
- Per-provider rate limiting
- Cost estimation
- Automatic response persistence
- Retry logic (max 2 retries)
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from scripts.utils.rate_limiter import get_rate_limiter, get_rate_limiter_sync
from scripts.utils.storage import save_response, response_exists

load_dotenv()

# Pricing per 1M tokens (input/output) - update_date for staleness warning
# Last updated: 2025-01-15
PRICING = {
    "update_date": "2025-01-15",
    "openai": {
        "gpt-5.4": {"input": 5.00, "output": 15.00},
        "o3": {"input": 10.00, "output": 40.00},
    },
    "anthropic": {
        "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
        "claude-opus-4-6": {"input": 15.00, "output": 75.00},
    },
    "google": {
        "gemini-3.1-pro": {"input": 1.25, "output": 5.00},
    },
    "together": {
        "meta-llama/Llama-4-Scout": {"input": 0.80, "output": 0.80},
    },
    "perplexity": {
        "sonar-pro": {"input": 3.00, "output": 15.00},
    },
}


def check_pricing_staleness() -> bool:
    """Check if pricing data is older than 60 days."""
    from datetime import datetime, timedelta

    update_date = datetime.strptime(PRICING["update_date"], "%Y-%m-%d")
    days_old = (datetime.now() - update_date).days

    if days_old > 60:
        print(f"WARNING: Pricing data is {days_old} days old. Please update PRICING dict.")
        return True
    return False


def estimate_cost(
    provider: str, model_string: str, prompt_tokens: int, completion_tokens: int
) -> float:
    """Estimate cost in USD for a single API call."""
    provider_pricing = PRICING.get(provider, {})
    model_pricing = provider_pricing.get(model_string, {"input": 5.0, "output": 15.0})

    input_cost = (prompt_tokens / 1_000_000) * model_pricing["input"]
    output_cost = (completion_tokens / 1_000_000) * model_pricing["output"]

    return input_cost + output_cost


def load_models_config() -> Dict[str, Any]:
    """Load models configuration from config/models.json."""
    config_path = Path(__file__).parent.parent.parent / "config" / "models.json"
    with open(config_path, "r") as f:
        return json.load(f)


def get_model_config(model_id: str) -> Dict[str, Any]:
    """Get configuration for a specific model."""
    config = load_models_config()

    # Check test models
    for model in config.get("models", []):
        if model["id"] == model_id:
            return model

    # Check judge models
    for model in config.get("judge_models", []):
        if model["id"] == model_id:
            return model

    raise ValueError(f"Unknown model_id: {model_id}")


async def call_openai(
    model_string: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Call OpenAI API."""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise ImportError("openai package not installed. Run: pip install openai")

    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    start_time = time.time()

    # o-series reasoning models (o1, o3, o4) don't support system prompts or temperature
    if model_string.startswith(("o1", "o3", "o4")):
        response = await client.chat.completions.create(
            model=model_string,
            messages=[
                {"role": "user", "content": f"{system_prompt}\n\n{user_prompt}"},
            ],
            max_completion_tokens=max_tokens,
        )
    else:
        response = await client.chat.completions.create(
            model=model_string,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=temperature,
            max_completion_tokens=max_tokens,
        )
    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "response_text": response.choices[0].message.content,
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "latency_ms": latency_ms,
        "model_string": response.model,
    }


async def call_anthropic(
    model_string: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Call Anthropic API."""
    try:
        from anthropic import AsyncAnthropic
    except ImportError:
        raise ImportError("anthropic package not installed. Run: pip install anthropic")

    client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    start_time = time.time()
    response = await client.messages.create(
        model=model_string,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "response_text": response.content[0].text,
        "prompt_tokens": response.usage.input_tokens,
        "completion_tokens": response.usage.output_tokens,
        "latency_ms": latency_ms,
        "model_string": response.model,
    }


async def call_google(
    model_string: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Call Google Gemini API."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise ImportError(
            "google-generativeai package not installed. Run: pip install google-generativeai"
        )

    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
    model = genai.GenerativeModel(
        model_name=model_string,
        system_instruction=system_prompt,
        generation_config=genai.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        ),
    )

    start_time = time.time()
    response = await asyncio.to_thread(
        model.generate_content, user_prompt
    )
    latency_ms = int((time.time() - start_time) * 1000)

    # Estimate tokens (Gemini doesn't always return exact counts)
    prompt_tokens = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else len(user_prompt) // 4
    completion_tokens = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else len(response.text) // 4

    return {
        "response_text": response.text,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "latency_ms": latency_ms,
        "model_string": model_string,
    }


async def call_together(
    model_string: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Call Together AI API."""
    try:
        from together import AsyncTogether
    except ImportError:
        raise ImportError("together package not installed. Run: pip install together")

    client = AsyncTogether(api_key=os.getenv("TOGETHER_API_KEY"))

    start_time = time.time()
    response = await client.chat.completions.create(
        model=model_string,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "response_text": response.choices[0].message.content,
        "prompt_tokens": response.usage.prompt_tokens,
        "completion_tokens": response.usage.completion_tokens,
        "latency_ms": latency_ms,
        "model_string": model_string,
    }


async def call_perplexity(
    model_string: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Call Perplexity API (OpenAI-compatible)."""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise ImportError("openai package not installed. Run: pip install openai")

    client = AsyncOpenAI(
        api_key=os.getenv("PERPLEXITY_API_KEY"),
        base_url="https://api.perplexity.ai",
    )

    start_time = time.time()
    response = await client.chat.completions.create(
        model=model_string,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    latency_ms = int((time.time() - start_time) * 1000)

    return {
        "response_text": response.choices[0].message.content,
        "prompt_tokens": response.usage.prompt_tokens if response.usage else len(user_prompt) // 4,
        "completion_tokens": response.usage.completion_tokens if response.usage else len(response.choices[0].message.content) // 4,
        "latency_ms": latency_ms,
        "model_string": model_string,
    }


PROVIDER_HANDLERS = {
    "openai": call_openai,
    "anthropic": call_anthropic,
    "google": call_google,
    "together": call_together,
    "perplexity": call_perplexity,
}


async def call_model_multiturn(
    model_id: str,
    system_prompt: str,
    messages: list,
    trial_id: str,
    dry_run: bool = False,
    phase: str = "main",
    dimension_id: str = "unknown",
    save_to_disk: bool = True,
) -> Dict[str, Any]:
    """
    Multi-turn API call supporting conversation history.

    Args:
        model_id: Model identifier from models.json
        system_prompt: System prompt text
        messages: List of {"role": "user"|"assistant", "content": str}
        trial_id: Unique trial identifier for deduplication
        dry_run: If True, return mock response without API call
        phase: Study phase for storage path
        dimension_id: Dimension ID for storage path
        save_to_disk: Whether to save response immediately

    Returns:
        Same as call_model
    """
    config = get_model_config(model_id)
    provider = config["provider"]
    model_string = config["model_string"]
    temperature = config.get("temperature", 0.3)
    max_tokens = config.get("max_tokens", 800)

    # Build base response
    result = {
        "trial_id": trial_id,
        "model_id": model_id,
        "model_string": model_string,
        "provider": provider,
        "prompt_sent": {
            "system": system_prompt,
            "messages": messages,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "error": None,
    }

    if dry_run:
        result.update({
            "response_text": "[DRY RUN] Mock response for testing",
            "prompt_tokens": sum(len(m["content"]) // 4 for m in messages),
            "completion_tokens": 50,
            "cost_usd": 0.0,
            "latency_ms": 0,
            "dry_run": True,
        })
        return result

    # Get rate limiter
    rate_limiter = await get_rate_limiter(provider)

    retries = 0
    max_retries = 2

    while retries <= max_retries:
        try:
            async with rate_limiter:
                response = await _call_multiturn_provider(
                    provider=provider,
                    model_string=model_string,
                    system_prompt=system_prompt,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

            # Merge response into result
            result.update(response)
            result["cost_usd"] = estimate_cost(
                provider,
                model_string,
                response["prompt_tokens"],
                response["completion_tokens"],
            )
            break

        except Exception as e:
            retries += 1
            if retries > max_retries:
                result["error"] = f"{type(e).__name__}: {str(e)}"
                result["response_text"] = None
                result["prompt_tokens"] = 0
                result["completion_tokens"] = 0
                result["cost_usd"] = 0.0
                result["latency_ms"] = 0
            else:
                await asyncio.sleep(2 ** retries)

    # Save to disk if requested
    if save_to_disk:
        try:
            save_response(result, phase, model_id, dimension_id, trial_id)
        except FileExistsError:
            pass

    return result


async def _call_multiturn_provider(
    provider: str,
    model_string: str,
    system_prompt: str,
    messages: list,
    temperature: float,
    max_tokens: int,
) -> Dict[str, Any]:
    """Route multi-turn calls to the appropriate provider."""

    if provider == "openai":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

        start_time = time.time()

        if model_string.startswith(("o1", "o3", "o4")):
            # o-series reasoning models: merge system into first user message, no temperature
            api_messages = []
            for i, m in enumerate(messages):
                if i == 0 and m["role"] == "user":
                    api_messages.append({"role": "user", "content": f"{system_prompt}\n\n{m['content']}"})
                else:
                    api_messages.append(m)
            response = await client.chat.completions.create(
                model=model_string,
                messages=api_messages,
                max_completion_tokens=max_tokens,
            )
        else:
            api_messages = [{"role": "system", "content": system_prompt}] + messages
            response = await client.chat.completions.create(
                model=model_string,
                messages=api_messages,
                temperature=temperature,
                max_completion_tokens=max_tokens,
            )

        latency_ms = int((time.time() - start_time) * 1000)
        return {
            "response_text": response.choices[0].message.content,
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "latency_ms": latency_ms,
            "model_string": response.model,
        }

    elif provider == "anthropic":
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        start_time = time.time()
        response = await client.messages.create(
            model=model_string,
            system=system_prompt,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "response_text": response.content[0].text,
            "prompt_tokens": response.usage.input_tokens,
            "completion_tokens": response.usage.output_tokens,
            "latency_ms": latency_ms,
            "model_string": response.model,
        }

    elif provider == "google":
        import google.generativeai as genai
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        model = genai.GenerativeModel(
            model_name=model_string,
            system_instruction=system_prompt,
            generation_config=genai.GenerationConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )

        # Convert to Gemini format
        history = []
        for m in messages[:-1]:  # All but last
            role = "user" if m["role"] == "user" else "model"
            history.append({"role": role, "parts": [m["content"]]})

        chat = model.start_chat(history=history)

        start_time = time.time()
        response = await asyncio.to_thread(
            chat.send_message, messages[-1]["content"]
        )
        latency_ms = int((time.time() - start_time) * 1000)

        prompt_tokens = response.usage_metadata.prompt_token_count if hasattr(response, 'usage_metadata') else sum(len(m["content"]) // 4 for m in messages)
        completion_tokens = response.usage_metadata.candidates_token_count if hasattr(response, 'usage_metadata') else len(response.text) // 4

        return {
            "response_text": response.text,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "latency_ms": latency_ms,
            "model_string": model_string,
        }

    elif provider == "together":
        from together import AsyncTogether
        client = AsyncTogether(api_key=os.getenv("TOGETHER_API_KEY"))

        api_messages = [{"role": "system", "content": system_prompt}] + messages

        start_time = time.time()
        response = await client.chat.completions.create(
            model=model_string,
            messages=api_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "response_text": response.choices[0].message.content,
            "prompt_tokens": response.usage.prompt_tokens,
            "completion_tokens": response.usage.completion_tokens,
            "latency_ms": latency_ms,
            "model_string": model_string,
        }

    elif provider == "perplexity":
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=os.getenv("PERPLEXITY_API_KEY"),
            base_url="https://api.perplexity.ai",
        )

        api_messages = [{"role": "system", "content": system_prompt}] + messages

        start_time = time.time()
        response = await client.chat.completions.create(
            model=model_string,
            messages=api_messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        latency_ms = int((time.time() - start_time) * 1000)

        return {
            "response_text": response.choices[0].message.content,
            "prompt_tokens": response.usage.prompt_tokens if response.usage else sum(len(m["content"]) // 4 for m in messages),
            "completion_tokens": response.usage.completion_tokens if response.usage else len(response.choices[0].message.content) // 4,
            "latency_ms": latency_ms,
            "model_string": model_string,
        }

    else:
        raise ValueError(f"Unknown provider: {provider}")


async def call_model(
    model_id: str,
    system_prompt: str,
    user_prompt: str,
    trial_id: str,
    dry_run: bool = False,
    phase: str = "main",
    dimension_id: str = "unknown",
    save_to_disk: bool = True,
) -> Dict[str, Any]:
    """
    Unified API call with rate limiting, cost tracking, and persistence.

    Args:
        model_id: Model identifier from models.json
        system_prompt: System prompt text
        user_prompt: User prompt text
        trial_id: Unique trial identifier for deduplication
        dry_run: If True, return mock response without API call
        phase: Study phase for storage path
        dimension_id: Dimension ID for storage path
        save_to_disk: Whether to save response immediately

    Returns:
        {
            "trial_id": str,
            "model_id": str,
            "model_string": str,
            "response_text": str,
            "prompt_tokens": int,
            "completion_tokens": int,
            "cost_usd": float,
            "latency_ms": int,
            "timestamp": str,
            "error": str | None
        }
    """
    config = get_model_config(model_id)
    provider = config["provider"]
    model_string = config["model_string"]
    temperature = config.get("temperature", 0.3)
    max_tokens = config.get("max_tokens", 800)

    # Build base response
    result = {
        "trial_id": trial_id,
        "model_id": model_id,
        "model_string": model_string,
        "provider": provider,
        "prompt_sent": {
            "system": system_prompt,
            "user": user_prompt,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "error": None,
    }

    if dry_run:
        result.update({
            "response_text": "[DRY RUN] Mock response for testing",
            "prompt_tokens": len(user_prompt) // 4,
            "completion_tokens": 50,
            "cost_usd": 0.0,
            "latency_ms": 0,
            "dry_run": True,
        })
        return result

    # Get rate limiter and make call
    rate_limiter = await get_rate_limiter(provider)
    handler = PROVIDER_HANDLERS.get(provider)

    if handler is None:
        result["error"] = f"Unknown provider: {provider}"
        return result

    retries = 0
    max_retries = 2

    while retries <= max_retries:
        try:
            async with rate_limiter:
                response = await handler(
                    model_string=model_string,
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

            # Merge response into result
            result.update(response)
            result["cost_usd"] = estimate_cost(
                provider,
                model_string,
                response["prompt_tokens"],
                response["completion_tokens"],
            )
            break

        except Exception as e:
            retries += 1
            if retries > max_retries:
                result["error"] = f"{type(e).__name__}: {str(e)}"
                result["response_text"] = None
                result["prompt_tokens"] = 0
                result["completion_tokens"] = 0
                result["cost_usd"] = 0.0
                result["latency_ms"] = 0
            else:
                # Wait before retry
                await asyncio.sleep(2 ** retries)

    # Save to disk if requested
    if save_to_disk:
        try:
            save_response(result, phase, model_id, dimension_id, trial_id)
        except FileExistsError:
            pass  # Already saved (resumability)

    return result


async def test_model(model_id: str) -> Dict[str, Any]:
    """Test a single model with a hello world call."""
    result = await call_model(
        model_id=model_id,
        system_prompt="You are a helpful assistant.",
        user_prompt="Say 'Hello, APIS!' and nothing else.",
        trial_id=f"test_{model_id}_{int(time.time())}",
        save_to_disk=False,
    )
    return result


async def test_all_models() -> Dict[str, Any]:
    """Test all models with hello world calls."""
    config = load_models_config()

    results = {"models": {}, "judges": {}, "all_passed": True}

    # Check pricing staleness
    if check_pricing_staleness():
        results["pricing_warning"] = "Pricing data may be stale"

    # Test all test models
    print("\nTesting test models...")
    for model in config.get("models", []):
        model_id = model["id"]
        print(f"  Testing {model_id}...", end=" ", flush=True)

        try:
            result = await test_model(model_id)
            if result["error"]:
                print(f"FAILED: {result['error']}")
                results["models"][model_id] = {"status": "failed", "error": result["error"]}
                results["all_passed"] = False
            else:
                print(f"OK ({result['latency_ms']}ms, ${result['cost_usd']:.4f})")
                results["models"][model_id] = {
                    "status": "passed",
                    "latency_ms": result["latency_ms"],
                    "cost_usd": result["cost_usd"],
                }
        except Exception as e:
            print(f"FAILED: {e}")
            results["models"][model_id] = {"status": "failed", "error": str(e)}
            results["all_passed"] = False

    # Test judge models
    print("\nTesting judge models...")
    for model in config.get("judge_models", []):
        model_id = model["id"]
        print(f"  Testing {model_id}...", end=" ", flush=True)

        try:
            result = await test_model(model_id)
            if result["error"]:
                print(f"FAILED: {result['error']}")
                results["judges"][model_id] = {"status": "failed", "error": result["error"]}
                results["all_passed"] = False
            else:
                print(f"OK ({result['latency_ms']}ms, ${result['cost_usd']:.4f})")
                results["judges"][model_id] = {
                    "status": "passed",
                    "latency_ms": result["latency_ms"],
                    "cost_usd": result["cost_usd"],
                }
        except Exception as e:
            print(f"FAILED: {e}")
            results["judges"][model_id] = {"status": "failed", "error": str(e)}
            results["all_passed"] = False

    return results


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="APIS API Client")
    parser.add_argument(
        "--test-all",
        action="store_true",
        help="Test all models with hello world calls",
    )
    parser.add_argument(
        "--test",
        type=str,
        help="Test a specific model by ID",
    )

    args = parser.parse_args()

    if args.test_all:
        print("APIS API Client - Testing all models")
        print("=" * 50)
        results = asyncio.run(test_all_models())
        print("\n" + "=" * 50)
        if results["all_passed"]:
            print("All models passed!")
            sys.exit(0)
        else:
            print("Some models failed. Check output above.")
            sys.exit(1)

    if args.test:
        print(f"Testing model: {args.test}")
        result = asyncio.run(test_model(args.test))
        print(json.dumps(result, indent=2, default=str))
        sys.exit(0 if not result["error"] else 1)

    parser.print_help()


if __name__ == "__main__":
    main()
