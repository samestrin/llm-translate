"""
The shared plain-word errors for model and speech endpoints (epic 08).

Every model route reports a refused key, a used-up or expired demo code and a
provider rate limit with these messages. No upstream body is ever shown or
logged: a provider can echo part of the key or account details in it.
"""
import re
from typing import Optional

import httpx

DEMO_CODE_USED_UP = "This demo code is used up or expired"
DEMO_CODE_BUSY = "This demo code is busy. Try again in a minute."

# A Retry-After worth passing through: delta-seconds, as litellm sends it (it may
# be fractional). Anything else (an HTTP-date, or text echoing a credential) is dropped.
_RETRY_AFTER_SECONDS = re.compile(r"\d{1,6}(\.\d+)?")


def demo_budget_exceeded(response: httpx.Response) -> bool:
    """
    True when a demo gateway's 429 names a spent budget rather than an rpm/tpm limit.

    litellm answers 429 for both. Only its budget markers are read: the
    `budget_exceeded` error type, or "Budget has been exceeded" in the message.
    A rate limit carries neither. The body itself is never shown or logged.
    """
    try:
        body = response.json()
    except ValueError:
        return False
    if not isinstance(body, dict):
        return False
    error = body.get("error")
    if not isinstance(error, dict):
        return False
    if str(error.get("type", "")).lower() == "budget_exceeded":
        return True
    return "budget has been exceeded" in str(error.get("message", "")).lower()


def retry_after_seconds(response: httpx.Response) -> Optional[str]:
    """The upstream Retry-After when it is a number of seconds, else None. Never any other text."""
    value = response.headers.get("retry-after", "").strip()
    return value if _RETRY_AFTER_SECONDS.fullmatch(value) else None


def key_rejected(provider: str) -> str:
    """A key the provider refused (upstream 401 or 403)."""
    return f"The key was rejected by {provider}"


def rate_limited(provider: str) -> str:
    """A provider rate limit (upstream 429). The name starts the sentence, so it is capitalized."""
    name = provider[:1].upper() + provider[1:]
    return f"{name} is rate limiting this key. Try again shortly."
