"""
Configuration loading module for llm-translate.
Loads environment variables from .env file.
"""
import math
import os
from dataclasses import dataclass, field
from typing import Dict, Any, Mapping, Optional, Tuple
from dotenv import load_dotenv


# Old vendor env vars, kept working as data: `AI_SOURCE` picks a row, and the
# row says which base URL, key variable and model variable stand in for the
# `LLM_*` contract when an `LLM_*` variable is not set.
LEGACY_PROVIDERS: Dict[str, Dict[str, str]] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "api_key_var": "OPENAI_API_KEY",
        "model_var": "OPENAI_MODEL",
        "default_model": "gpt-4.1-mini-2025-04-14",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_var": "GROQ_API_KEY",
        "model_var": "GROQ_MODEL",
        "default_model": "meta-llama/llama-4-maverick-17b-128e-instruct",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "api_key_var": "OPENROUTER_API_KEY",
        "model_var": "OPENROUTER_MODEL",
        "default_model": "qwen/qwen3-4b:free",
    },
}

DEFAULT_LEGACY_PROVIDER = "openai"
DEFAULT_TIMEOUT = 60.0
DEFAULT_MAX_CONCURRENCY = 4
DEFAULT_SEGMENT_MAX_CHARS = 4000
DEFAULT_MAX_SEGMENTS = 50
DEFAULT_SRT_MAX_LINE_CHARS = 42


@dataclass(frozen=True)
class LLMSettings:
    """
    Settings for the OpenAI-compatible model client.

    Attributes:
        base_url (str): Endpoint base URL, e.g. "https://api.openai.com/v1".
        api_key (str, optional): Bearer key; None for endpoints that need none.
        translate_model (str): Model for the `translate` tier.
        review_model (str): Model for the `review` tier.
        timeout (float): Per-request timeout in seconds.
        max_concurrency (int): Most requests in flight at once.
        srt_max_line_chars (int): Longest subtitle line; a longer translated cue is re-wrapped to it.
        provider (str): Legacy `AI_SOURCE` name, or "custom" when `LLM_BASE_URL` is set.
        extra_headers (Dict[str, str]): Extra request headers (OpenRouter attribution).
        segment_max_chars (int): Longest segment a document is split into, in characters.
        max_segments (int): Most segments one document may have.
    """
    base_url: str
    api_key: Optional[str] = field(repr=False)
    translate_model: str
    review_model: str
    timeout: float
    max_concurrency: int
    provider: str
    extra_headers: Dict[str, str] = field(default_factory=dict)
    segment_max_chars: int = DEFAULT_SEGMENT_MAX_CHARS
    max_segments: int = DEFAULT_MAX_SEGMENTS
    srt_max_line_chars: int = DEFAULT_SRT_MAX_LINE_CHARS


def _env_value(env: Mapping[str, str], name: str) -> Optional[str]:
    """Return a stripped env value, treating empty strings as unset."""
    value = env.get(name)
    if value is None or not value.strip():
        return None
    return value.strip()


def _positive_float(env: Mapping[str, str], name: str, default: float) -> float:
    raw = _env_value(env, name)
    if raw is None:
        return default
    try:
        value = float(raw)
    except ValueError:
        value = math.nan
    if not math.isfinite(value) or value <= 0:
        raise ValueError(f"{name} must be a positive number of seconds, got {raw!r}")
    return value


def _positive_int(env: Mapping[str, str], name: str, default: int) -> int:
    raw = _env_value(env, name)
    if raw is None:
        return default
    try:
        value = int(raw)
    except ValueError:
        value = 0
    if value < 1:
        raise ValueError(f"{name} must be a whole number of at least 1, got {raw!r}")
    return value


