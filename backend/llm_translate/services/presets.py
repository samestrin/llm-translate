"""
Model presets and the credentials a request brings.

A request names a preset (`X-Model-Preset`) and sends the visitor's own key
(`X-Model-Key`), or sends a demo code (`X-Demo-Code`) that goes to
`DEMO_GATEWAY_URL`. The base URL always comes from `presets.json` or the
environment, never from the request. The key is held only for the request: it
is kept out of every repr, log line and error message.
"""
import json
import re
from dataclasses import dataclass, field, replace
from functools import lru_cache
from pathlib import Path
from typing import Dict, Mapping, Optional

from llm_translate.utils.config import (
    DEFAULT_TTS_FORMATS, DEFAULT_TTS_VOICE, LLMSettings, TTSSettings, load_access_settings, load_llm_settings,
    load_tts_timeout,
)
from llm_translate.utils.exceptions import ErrorType, TranslationError

PRESETS_FILE = Path(__file__).resolve().parent.parent / "presets.json"
DEMO_PRESET = "demo"

# Printable ASCII with no spaces, as API keys are; anything else is refused before it reaches a header.
_CREDENTIAL = re.compile(r"[\x21-\x7e]{1,512}")


@dataclass(frozen=True)
class Preset:
    """One provider: its endpoint and the models for each tier. A None `tts_model` means no speech."""
    id: str
    label: str
    base_url: Optional[str]
    translate_model: Optional[str]
    review_model: Optional[str]
    tts_model: Optional[str]


@lru_cache(maxsize=1)
def load_presets() -> Dict[str, Preset]:
    """The presets in `presets.json`, by id, in file order."""
    data = json.loads(PRESETS_FILE.read_text(encoding="utf-8"))
    return {entry["id"]: Preset(**entry) for entry in data["presets"]}


@dataclass(frozen=True)
class ModelAccess:
    """The preset (with the demo one filled in from the environment) and the visitor's key or demo code."""
    preset: Preset
    api_key: str = field(repr=False)

    def llm_settings(self, env: Optional[Mapping[str, str]] = None) -> LLMSettings:
        """
        Settings for this request: endpoint, key and models from the preset; timeout,
        concurrency, size limits and cache size from the `LLM_*` environment.
        """
        return replace(
            load_llm_settings(env), base_url=self.preset.base_url, api_key=self.api_key,
            translate_model=self.preset.translate_model, review_model=self.preset.review_model,
            provider=self.preset.id, preset=self.preset.id, provider_label=self.preset.label,
        )

    def tts_settings(self, env: Optional[Mapping[str, str]] = None) -> TTSSettings:
        """
        Speech settings for this request: endpoint, key and model from the preset, and
        only `TTS_TIMEOUT` from the environment.

        Raises:
            TranslationError: 400 if the preset has no speech model; nothing falls back to another endpoint.
        """
        if self.preset.tts_model is None:
            raise TranslationError(
                message=f"Speech is not available for {self.preset.label}.",
                error_type=ErrorType.BAD_REQUEST,
                status_code=400,
            )
        return TTSSettings(
            base_url=self.preset.base_url, api_key=self.api_key, model=self.preset.tts_model,
            voice=DEFAULT_TTS_VOICE, formats=DEFAULT_TTS_FORMATS,
            timeout=load_tts_timeout(env),
            provider_label=self.preset.label, preset=self.preset.id,
        )


def _refuse(status_code: int, error_type: ErrorType, message: str) -> TranslationError:
    return TranslationError(message=message, error_type=error_type, status_code=status_code)


def _blank_to_none(value: Optional[str]) -> Optional[str]:
    return value.strip() if value and value.strip() else None


def resolve_access(
    preset: Optional[str] = None, api_key: Optional[str] = None, demo_code: Optional[str] = None,
    env: Optional[Mapping[str, str]] = None,
) -> Optional[ModelAccess]:
    """
    Turn a request's credential headers into the preset and key it may use.

    Args:
        preset (str, optional): `X-Model-Preset`, a preset id (case-insensitive).
        api_key (str, optional): `X-Model-Key`, the visitor's key for that preset.
        demo_code (str, optional): `X-Demo-Code`, sent to `DEMO_GATEWAY_URL` as the key.
        env (Mapping[str, str], optional): Variables to read. Defaults to the process environment.

    Returns:
        ModelAccess, or None when the request sends no credentials and `PUBLIC_DEMO`
        is off: the caller then uses the `LLM_*` and `TTS_*` environment as before.

    Raises:
        TranslationError: 400 for an unknown preset or a credential that cannot be a
            key, or headers that do not go together; 401 when a credential is missing
            (always, without credentials, in the public demo); 503 for a demo code
            when demo codes are not set up. No message repeats the key or code.
        ValueError: If `PUBLIC_DEMO` is not a true/false value.
    """
    access = load_access_settings(env)
    presets = load_presets()
    preset, api_key, demo_code = (_blank_to_none(v) for v in (preset, api_key, demo_code))
    preset = preset.lower() if preset else None

    if preset is None and api_key is None and demo_code is None:
        if access.public_demo:
            raise _refuse(401, ErrorType.AUTHENTICATION,
                          "This public demo needs a demo code or your own API key for a provider.")
        return None
    if preset is not None and preset not in presets:
        raise _refuse(400, ErrorType.INVALID_REQUEST,
                      f"Unknown model preset; use one of {', '.join(presets)}.")
    if api_key is not None and demo_code is not None:
        raise _refuse(400, ErrorType.INVALID_REQUEST, "Send an API key or a demo code, not both.")
    if demo_code is not None and preset not in (None, DEMO_PRESET):
        raise _refuse(400, ErrorType.INVALID_REQUEST, "A demo code goes with the demo preset only.")
    if preset is None and api_key is not None:
        raise _refuse(400, ErrorType.INVALID_REQUEST, "An API key needs a model preset (X-Model-Preset).")
    if preset == DEMO_PRESET and demo_code is None:
        raise _refuse(401, ErrorType.AUTHENTICATION, "Enter a demo code.")
    if preset not in (None, DEMO_PRESET) and api_key is None:
        raise _refuse(401, ErrorType.AUTHENTICATION, f"Enter your {presets[preset].label} API key.")

    credential = demo_code if demo_code is not None else api_key
    if not _CREDENTIAL.fullmatch(credential):
        raise _refuse(400, ErrorType.INVALID_REQUEST,
                      "The API key or demo code has characters or a length an API key cannot have.")

    if demo_code is None:
        return ModelAccess(preset=presets[preset], api_key=credential)
    if access.demo_gateway_url is None or access.demo_translate_model is None:
        raise _refuse(503, ErrorType.SERVICE_UNAVAILABLE, "Demo codes are not set up on this server.")
    demo = replace(
        presets[DEMO_PRESET], base_url=access.demo_gateway_url,
        translate_model=access.demo_translate_model,
        review_model=access.demo_review_model or access.demo_translate_model,
        tts_model=access.demo_tts_model,
    )
    return ModelAccess(preset=demo, api_key=credential)
