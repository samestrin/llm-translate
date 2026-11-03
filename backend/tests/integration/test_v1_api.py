"""
The versioned API (`/v1/translate`, `/v1/speak`) and the deprecated aliases
(`/translate`, `/speak`), against the fake OpenAI-compatible server.
"""
from unittest.mock import patch

import httpx
import pytest
from fastapi.testclient import TestClient

from main import app
from tests.fake_openai_server import AUDIO_BODIES, FakeOpenAIServer

ENV_VARS = [
    "AI_SOURCE", "LLM_BASE_URL", "LLM_API_KEY", "LLM_TRANSLATE_MODEL", "LLM_REVIEW_MODEL",
    "LLM_TIMEOUT", "LLM_MAX_CONCURRENCY", "OPENAI_API_KEY", "OPENAI_MODEL", "GROQ_API_KEY",
    "GROQ_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "SITE_URL", "SITE_NAME",
    "TTS_SOURCE", "TTS_BASE_URL", "TTS_API_KEY", "TTS_MODEL", "TTS_VOICE", "TTS_FORMATS", "TTS_TIMEOUT",
]

ALIAS_FIELDS = {"translated_text", "from_lang", "to_lang", "service_used", "model_used"}


@pytest.fixture
def server(monkeypatch):
    """A fake endpoint that every outgoing model and speech request lands on, and a clean environment."""
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("LLM_BASE_URL", "http://llm.local/v1")
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "translate-model")
    fake = FakeOpenAIServer(translation='"Hola, mundo"', detected_language="English")
    real_client = httpx.AsyncClient
    fake_client = lambda **kwargs: real_client(transport=httpx.ASGITransport(app=fake.app), **kwargs)  # noqa: E731
    monkeypatch.setattr("llm_translate.services.llm_client.httpx.AsyncClient", fake_client)
    monkeypatch.setattr("llm_translate.services.tts_client.httpx.AsyncClient", fake_client)
    with patch("llm_translate.utils.config.load_dotenv"):
        yield fake


@pytest.fixture
def client():
    return TestClient(app)


# /v1/translate

