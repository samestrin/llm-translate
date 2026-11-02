"""
Unit tests for the model-layer env contract (`LLM_*`) and the legacy vendor mapping.

The second half drives each mapping through `LLMClient` against the fake
OpenAI-compatible server, so a mapping is proven by the request that reaches
the endpoint, not only by the settings object.
"""
from unittest.mock import patch

import pytest

from llm_translate.services.llm_client import LLMClient
from llm_translate.utils.config import (
    DEFAULT_MAX_CONCURRENCY,
    DEFAULT_TIMEOUT,
    LEGACY_PROVIDERS,
    load_llm_settings,
)
from tests.fake_openai_server import FakeOpenAIServer

LEGACY_CASES = [
    ("openai", "https://api.openai.com/v1", "OPENAI_API_KEY", "OPENAI_MODEL", "gpt-4.1-mini-2025-04-14"),
    ("groq", "https://api.groq.com/openai/v1", "GROQ_API_KEY", "GROQ_MODEL",
     "meta-llama/llama-4-maverick-17b-128e-instruct"),
    ("openrouter", "https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "qwen/qwen3-4b:free"),
]


def test_legacy_mapping_is_data_for_each_old_vendor():
    assert set(LEGACY_PROVIDERS) == {"openai", "groq", "openrouter"}
    for source, base_url, key_var, model_var, default_model in LEGACY_CASES:
        assert LEGACY_PROVIDERS[source] == {
            "base_url": base_url,
            "api_key_var": key_var,
            "model_var": model_var,
            "default_model": default_model,
        }


def test_no_env_defaults_to_openai_with_review_following_translate():
    settings = load_llm_settings({})
    assert settings.base_url == "https://api.openai.com/v1"
    assert settings.api_key is None
    assert settings.translate_model == "gpt-4.1-mini-2025-04-14"
    assert settings.review_model == settings.translate_model
    assert settings.timeout == DEFAULT_TIMEOUT
    assert settings.max_concurrency == DEFAULT_MAX_CONCURRENCY
    assert settings.provider == "openai"
    assert settings.extra_headers == {}


@pytest.mark.parametrize("source,base_url,key_var,model_var,default_model", LEGACY_CASES)
def test_legacy_vendor_vars_map_to_the_new_contract(source, base_url, key_var, model_var, default_model):
    settings = load_llm_settings({"AI_SOURCE": source, key_var: "legacy-key", model_var: "legacy-model"})
    assert settings.base_url == base_url
    assert settings.api_key == "legacy-key"
    assert settings.translate_model == "legacy-model"
    assert settings.review_model == "legacy-model"
    assert settings.provider == source


@pytest.mark.parametrize("source,base_url,key_var,model_var,default_model", LEGACY_CASES)
def test_legacy_vendor_without_model_uses_its_old_default(source, base_url, key_var, model_var, default_model):
    settings = load_llm_settings({"AI_SOURCE": source, key_var: "k"})
    assert settings.translate_model == default_model


def test_legacy_vars_of_other_vendors_are_ignored():
    settings = load_llm_settings({"AI_SOURCE": "groq", "OPENAI_API_KEY": "wrong", "OPENAI_MODEL": "wrong"})
    assert settings.api_key is None
    assert settings.translate_model == "meta-llama/llama-4-maverick-17b-128e-instruct"


def test_ai_source_is_case_and_space_insensitive():
    assert load_llm_settings({"AI_SOURCE": " Groq "}).base_url == "https://api.groq.com/openai/v1"


def test_unknown_ai_source_is_an_error_not_a_silent_default():
    with pytest.raises(ValueError, match="AI_SOURCE"):
        load_llm_settings({"AI_SOURCE": "anthropic"})


def test_new_vars_win_over_legacy_vars():
    settings = load_llm_settings({
        "AI_SOURCE": "groq",
        "GROQ_API_KEY": "legacy-key",
        "GROQ_MODEL": "legacy-model",
        "LLM_BASE_URL": "http://localhost:11434/v1",
        "LLM_API_KEY": "new-key",
        "LLM_TRANSLATE_MODEL": "fast-model",
        "LLM_REVIEW_MODEL": "reasoning-model",
    })
    assert settings.base_url == "http://localhost:11434/v1"
    assert settings.api_key == "new-key"
    assert settings.translate_model == "fast-model"
    assert settings.review_model == "reasoning-model"
    assert settings.provider == "custom"


def test_new_vars_alone_need_no_vendor():
    settings = load_llm_settings({
        "LLM_BASE_URL": "http://llm.local/v1",
        "LLM_TRANSLATE_MODEL": "small",
    })
    assert settings.base_url == "http://llm.local/v1"
    assert settings.api_key is None
    assert settings.translate_model == "small"
    assert settings.review_model == "small"
    assert settings.provider == "custom"


def test_empty_values_count_as_unset():
    settings = load_llm_settings({
        "AI_SOURCE": "",
        "LLM_BASE_URL": "",
        "LLM_API_KEY": "  ",
        "OPENAI_API_KEY": "legacy-key",
        "LLM_TRANSLATE_MODEL": "",
        "LLM_TIMEOUT": "",
    })
    assert settings.base_url == "https://api.openai.com/v1"
    assert settings.api_key == "legacy-key"
    assert settings.translate_model == "gpt-4.1-mini-2025-04-14"
    assert settings.timeout == DEFAULT_TIMEOUT


def test_timeout_and_concurrency_come_from_env():
    settings = load_llm_settings({"LLM_TIMEOUT": "12.5", "LLM_MAX_CONCURRENCY": "7"})
    assert settings.timeout == 12.5
    assert settings.max_concurrency == 7


@pytest.mark.parametrize("value", ["0", "-3", "soon", "nan", "inf"])
def test_bad_timeout_is_an_error(value):
    with pytest.raises(ValueError, match="LLM_TIMEOUT"):
        load_llm_settings({"LLM_TIMEOUT": value})


@pytest.mark.parametrize("value", ["0", "-1", "2.5", "many"])
def test_bad_concurrency_is_an_error(value):
    with pytest.raises(ValueError, match="LLM_MAX_CONCURRENCY"):
        load_llm_settings({"LLM_MAX_CONCURRENCY": value})


def test_site_vars_become_attribution_headers():
    settings = load_llm_settings({"SITE_URL": "https://example.com", "SITE_NAME": "llm-translate"})
    assert settings.extra_headers == {"HTTP-Referer": "https://example.com", "X-Title": "llm-translate"}


def test_reads_process_environment_by_default(monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://from-env/v1")
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "env-model")
    with patch("llm_translate.utils.config.load_dotenv") as dotenv:
        settings = load_llm_settings()
    dotenv.assert_called_once()
    assert settings.base_url == "http://from-env/v1"
    assert settings.translate_model == "env-model"


def test_settings_do_not_print_the_key():
    settings = load_llm_settings({"LLM_API_KEY": "sk-secret"})
    assert "sk-secret" not in repr(settings)


# --- Each mapping, end to end against the fake OpenAI-compatible server ---

async def _request_seen_by_server(env):
    server = FakeOpenAIServer()
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(env), http_client=http)
        await client.chat([{"role": "system", "content": "s"}, {"role": "user", "content": "u"}])
    assert len(server.requests) == 1
    return server.requests[0]


