"""
Unit tests for the service selector module.
"""
import pytest
from unittest.mock import patch
from llm_translate.core.service_selector import get_translation_service
from llm_translate.services.llm_translator import LLMTranslator


LLM_AND_LEGACY_VARS = [
    "AI_SOURCE", "LLM_BASE_URL", "LLM_API_KEY", "LLM_TRANSLATE_MODEL", "LLM_REVIEW_MODEL",
    "LLM_TIMEOUT", "LLM_MAX_CONCURRENCY", "OPENAI_API_KEY", "OPENAI_MODEL", "GROQ_API_KEY",
    "GROQ_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "SITE_URL", "SITE_NAME",
]


@pytest.fixture
def legacy_env(monkeypatch):
    """Legacy vendor variables only; no .env file is read."""
    for var in LLM_AND_LEGACY_VARS:
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4.1-mini-2025-04-14")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "qwen/qwen3-4b:free")
    with patch("llm_translate.utils.config.load_dotenv"):
        yield monkeypatch


@pytest.mark.parametrize("source,api_key,model,base_url", [
    ("openai", "test-openai-key", "gpt-4.1-mini-2025-04-14", "https://api.openai.com/v1"),
    ("groq", "test-groq-key", "meta-llama/llama-4-maverick-17b-128e-instruct", "https://api.groq.com/openai/v1"),
    ("openrouter", "test-openrouter-key", "qwen/qwen3-4b:free", "https://openrouter.ai/api/v1"),
])
def test_get_translation_service_maps_each_legacy_vendor(legacy_env, source, api_key, model, base_url):
    """Each AI_SOURCE vendor now runs on the one OpenAI-compatible translator, with that vendor's key and model."""
    legacy_env.setenv("AI_SOURCE", source)

    translator = get_translation_service()

    assert isinstance(translator, LLMTranslator)
    assert translator.api_key == api_key
    assert translator.model == model
    assert translator.client.settings.base_url == base_url


def test_get_translation_service_uses_llm_vars(legacy_env):
    legacy_env.setenv("AI_SOURCE", "groq")
    legacy_env.setenv("LLM_BASE_URL", "http://localhost:11434/v1")
    legacy_env.setenv("LLM_TRANSLATE_MODEL", "local-model")

    translator = get_translation_service()

    assert translator.model == "local-model"
    assert translator.client.settings.base_url == "http://localhost:11434/v1"


def test_get_translation_service_unsupported(legacy_env):
    """Test that get_translation_service raises ValueError for unsupported AI_SOURCE."""
    legacy_env.setenv("AI_SOURCE", "unsupported_provider")

    with pytest.raises(ValueError) as excinfo:
        get_translation_service()

    assert "Unsupported AI service provider" in str(excinfo.value)