def test_v1_translate_returns_translation_model_and_usage(server, client):
    response = client.post("/v1/translate", json={"text": "Hello, world", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 200
    assert response.json() == {
        "translation": "Hola, mundo",
        "from_lang": "English",
        "to_lang": "Spanish",
        "model": "translate-model",
        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        "glossary_misses": [],
    }
    assert len(server.requests) == 1


def test_v1_translate_auto_detect_counts_both_calls(server, client):
    server.usage = {"prompt_tokens": 10, "completion_tokens": 3, "total_tokens": 13}

    response = client.post("/v1/translate", json={"text": "Hello, world", "from_lang": "Auto-detect", "to_lang": "Spanish"})

    assert response.status_code == 200
    body = response.json()
    assert body["translation"] == "Hola, mundo"
    assert body["model"] == "translate-model"
    assert body["usage"] == {"prompt_tokens": 20, "completion_tokens": 6, "total_tokens": 26}
    assert len(server.requests) == 2
    assert "language identification" in server.requests[0]["json"]["messages"][0]["content"]
    assert "from English to Spanish" in server.requests[1]["json"]["messages"][1]["content"]


def test_v1_translate_auto_detect_of_the_target_language_returns_the_text(server, client):
    server.detected_language = "Spanish"

    response = client.post("/v1/translate", json={"text": "Hola", "from_lang": "Auto-detect", "to_lang": "Spanish"})

    assert response.status_code == 200
    assert response.json()["translation"] == "Hola"
    assert response.json()["model"] == "translate-model"
    assert response.json()["usage"]["total_tokens"] == 2
    assert len(server.requests) == 1


def test_v1_translate_same_language_reports_no_model_and_no_usage(server, client):
    response = client.post("/v1/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "english"})

    assert response.status_code == 200
    assert response.json()["translation"] == "Hello"
    assert response.json()["model"] is None
    assert response.json()["usage"] == {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
    assert server.requests == []


def test_v1_translate_empty_model_answer_is_an_error(server, client):
    server.translation = '""'

    response = client.post("/v1/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 500
    assert "translation" not in response.json()
    assert response.json()["error"]["type"] == "api_error"


GLOSSARY = [
    {"source_term": "cloud", "target_term": "nube", "note": "computing sense"},
    {"source_term": "Acme Cloud", "do_not_translate": True},
]
GLOSSARY_TEXT = "Acme Cloud keeps your files in the cloud"


def test_v1_translate_glossary_term_appears_and_do_not_translate_term_stays_unchanged(server, client):
    server.translation = "Acme Cloud guarda tus archivos en la nube"

    response = client.post("/v1/translate", json={
        "text": GLOSSARY_TEXT, "from_lang": "English", "to_lang": "Spanish", "glossary": GLOSSARY,
    })

    assert response.status_code == 200
    assert response.json()["translation"] == "Acme Cloud guarda tus archivos en la nube"
    assert response.json()["glossary_misses"] == []
    prompt = server.requests[0]["json"]["messages"][1]["content"]
    assert '"cloud" -> "nube" (computing sense)' in prompt
    assert '"Acme Cloud" -> keep unchanged, do not translate' in prompt


def test_v1_translate_glossary_misses_are_a_200_with_the_misses_listed(server, client):
    server.translation = "Acme Nube guarda tus archivos en el cielo"

    response = client.post("/v1/translate", json={
        "text": GLOSSARY_TEXT, "from_lang": "English", "to_lang": "Spanish", "glossary": GLOSSARY,
    })

    assert response.status_code == 200
    assert response.json()["translation"] == "Acme Nube guarda tus archivos en el cielo"
    assert response.json()["glossary_misses"] == [
        {"term": "cloud", "expected": "nube"},
        {"term": "Acme Cloud", "expected": "Acme Cloud"},
    ]


@pytest.mark.parametrize("entry", [
    {"source_term": "", "target_term": "nube"},
    {"source_term": "cloud"},
    {"target_term": "nube"},
])
def test_v1_translate_invalid_glossary_entry_is_a_validation_error(server, client, entry):
    response = client.post("/v1/translate", json={
        "text": "Hello", "from_lang": "English", "to_lang": "Spanish", "glossary": [entry],
    })

    assert response.status_code == 422
    assert server.requests == []


def test_v1_translate_upstream_error_is_reported(server, client):
    server.status = 401

    response = client.post("/v1/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 401
    assert "error" in response.json()


def test_v1_translate_blank_text_is_a_bad_request(server, client):
    response = client.post("/v1/translate", json={"text": " ", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 400
    assert server.requests == []


def test_v1_translate_missing_fields_is_a_validation_error(server, client):
    response = client.post("/v1/translate", json={"text": "Hello"})

    assert response.status_code == 422


def test_v1_translate_invalid_configuration_is_a_bad_request(server, client, monkeypatch):
    monkeypatch.setenv("AI_SOURCE", "nope")
    monkeypatch.delenv("LLM_BASE_URL")

    response = client.post("/v1/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 400
    assert response.json()["error"]["type"] == "invalid_request_error"


# /translate (deprecated alias)

def test_translate_alias_keeps_todays_response_shape(server, client, monkeypatch):
    monkeypatch.setattr("main.app_config", {"AI_SOURCE": "test-service"})

    response = client.post("/translate", json={"text": "Hello, world", "from_lang": "Auto-detect", "to_lang": "Spanish"})

    assert response.status_code == 200
    assert response.json() == {
        "translated_text": "Hola, mundo",
        "from_lang": "Auto-detect",
        "to_lang": "Spanish",
        "service_used": "test-service",
        "model_used": "translate-model",
    }
    assert set(response.json()) == ALIAS_FIELDS


def test_translate_alias_error_keeps_the_error_body(server, client):
    server.status = 429

    response = client.post("/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 429
    assert "error" in response.json()


# /v1/speak

@pytest.mark.parametrize("fmt,media_type", [("mp3", "audio/mpeg"), ("wav", "audio/wav")])
def test_v1_speak_returns_audio(server, client, fmt, media_type):
    response = client.post("/v1/speak", json={"text": "Hola", "lang": "Spanish", "response_format": fmt})

    assert response.status_code == 200
    assert response.content == AUDIO_BODIES[fmt]
    assert response.headers["content-type"] == media_type
    assert server.requests[0]["url"] == "http://llm.local/v1/audio/speech"
    assert server.requests[0]["json"]["input"] == "Hola"


def test_v1_speak_sends_voice_and_instructions(server, client):
    response = client.post("/v1/speak", json={
        "text": "Hola", "lang": "Spanish", "voice": "echo", "instructions": "Slowly"
    })

    assert response.status_code == 200
    assert server.requests[0]["json"]["voice"] == "echo"
    assert server.requests[0]["json"]["instructions"] == "Slowly"


def test_v1_speak_upstream_error_uses_the_error_body(server, client):
    server.status = 429

    response = client.post("/v1/speak", json={"text": "Hola", "lang": "Spanish"})

    assert response.status_code == 429
    assert response.json()["error"]["type"] == "rate_limit_error"


def test_v1_speak_invalid_configuration_uses_the_error_body(server, client, monkeypatch):
    monkeypatch.setenv("TTS_SOURCE", "nope")

    response = client.post("/v1/speak", json={"text": "Hola", "lang": "Spanish"})

    assert response.status_code == 500
    assert response.json()["error"]["type"] == "configuration_error"
    assert "TTS_SOURCE" in response.json()["error"]["message"]


def test_v1_speak_unexpected_failure_uses_the_error_body(server, client):
    with patch("main.get_tts_client", side_effect=RuntimeError("boom")):
        response = client.post("/v1/speak", json={"text": "Hola", "lang": "Spanish"})

    assert response.status_code == 500
    assert response.json()["error"]["type"] == "unknown_error"
    assert "boom" not in str(response.json())


# /speak (deprecated alias)

def test_speak_alias_returns_audio(server, client):
    response = client.post("/speak", json={"text": "Hola", "lang": "Spanish"})

    assert response.status_code == 200
    assert response.content == AUDIO_BODIES["mp3"]
    assert response.headers["content-type"] == "audio/mpeg"


def test_speak_alias_keeps_todays_error_body(server, client, monkeypatch):
    server.status = 429
    response = client.post("/speak", json={"text": "Hola", "lang": "Spanish"})
    assert response.status_code == 429
    assert set(response.json()) == {"detail"}

    monkeypatch.setenv("TTS_SOURCE", "nope")
    response = client.post("/speak", json={"text": "Hola", "lang": "Spanish"})
    assert response.status_code == 500
    assert "TTS_SOURCE" in response.json()["detail"]

    with patch("main.get_tts_client", side_effect=RuntimeError("boom")):
        response = client.post("/speak", json={"text": "Hola", "lang": "Spanish"})
    assert response.status_code == 500
    assert response.json() == {"detail": "An unexpected error occurred during speech generation."}


# OpenAPI

def test_old_routes_are_marked_deprecated_and_v1_routes_are_not():
    paths = TestClient(app).get("/openapi.json").json()["paths"]

    assert paths["/translate"]["post"]["deprecated"] is True
    assert paths["/speak"]["post"]["deprecated"] is True
    assert not paths["/v1/translate"]["post"].get("deprecated", False)
    assert not paths["/v1/speak"]["post"].get("deprecated", False)


def test_v1_translate_missing_dependency_is_a_server_error(server, client):
    with patch("main.get_translation_service", side_effect=ImportError("no module named x")):
        response = client.post("/v1/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 500
    assert response.json()["error"]["type"] == "service_unavailable_error"


def test_v1_translate_unexpected_failure_hides_its_details(server, client):
    with patch("main.get_translation_service", side_effect=RuntimeError("secret internals")):
        response = client.post("/v1/translate", json={"text": "Hello", "from_lang": "English", "to_lang": "Spanish"})

    assert response.status_code == 500
    assert response.json()["error"]["type"] == "unknown_error"
    assert "secret internals" not in str(response.json())
