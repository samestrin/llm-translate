"""
The shared plain-word errors for model and speech endpoints (epic 08).

Every model route reports a refused key, a used-up or expired demo code and a
provider rate limit with these messages. No upstream body is ever shown or
logged: a provider can echo part of the key or account details in it.
"""

DEMO_CODE_USED_UP = "This demo code is used up or expired"


def key_rejected(provider: str) -> str:
    """A key the provider refused (upstream 401 or 403)."""
    return f"The key was rejected by {provider}"


def rate_limited(provider: str) -> str:
    """A provider rate limit (upstream 429)."""
    return f"{provider} is rate limiting this key. Try again shortly."
