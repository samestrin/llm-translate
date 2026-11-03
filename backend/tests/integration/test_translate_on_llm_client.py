"""
`/translate` runs on the one OpenAI-compatible client, configured from the
environment, against the fake OpenAI-compatible server.
"""
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

from main import app
from tests.fake_openai_server import FakeOpenAIServer

ENV_VARS = [
    "AI_SOURCE", "LLM_BASE_URL", "LLM_API_KEY", "LLM_TRANSLATE_MODEL", "LLM_REVIEW_MODEL",
    "LLM_TIMEOUT", "LLM_MAX_CONCURRENCY", "OPENAI_API_KEY", "OPENAI_MODEL", "GROQ_API_KEY",
    "GROQ_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "SITE_URL", "SITE_NAME",
]


@pytest.fixture
def server(monkeypatch):
    """A fake endpoint that every outgoing model request lands on, and a clean environment."""
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    fake = FakeOpenAIServer(translation='"Hola, mundo"', detected_language="English")
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        "llm_translate.services.llm_client.httpx.AsyncClient",
        lambda **kwargs: real_client(transport=httpx.ASGITransport(app=fake.app), **kwargs),
    )
    with patch("llm_translate.utils.config.load_dotenv"):
        yield fake


def test_translate_with_legacy_groq_vars(server, monkeypatch):
    monkeypatch.setenv("AI_SOURCE", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "groq-key")
    monkeypatch.setenv("GROQ_MODEL", "llama-test")

    response = TestClient(app).post("/translate", json={"text": "Hello, world", "from_lang": "Auto-detect", "to_lang": "Spanish"})

    assert response.status_code == 200
    assert response.json()["translated_text"] == "Hola, mundo"
    assert response.json()["model_used"] == "llama-test"
    assert [r["url"] for r in server.requests] == ["https://api.groq.com/openai/v1/chat/completions"] * 2
    assert server.requests[1]["headers"]["authorization"] == "Bearer groq-key"


def test_translate_with_llm_vars(server, monkeypatch):
    monkeypatch.setenv("LLM_BASE_URL", "http://localhost:11434/v1")
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "local-model")

    response = TestClient(app).post("/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 200
    assert response.json()["model_used"] == "local-model"
    assert server.requests[0]["url"] == "http://localhost:11434/v1/chat/completions"
    assert "authorization" not in server.requests[0]["headers"]


def test_translate_same_language_makes_no_model_call(server):
    response = TestClient(app).post("/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "english"})

    assert response.status_code == 200
    assert response.json()["translated_text"] == "Hello"
    assert server.requests == []


def test_translate_endpoint_error_is_reported(server):
    server.status = 401

    response = TestClient(app).post("/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 401