def load_llm_settings(env: Optional[Mapping[str, str]] = None) -> LLMSettings:
    """
    Resolve the model-layer settings from the environment.

    `LLM_*` variables win. Anything they leave unset falls back to the legacy
    vendor row picked by `AI_SOURCE` (default "openai"), see `LEGACY_PROVIDERS`.

    Args:
        env (Mapping[str, str], optional): Variables to read. Defaults to the
            process environment after loading `.env`.

    Returns:
        LLMSettings: Resolved settings.

    Raises:
        ValueError: If `AI_SOURCE` names an unknown vendor, `LLM_TIMEOUT` is not a
            positive number, or `LLM_MAX_CONCURRENCY`, `LLM_SEGMENT_MAX_CHARS` or
            `LLM_MAX_SEGMENTS` or `LLM_SRT_MAX_LINE_CHARS` is not a whole number of at least 1.
    """
    if env is None:
        load_dotenv()
        env = os.environ

    source = (_env_value(env, "AI_SOURCE") or DEFAULT_LEGACY_PROVIDER).lower()
    if source not in LEGACY_PROVIDERS:
        known = ", ".join(sorted(LEGACY_PROVIDERS))
        raise ValueError(
            f"Unsupported AI service provider (AI_SOURCE) {source!r}; use one of {known}, "
            f"or set LLM_BASE_URL and unset AI_SOURCE"
        )
    legacy = LEGACY_PROVIDERS[source]

    base_url = _env_value(env, "LLM_BASE_URL")
    translate_model = (
        _env_value(env, "LLM_TRANSLATE_MODEL")
        or _env_value(env, legacy["model_var"])
        or legacy["default_model"]
    )

    extra_headers = {}
    site_url = _env_value(env, "SITE_URL")
    site_name = _env_value(env, "SITE_NAME")
    if site_url:
        extra_headers["HTTP-Referer"] = site_url
    if site_name:
        extra_headers["X-Title"] = site_name

    return LLMSettings(
        base_url=base_url or legacy["base_url"],
        api_key=_env_value(env, "LLM_API_KEY") or _env_value(env, legacy["api_key_var"]),
        translate_model=translate_model,
        review_model=_env_value(env, "LLM_REVIEW_MODEL") or translate_model,
        timeout=_positive_float(env, "LLM_TIMEOUT", DEFAULT_TIMEOUT),
        max_concurrency=_positive_int(env, "LLM_MAX_CONCURRENCY", DEFAULT_MAX_CONCURRENCY),
        provider="custom" if base_url else source,
        extra_headers=extra_headers,
        segment_max_chars=_positive_int(env, "LLM_SEGMENT_MAX_CHARS", DEFAULT_SEGMENT_MAX_CHARS),
        max_segments=_positive_int(env, "LLM_MAX_SEGMENTS", DEFAULT_MAX_SEGMENTS),
        srt_max_line_chars=_positive_int(env, "LLM_SRT_MAX_LINE_CHARS", DEFAULT_SRT_MAX_LINE_CHARS),
    )


# Old `TTS_SOURCE` vendors, used only when `TTS_SOURCE` is set and the matching
# `TTS_*` variable is not. Without `TTS_SOURCE` the speech client shares the
# `LLM_*` endpoint and key.
LEGACY_TTS_PROVIDERS: Dict[str, Dict[str, Any]] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "api_key_var": "OPENAI_API_KEY",
        "voice": "alloy",
        "formats": ("mp3", "opus", "aac", "flac", "wav"),
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "api_key_var": "GROQ_API_KEY",
        "voice": "Fritz-PlayAI",
        "formats": ("wav",),
    },
}

DEFAULT_TTS_MODEL = "gpt-4o-mini-tts"
DEFAULT_TTS_VOICE = "alloy"
DEFAULT_TTS_FORMATS = ("mp3", "opus", "aac", "flac", "wav")
DEFAULT_TTS_TIMEOUT = 60.0


@dataclass(frozen=True)
class TTSSettings:
    """
    Settings for the OpenAI-compatible text-to-speech client.

    Attributes:
        base_url (str): Endpoint base URL; the client posts to `{base_url}/audio/speech`.
        api_key (str, optional): Bearer key; None for endpoints that need none.
        model (str): TTS model name.
        voice (str): Voice used when a request names none.
        formats (Tuple[str, ...]): Formats the endpoint returns itself, preferred first.
            Any other requested format is converted from the first one.
        timeout (float): Per-request timeout in seconds.
        extra_headers (Dict[str, str]): Extra request headers.
    """
    base_url: str
    api_key: Optional[str] = field(repr=False)
    model: str
    voice: str
    formats: Tuple[str, ...]
    timeout: float
    extra_headers: Dict[str, str] = field(default_factory=dict)


