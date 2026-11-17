"""
Presets and per-request credentials: the presets file, and turning the request's
`X-Model-Preset`, `X-Model-Key` and `X-Demo-Code` into settings.
"""
import json
from unittest.mock import patch

import pytest

from llm_translate.services.presets import (
    DEMO_PRESET, PRESETS_FILE, ModelAccess, load_presets, resolve_access,
)
from llm_translate.utils.config import load_access_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError

KEY = "sk-test-PLANTED-0123456789"
CODE = "demo-PLANTED-code-42"
DEMO_ENV = {
    "DEMO_GATEWAY_URL": "http://gateway.internal:4000/v1",
    "DEMO_TRANSLATE_MODEL": "demo-translate",
    "DEMO_REVIEW_MODEL": "demo-review",
    "DEMO_TTS_MODEL": "demo-tts",
}


def _error(env=None, **headers) -> TranslationError:
    with pytest.raises(TranslationError) as raised:
        resolve_access(env=env or {}, **headers)
    return raised.value


# The presets file

def test_presets_file_lists_the_allowlisted_ids():
    assert list(load_presets()) == ["openai", "openrouter", "synthetic", "alibaba", "demo"]


def test_every_provider_preset_has_an_https_base_url_and_models():
    for preset in load_presets().values():
        if preset.id == DEMO_PRESET:
            continue
        assert preset.base_url.startswith("https://"), preset.id
        assert preset.translate_model and preset.review_model and preset.label, preset.id


def test_speech_only_where_the_provider_has_it():
    assert {p.id: p.tts_model for p in load_presets().values() if p.id != DEMO_PRESET} == {
        "openai": "gpt-4o-mini-tts", "openrouter": None, "synthetic": None, "alibaba": None,
    }


def test_the_demo_preset_takes_nothing_from_the_file():
    demo = load_presets()[DEMO_PRESET]

    assert (demo.base_url, demo.translate_model, demo.review_model, demo.tts_model) == (None, None, None, None)


def test_presets_file_holds_no_credentials():
    text = PRESETS_FILE.read_text().lower()

    assert "key" not in text and "token" not in text and "secret" not in text
    assert all(set(p) == {"id", "label", "base_url", "translate_model", "review_model", "tts_model"}
               for p in json.loads(text)["presets"])


# PUBLIC_DEMO

@pytest.mark.parametrize("value,expected", [
    (None, False), ("", False), ("false", False), ("0", False), ("no", False), ("off", False),
    ("true", True), ("TRUE", True), ("1", True), ("yes", True), ("on", True),
])
def test_public_demo_values(value, expected):
    env = {} if value is None else {"PUBLIC_DEMO": value}

    assert load_access_settings(env).public_demo is expected


def test_a_misspelled_public_demo_is_an_error_not_off():
    with pytest.raises(ValueError, match="PUBLIC_DEMO"):
        load_access_settings({"PUBLIC_DEMO": "ture"})


def test_access_settings_read_the_demo_variables():
    settings = load_access_settings({**DEMO_ENV, "DEMO_TTS_MODEL": "  "})

    assert settings.demo_gateway_url == "http://gateway.internal:4000/v1"
    assert settings.demo_translate_model == "demo-translate"
    assert settings.demo_review_model == "demo-review"
    assert settings.demo_tts_model is None