@pytest.mark.asyncio
@pytest.mark.parametrize("source,base_url,key_var,model_var,default_model", LEGACY_CASES)
async def test_legacy_mapping_reaches_the_server(source, base_url, key_var, model_var, default_model):
    seen = await _request_seen_by_server({"AI_SOURCE": source, key_var: "legacy-key", model_var: "legacy-model"})
    assert seen["url"] == f"{base_url}/chat/completions"
    assert seen["headers"]["authorization"] == "Bearer legacy-key"
    assert seen["json"]["model"] == "legacy-model"


@pytest.mark.asyncio
@pytest.mark.parametrize("source,base_url,key_var,model_var,default_model", LEGACY_CASES)
async def test_legacy_default_model_reaches_the_server(source, base_url, key_var, model_var, default_model):
    seen = await _request_seen_by_server({"AI_SOURCE": source, key_var: "k"})
    assert seen["json"]["model"] == default_model


@pytest.mark.asyncio
async def test_new_contract_reaches_the_server():
    seen = await _request_seen_by_server({
        "AI_SOURCE": "openrouter",
        "OPENROUTER_API_KEY": "legacy-key",
        "LLM_BASE_URL": "http://llm.local:8080/v1/",
        "LLM_API_KEY": "new-key",
        "LLM_TRANSLATE_MODEL": "fast-model",
        "LLM_TIMEOUT": "9",
    })
    assert seen["url"] == "http://llm.local:8080/v1/chat/completions"
    assert seen["headers"]["authorization"] == "Bearer new-key"
    assert seen["json"]["model"] == "fast-model"


@pytest.mark.asyncio
async def test_site_headers_reach_the_server():
    seen = await _request_seen_by_server({"SITE_URL": "https://example.com", "SITE_NAME": "llm-translate"})
    assert seen["headers"]["http-referer"] == "https://example.com"
    assert seen["headers"]["x-title"] == "llm-translate"


@pytest.mark.asyncio
async def test_no_key_sends_no_authorization_header():
    seen = await _request_seen_by_server({"LLM_BASE_URL": "http://localhost:11434/v1"})
    assert "authorization" not in seen["headers"]