def load_tts_settings(env: Optional[Mapping[str, str]] = None) -> TTSSettings:
    """
    Resolve the text-to-speech settings from the environment.

    `TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMATS`
    (comma list of formats the endpoint returns natively) and `TTS_TIMEOUT`
    win. Unset base URL and key fall back to the legacy `TTS_SOURCE` vendor if
    one is set, otherwise to the `LLM_*` endpoint and key.

    Args:
        env (Mapping[str, str], optional): Variables to read. Defaults to the
            process environment after loading `.env`.

    Raises:
        ValueError: If `TTS_SOURCE` names an unknown vendor, `TTS_TIMEOUT` is not
            a positive number, or `TTS_FORMATS` is empty.
    """
    if env is None:
        load_dotenv()
        env = os.environ

    source = _env_value(env, "TTS_SOURCE")
    legacy: Optional[Dict[str, Any]] = None
    if source:
        source = source.lower()
        if source not in LEGACY_TTS_PROVIDERS:
            known = ", ".join(sorted(LEGACY_TTS_PROVIDERS))
            raise ValueError(
                f"Unsupported TTS service provider (TTS_SOURCE) {source!r}; use one of {known}, "
                f"or set TTS_BASE_URL and unset TTS_SOURCE"
            )
        legacy = LEGACY_TTS_PROVIDERS[source]

    llm = load_llm_settings(env) if legacy is None else None
    base_url = _env_value(env, "TTS_BASE_URL") or (legacy["base_url"] if legacy else llm.base_url)
    api_key = _env_value(env, "TTS_API_KEY") or (
        _env_value(env, legacy["api_key_var"]) if legacy else llm.api_key
    )

    raw_formats = _env_value(env, "TTS_FORMATS")
    if raw_formats is not None:
        formats = tuple(f.strip().lower() for f in raw_formats.split(",") if f.strip())
        if not formats:
            raise ValueError(f"TTS_FORMATS must list at least one format, got {raw_formats!r}")
    else:
        formats = tuple(legacy["formats"]) if legacy else DEFAULT_TTS_FORMATS

    return TTSSettings(
        base_url=base_url,
        api_key=api_key,
        model=_env_value(env, "TTS_MODEL") or DEFAULT_TTS_MODEL,
        voice=_env_value(env, "TTS_VOICE") or (legacy["voice"] if legacy else DEFAULT_TTS_VOICE),
        formats=formats,
        timeout=_positive_float(env, "TTS_TIMEOUT", DEFAULT_TTS_TIMEOUT),
        extra_headers=dict(llm.extra_headers) if llm else {},
    )


def load_config() -> Dict[str, Any]:
    """
    Load configuration from .env file.
    
    Returns:
        Dict[str, Any]: Dictionary containing configuration values.
    """
    # Load environment variables from .env file
    load_dotenv()
    
    # Create configuration dictionary
    config = {
        "AI_SOURCE": os.getenv("AI_SOURCE", "openai"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "OPENAI_MODEL": os.getenv("OPENAI_MODEL", "gpt-4.1-mini-2025-04-14"),
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
        "GROQ_MODEL": os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct"),
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
        "OPENROUTER_MODEL": os.getenv("OPENROUTER_MODEL", "qwen/qwen3-4b:free"),
        "TTS_SOURCE": os.getenv("TTS_SOURCE", "openai"),
        "TTS_MODEL": os.getenv("TTS_MODEL", "gpt-4o-mini-tts"),
        "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
    }
    
    return config


def get_config_value(key: str, default: Optional[Any] = None) -> Any:
    """
    Get a specific configuration value.
    
    Args:
        key (str): Configuration key.
        default (Any, optional): Default value if key is not found. Defaults to None.
        
    Returns:
        Any: Configuration value.
    """
    config = load_config()
    return config.get(key, default)