def test_access_settings_read_the_process_environment_by_default(monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO", "true")
    with patch("llm_translate.utils.config.load_dotenv") as load_dotenv:
        assert load_access_settings().public_demo is True
    load_dotenv.assert_called_once()


# No credentials

def test_no_credentials_outside_the_public_demo_means_the_env_endpoint():
    assert resolve_access(env={}) is None


def test_no_credentials_in_the_public_demo_is_refused():
    error = _error(env={"PUBLIC_DEMO": "true", "LLM_API_KEY": "env-key"})

    assert (error.status_code, error.error_type) == (401, ErrorType.AUTHENTICATION)
    assert "demo code" in error.message and "API key" in error.message


def test_blank_headers_count_as_absent():
    error = _error(env={"PUBLIC_DEMO": "true"}, preset="  ", api_key="", demo_code=" ")

    assert error.status_code == 401


# A preset and a key

def test_a_preset_and_a_key_give_that_preset():
    access = resolve_access(preset="openrouter", api_key=KEY, env={"PUBLIC_DEMO": "true"})

    assert access.preset.id == "openrouter"
    assert access.preset.base_url == "https://openrouter.ai/api/v1"
    assert access.api_key == KEY


def test_the_preset_id_is_case_insensitive():
    assert resolve_access(preset=" OpenAI ", api_key=KEY, env={}).preset.id == "openai"


def test_an_unknown_preset_is_a_400_that_lists_the_known_ones():
    error = _error(preset="http://169.254.169.254/v1", api_key=KEY)

    assert (error.status_code, error.error_type) == (400, ErrorType.INVALID_REQUEST)
    assert "169.254" not in error.message
    assert "openai" in error.message and "demo" in error.message


def test_a_preset_without_a_key_names_the_provider():
    error = _error(preset="synthetic")

    assert (error.status_code, error.error_type) == (401, ErrorType.AUTHENTICATION)
    assert "Synthetic" in error.message


def test_a_key_without_a_preset_is_a_400():
    error = _error(api_key=KEY)

    assert error.status_code == 400
    assert KEY not in error.message


@pytest.mark.parametrize("bad", ["sk-with space", "sk-été", "x" * 513])
def test_a_key_an_api_key_cannot_be_is_a_400_that_does_not_echo_it(bad):
    error = _error(preset="openai", api_key=bad)

    assert error.status_code == 400
    assert bad not in error.message and error.original_exception is None


def test_the_key_is_kept_out_of_repr():
    access = resolve_access(preset="openai", api_key=KEY, env={})

    assert KEY not in repr(access)
    assert KEY not in repr(access.llm_settings({})) and KEY not in repr(access.tts_settings({}))


# A demo code

def test_a_demo_code_goes_to_the_demo_gateway_with_the_demo_models():
    access = resolve_access(demo_code=CODE, env={**DEMO_ENV, "PUBLIC_DEMO": "true"})

    assert access.preset.id == DEMO_PRESET
    assert access.preset.base_url == "http://gateway.internal:4000/v1"
    assert (access.preset.translate_model, access.preset.review_model, access.preset.tts_model) == (
        "demo-translate", "demo-review", "demo-tts")
    assert access.api_key == CODE


def test_a_demo_code_may_name_the_demo_preset():
    assert resolve_access(preset="demo", demo_code=CODE, env=DEMO_ENV).preset.id == DEMO_PRESET


def test_the_demo_review_model_defaults_to_the_translate_model():
    env = {**DEMO_ENV, "DEMO_REVIEW_MODEL": ""}

    assert resolve_access(demo_code=CODE, env=env).preset.review_model == "demo-translate"


def test_an_empty_demo_tts_model_means_no_speech_for_demo():
    access = resolve_access(demo_code=CODE, env={**DEMO_ENV, "DEMO_TTS_MODEL": ""})

    assert access.preset.tts_model is None


def test_the_demo_preset_needs_a_demo_code_not_a_key():
    error = _error(env=DEMO_ENV, preset="demo", api_key=KEY)

    assert error.status_code == 401
    assert "demo code" in error.message


def test_a_demo_code_with_another_preset_is_a_400():
    error = _error(env=DEMO_ENV, preset="openai", demo_code=CODE)

    assert error.status_code == 400
    assert CODE not in error.message


@pytest.mark.parametrize("preset", ["openai", "demo", None])
def test_a_key_and_a_demo_code_together_is_a_400(preset):
    error = _error(env=DEMO_ENV, preset=preset, api_key=KEY, demo_code=CODE)

    assert error.status_code == 400
    assert "not both" in error.message
    assert KEY not in error.message and CODE not in error.message


@pytest.mark.parametrize("missing", ["DEMO_GATEWAY_URL", "DEMO_TRANSLATE_MODEL"])
def test_demo_codes_without_the_gateway_set_up_are_a_503(missing):
    error = _error(env={**DEMO_ENV, missing: ""}, demo_code=CODE)

    assert (error.status_code, error.error_type) == (503, ErrorType.SERVICE_UNAVAILABLE)
    assert CODE not in error.message


# Settings for one request

def test_llm_settings_take_endpoint_key_and_models_from_the_preset_and_limits_from_the_env():
    env = {"LLM_BASE_URL": "http://env.local/v1", "LLM_API_KEY": "env-key", "LLM_TRANSLATE_MODEL": "env-model",
           "LLM_TIMEOUT": "7", "LLM_CACHE_SIZE": "3", "LLM_MAX_SEGMENTS": "9"}

    settings = resolve_access(preset="openai", api_key=KEY, env=env).llm_settings(env)

    assert settings.base_url == "https://api.openai.com/v1"
    assert settings.api_key == KEY
    assert (settings.translate_model, settings.review_model) == ("gpt-5-nano", "gpt-5-nano")
    assert (settings.timeout, settings.cache_size, settings.max_segments) == (7.0, 3, 9)
    assert settings.preset == "openai"


def test_env_settings_name_the_env_preset():
    from llm_translate.utils.config import load_llm_settings

    assert load_llm_settings({}).preset == "env"


def test_tts_settings_take_endpoint_key_and_model_from_the_preset_never_the_tts_env():
    env = {"TTS_BASE_URL": "http://tts.local/v1", "TTS_API_KEY": "env-tts-key", "TTS_MODEL": "env-tts",
           "TTS_VOICE": "env-voice", "TTS_FORMATS": "wav", "TTS_TIMEOUT": "5"}

    settings = resolve_access(preset="openai", api_key=KEY, env=env).tts_settings(env)

    assert settings.base_url == "https://api.openai.com/v1"
    assert settings.api_key == KEY
    assert settings.model == "gpt-4o-mini-tts"
    assert settings.voice == "alloy" and settings.voice_set is False
    assert settings.formats == ("mp3", "opus", "aac", "flac", "wav")
    assert settings.timeout == 5.0


def test_tts_settings_for_a_demo_code_use_the_demo_tts_model():
    access = resolve_access(demo_code=CODE, env=DEMO_ENV)

    settings = access.tts_settings(DEMO_ENV)

    assert (settings.base_url, settings.model, settings.api_key) == (
        "http://gateway.internal:4000/v1", "demo-tts", CODE)


def test_speech_for_a_preset_without_a_speech_model_is_a_400_with_no_fallback():
    access = resolve_access(preset="openrouter", api_key=KEY, env={})

    with pytest.raises(TranslationError) as raised:
        access.tts_settings({"TTS_BASE_URL": "http://tts.local/v1"})

    assert raised.value.status_code == 400
    assert raised.value.error_type == ErrorType.SPEECH_NOT_AVAILABLE
    assert "OpenRouter" in raised.value.message


def test_model_access_reads_the_process_environment_by_default(monkeypatch):
    monkeypatch.setenv("LLM_TIMEOUT", "11")
    monkeypatch.setenv("TTS_TIMEOUT", "12")
    access = ModelAccess(preset=load_presets()["openai"], api_key=KEY)
    with patch("llm_translate.utils.config.load_dotenv"):
        assert access.llm_settings().timeout == 11.0
        assert access.tts_settings().timeout == 12.0


def test_resolve_access_reads_the_process_environment_by_default(monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO", "true")
    with patch("llm_translate.utils.config.load_dotenv"), pytest.raises(TranslationError):
        resolve_access()
