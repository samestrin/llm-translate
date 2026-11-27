"""
Per-request credentials on every model route: a preset and the visitor's key, or a demo code.

In `PUBLIC_DEMO=true` mode the env endpoint and key are never used for a visitor's request.
The visitor's key never reaches a log line, an error body or the translation cache.
"""
import logging
from dataclasses import replace
from unittest.mock import patch

import httpx
import pytest
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient

import llm_translate.services.cache as cache_module
import llm_translate.services.presets as presets_module
from main import ModelAccessGate, app
from tests.fake_openai_server import AUDIO_BODIES, FakeOpenAIServer

KEY = "sk-test-PLANTED-9f8e7d6c5b4a"
OTHER_KEY = "sk-test-OTHER-visitor-1234"
CODE = "demo-PLANTED-code-5150"
ENV_KEY = "sk-ENV-owner-key-0000"

ENV_VARS = [
    "AI_SOURCE", "LLM_BASE_URL", "LLM_API_KEY", "LLM_TRANSLATE_MODEL", "LLM_REVIEW_MODEL", "LLM_TIMEOUT",
    "LLM_MAX_CONCURRENCY", "LLM_SEGMENT_MAX_CHARS", "LLM_MAX_SEGMENTS", "LLM_CACHE_SIZE", "LLM_MAX_FILE_BYTES",
    "OPENAI_API_KEY", "OPENAI_MODEL", "GROQ_API_KEY", "GROQ_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL",
    "SITE_URL", "SITE_NAME", "TTS_SOURCE", "TTS_BASE_URL", "TTS_API_KEY", "TTS_MODEL", "TTS_VOICE", "TTS_FORMATS",
    "TTS_TIMEOUT", "PUBLIC_DEMO", "DEMO_GATEWAY_URL", "DEMO_TRANSLATE_MODEL", "DEMO_REVIEW_MODEL", "DEMO_TTS_MODEL",
]

TEXT = {"text": "Hello, world", "from_lang": "English", "to_lang": "Spanish"}
SPEAK = {"text": "Hola", "lang": "Spanish"}
OPENAI = {"X-Model-Preset": "openai", "X-Model-Key": KEY}

# Every POST route in the app calls a model. A new one must be added here, or the route-walk test fails.
MODEL_ROUTE_REQUESTS = {
    "/v1/translate": {"json": TEXT},
    "/v1/translate/file": {
        "files": {"file": ("strings.json", b'{"greeting": "Hello"}', "application/json")},
        "data": {"from_lang": "English", "to_lang": "Spanish"},
    },
    "/translate": {"json": TEXT},
    "/v1/speak": {"json": SPEAK},
    "/speak": {"json": SPEAK},
}


@pytest.fixture
def server(monkeypatch):
    """A fake endpoint that every outgoing request lands on; the env endpoint holds the owner's key."""
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("LLM_BASE_URL", "http://llm.local/v1")
    monkeypatch.setenv("LLM_API_KEY", ENV_KEY)
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "env-model")
    monkeypatch.setenv("DEMO_GATEWAY_URL", "http://gateway.internal:4000/v1")
    monkeypatch.setenv("DEMO_TRANSLATE_MODEL", "demo-translate")
    monkeypatch.setenv("DEMO_TTS_MODEL", "demo-tts")
    fake = FakeOpenAIServer(translation='"Hola, mundo"', detected_language="English")
    real_client = httpx.AsyncClient
    fake_client = lambda **kwargs: real_client(transport=httpx.ASGITransport(app=fake.app), **kwargs)  # noqa: E731
    monkeypatch.setattr("llm_translate.services.llm_client.httpx.AsyncClient", fake_client)
    monkeypatch.setattr("llm_translate.services.tts_client.httpx.AsyncClient", fake_client)
    monkeypatch.setattr(cache_module, "_shared_cache", None)
    with patch("llm_translate.utils.config.load_dotenv"):
        yield fake


@pytest.fixture
def public(server, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO", "true")
    return server


@pytest.fixture
def client():
    return TestClient(app)


def _post_routes():
    return [route for route in app.routes if isinstance(route, APIRoute) and "POST" in route.methods]


def _bearers(server):
    return [request["headers"].get("authorization") for request in server.requests]


# The route registry

def test_every_post_route_is_a_listed_model_route_behind_the_credential_gate():
    routes = _post_routes()

    assert {route.path for route in routes} == set(MODEL_ROUTE_REQUESTS)
    for route in routes:
        gates = [dep.call for dep in route.dependant.dependencies if isinstance(dep.call, ModelAccessGate)]
        assert len(gates) == 1, route.path


def test_no_model_post_route_runs_on_the_env_key_alone_while_public(public, client):
    for route in _post_routes():
        response = client.post(route.path, **MODEL_ROUTE_REQUESTS[route.path])
        assert response.status_code == 401, route.path
    assert public.requests == []

    # The same requests are valid: with a preset key each one runs, and never on the env key.
    for route in _post_routes():
        response = client.post(route.path, headers=OPENAI, **MODEL_ROUTE_REQUESTS[route.path])
        assert response.status_code == 200, route.path
    assert public.requests
    assert set(_bearers(public)) == {f"Bearer {KEY}"}


def test_the_env_endpoint_still_serves_requests_without_credentials_when_not_public(server, client):
    for route in _post_routes():
        response = client.post(route.path, **MODEL_ROUTE_REQUESTS[route.path])
        assert response.status_code == 200, route.path

    assert set(_bearers(server)) == {f"Bearer {ENV_KEY}"}
    assert all(request["url"].startswith("http://llm.local/v1/") for request in server.requests)


# Presets and the allowlist

def test_unknown_preset_is_a_400_on_every_model_route(public, client):
    for path, request in MODEL_ROUTE_REQUESTS.items():
        response = client.post(path, headers={"X-Model-Preset": "evil", "X-Model-Key": KEY}, **request)
        assert response.status_code == 400, path
    assert public.requests == []


def test_no_base_url_is_taken_from_the_request(public, client):
    headers = {**OPENAI, "X-Model-Base-Url": "http://169.254.169.254/v1", "X-Base-Url": "http://10.0.0.1/v1"}

    translated = client.post("/v1/translate", headers=headers, json={**TEXT, "base_url": "http://10.0.0.1/v1"})
    spoken = client.post("/v1/speak", headers=headers, json={**SPEAK, "base_url": "http://10.0.0.1/v1"})

    assert (translated.status_code, spoken.status_code) == (200, 200)
    assert [request["url"] for request in public.requests] == [
        "https://api.openai.com/v1/chat/completions", "https://api.openai.com/v1/audio/speech",
    ]


def test_model_routes_take_only_the_three_credential_headers():
    schema = TestClient(app).get("/openapi.json").json()
    for path in MODEL_ROUTE_REQUESTS:
        parameters = schema["paths"][path]["post"].get("parameters", [])
        assert {(p["in"], p["name"]) for p in parameters} == {
            ("header", "x-model-preset"), ("header", "x-model-key"), ("header", "x-demo-code"),
        }, path


def test_a_preset_key_uses_the_preset_models(public, client):
    response = client.post("/v1/translate", headers={"X-Model-Preset": "openrouter", "X-Model-Key": KEY}, json=TEXT)

    assert response.status_code == 200
    assert response.json()["model"] == "qwen/qwen3.7-flash"
    assert public.requests[0]["url"] == "https://openrouter.ai/api/v1/chat/completions"


def test_review_runs_on_the_preset_review_model(public, client):
    response = client.post("/v1/translate", headers=OPENAI, json={**TEXT, "review": "on"})

    assert response.status_code == 200
    assert {request["json"]["model"] for request in public.requests} == {"gpt-5-nano"}
    assert set(_bearers(public)) == {f"Bearer {KEY}"}


def test_a_demo_code_goes_to_the_demo_gateway(public, client):
    translated = client.post("/v1/translate", headers={"X-Demo-Code": CODE}, json=TEXT)
    spoken = client.post("/v1/speak", headers={"X-Demo-Code": CODE}, json=SPEAK)

    assert (translated.status_code, spoken.status_code) == (200, 200)
    assert translated.json()["model"] == "demo-translate"
    assert [(r["url"], r["json"]["model"]) for r in public.requests] == [
        ("http://gateway.internal:4000/v1/chat/completions", "demo-translate"),
        ("http://gateway.internal:4000/v1/audio/speech", "demo-tts"),
    ]
    assert set(_bearers(public)) == {f"Bearer {CODE}"}


def test_no_speech_for_a_preset_without_a_speech_model_and_no_fallback(public, client):
    headers = {"X-Model-Preset": "synthetic", "X-Model-Key": KEY}

    response = client.post("/v1/speak", headers=headers, json=SPEAK)
    alias = client.post("/speak", headers=headers, json=SPEAK)

    assert (response.status_code, alias.status_code) == (400, 400)
    assert "Synthetic" in response.json()["error"]["message"]
    assert public.requests == []


def test_no_speech_for_demo_when_the_demo_tts_model_is_empty(public, client, monkeypatch):
    monkeypatch.setenv("DEMO_TTS_MODEL", "")

    response = client.post("/v1/speak", headers={"X-Demo-Code": CODE}, json=SPEAK)

    assert response.status_code == 400
    assert public.requests == []


def test_the_speak_alias_keeps_its_detail_body_for_credential_errors(public, client):
    response = client.post("/speak", json=SPEAK)

    assert response.status_code == 401
    assert set(response.json()) == {"detail"}


def test_the_translate_alias_reports_the_preset_it_used(public, client):
    # Not `openai`: that is also the default AI_SOURCE, so it would pass without the preset.
    response = client.post("/translate", headers={"X-Model-Preset": "alibaba", "X-Model-Key": KEY}, json=TEXT)

    assert response.json()["service_used"] == "alibaba"
    assert response.json()["model_used"] == "qwen-flash"


def test_a_misspelled_public_demo_fails_closed(server, client, monkeypatch):
    monkeypatch.setenv("PUBLIC_DEMO", "ture")

    response = client.post("/v1/translate", json=TEXT)

    assert response.status_code == 500
    assert response.json()["error"]["type"] == "configuration_error"
    assert server.requests == []


# The cache

def test_a_cache_hit_for_visitor_a_is_not_served_without_credentials(server, client, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_SIZE", "8")

    visitor_a = client.post("/v1/translate", headers=OPENAI, json=TEXT).json()
    anonymous = client.post("/v1/translate", json=TEXT).json()

    assert (visitor_a["cached"], anonymous["cached"]) == (False, False)
    assert _bearers(server) == [f"Bearer {KEY}", f"Bearer {ENV_KEY}"]


def test_a_cache_hit_for_visitor_a_is_refused_without_credentials_while_public(public, client, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_SIZE", "8")

    assert client.post("/v1/translate", headers=OPENAI, json=TEXT).json()["cached"] is False
    anonymous = client.post("/v1/translate", json=TEXT)

    assert anonymous.status_code == 401
    assert "Hola" not in anonymous.text
    assert len(public.requests) == 1


def test_the_cache_is_keyed_by_preset_and_model_never_by_the_key(public, client, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_SIZE", "8")

    first = client.post("/v1/translate", headers=OPENAI, json=TEXT).json()
    other_key = client.post("/v1/translate", headers={**OPENAI, "X-Model-Key": OTHER_KEY}, json=TEXT).json()
    other_preset = client.post(
        "/v1/translate", headers={"X-Model-Preset": "alibaba", "X-Model-Key": KEY}, json=TEXT).json()
    demo = client.post("/v1/translate", headers={"X-Demo-Code": CODE}, json=TEXT).json()

    assert [first["cached"], other_key["cached"], other_preset["cached"], demo["cached"]] == [
        False, True, False, False]
    assert len(public.requests) == 3


def test_presets_with_the_same_models_do_not_share_cache_entries(public, client, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_SIZE", "8")
    openai = presets_module.load_presets()["openai"]
    twin = replace(openai, id="twin", label="Twin")
    monkeypatch.setattr(presets_module, "load_presets", lambda: {"openai": openai, "twin": twin})

    first = client.post("/v1/translate", headers=OPENAI, json=TEXT).json()
    other = client.post("/v1/translate", headers={"X-Model-Preset": "twin", "X-Model-Key": KEY}, json=TEXT).json()

    assert (first["cached"], other["cached"]) == (False, False)
    assert len(public.requests) == 2


def test_endpoints_with_the_same_models_do_not_share_cache_entries(server, client, monkeypatch):
    monkeypatch.setenv("LLM_CACHE_SIZE", "8")

    first = client.post("/v1/translate", json=TEXT).json()
    monkeypatch.setenv("LLM_BASE_URL", "http://other-llm.local/v1")
    other = client.post("/v1/translate", json=TEXT).json()

    assert (first["cached"], other["cached"]) == (False, False)
    assert [r["url"] for r in server.requests] == [
        "http://llm.local/v1/chat/completions", "http://other-llm.local/v1/chat/completions"]


# The key never leaks

def _raise(exc_type):
    def transport_factory(**kwargs):
        def handler(request):
            raise exc_type("upstream went away", request=request)
        return httpx.AsyncClient(transport=httpx.MockTransport(handler), **kwargs)
    return transport_factory


def _upstream(status=None, body=None, translation=None):
    def arrange(server, monkeypatch):
        if status is not None:
            server.status = status
        if body is not None:
            server.body = body
        if translation is not None:
            server.translation = translation
    return arrange


def _broken_transport(exc_type):
    def arrange(server, monkeypatch):
        monkeypatch.setattr("llm_translate.services.llm_client.httpx.AsyncClient", _raise(exc_type))
        monkeypatch.setattr("llm_translate.services.tts_client.httpx.AsyncClient", _raise(exc_type))
    return arrange


def _boom(*args, **kwargs):
    raise RuntimeError("boom")


def _crash(server, monkeypatch):
    monkeypatch.setattr("main.get_translation_service", _boom)
    monkeypatch.setattr("main.get_tts_client", _boom)


def _demo_off(server, monkeypatch):
    monkeypatch.setenv("DEMO_GATEWAY_URL", "")


# An upstream body that echoes the credentials, as OpenAI's 401 body echoes part of the key.
ECHO_BODY = {"error": {"message": f"Incorrect API key provided: {KEY}; demo code {CODE}."}}

SCENARIOS = {
    "success": _upstream(),
    "upstream 401": _upstream(status=401),
    "upstream 403": _upstream(status=403),
    "upstream 400": _upstream(status=400),
    "upstream 429": _upstream(status=429),
    "upstream 500": _upstream(status=500),
    "malformed answer": _upstream(body={"choices": []}),
    "empty translation": _upstream(translation="  "),
    "timeout": _broken_transport(httpx.ReadTimeout),
    "connection error": _broken_transport(httpx.ConnectError),
    "unexpected error": _crash,
    "demo gateway not set up": _demo_off,
    "upstream 401 echoing credentials": _upstream(status=401, body=ECHO_BODY),
    "upstream 403 echoing credentials": _upstream(status=403, body=ECHO_BODY),
    "upstream 429 echoing credentials": _upstream(status=429, body=ECHO_BODY),
    "upstream 500 echoing credentials": _upstream(status=500, body=ECHO_BODY),
    "malformed answer echoing credentials": _upstream(body={"choices": [], "echo": f"{KEY} {CODE}"}),
}

CREDENTIALS = {
    "preset key": OPENAI,
    "demo code": {"X-Demo-Code": CODE},
    "unknown preset": {"X-Model-Preset": "nope", "X-Model-Key": KEY},
    "key without preset": {"X-Model-Key": KEY},
    "key and code": {**OPENAI, "X-Demo-Code": CODE},
    "code with another preset": {"X-Model-Preset": "openai", "X-Demo-Code": CODE},
    "preset without speech": {"X-Model-Preset": "openrouter", "X-Model-Key": KEY},
}


@pytest.mark.parametrize("scenario", list(SCENARIOS))
@pytest.mark.parametrize("credentials", list(CREDENTIALS))
def test_a_planted_key_never_reaches_logs_error_bodies_or_the_cache(
    public, client, monkeypatch, caplog, scenario, credentials
):
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")
    monkeypatch.setenv("LLM_CACHE_SIZE", "8")
    caplog.set_level(logging.DEBUG)
    SCENARIOS[scenario](public, monkeypatch)
    headers = CREDENTIALS[credentials]

    responses = [
        client.post(path, headers=headers, **request) for path, request in MODEL_ROUTE_REQUESTS.items()
    ]
    responses.append(client.post("/v1/translate", headers=headers, json={**TEXT, "review": "on"}))
    responses.append(client.post("/v1/translate", headers=headers, json=TEXT))  # a cache hit, if any

    for response in responses:
        for secret in (KEY, CODE):
            assert secret not in response.text
            assert secret not in str(response.headers)
    for secret in (KEY, CODE):
        assert secret not in caplog.text
    cache = cache_module._shared_cache
    if cache is not None:
        stored = repr(list(cache._entries.items()))
        assert KEY not in stored and CODE not in stored


def test_the_leak_check_would_see_a_logged_key(public, client, caplog):
    """The check above is live: the planted key does reach the upstream request, so a log of it would show."""
    caplog.set_level(logging.DEBUG)
    logging.getLogger("llm_translate").error("leaked %s", KEY)

    client.post("/v1/translate", headers=OPENAI, json=TEXT)

    assert KEY in caplog.text
    assert _bearers(public) == [f"Bearer {KEY}"]


# The shared plain-word errors (epic 08 T3)

@pytest.mark.parametrize("status", [401, 403])
def test_a_rejected_key_gets_the_shared_wording(public, client, status):
    public.status = status

    translated = client.post("/v1/translate", headers=OPENAI, json=TEXT)
    spoken = client.post("/v1/speak", headers=OPENAI, json=SPEAK)

    assert translated.status_code == 401
    assert spoken.status_code == status
    for response in (translated, spoken):
        assert response.json()["error"]["message"] == "The key was rejected by OpenAI"
        assert response.json()["error"]["details"] is None


def test_a_rate_limit_gets_the_shared_wording(public, client):
    public.status = 429

    translated = client.post("/v1/translate", headers=OPENAI, json=TEXT)
    spoken = client.post("/v1/speak", headers=OPENAI, json=SPEAK)

    assert (translated.status_code, spoken.status_code) == (429, 429)
    for response in (translated, spoken):
        assert response.json()["error"]["message"] == "OpenAI is rate limiting this key. Try again shortly."


@pytest.mark.parametrize("status", [401, 403, 429])
def test_a_used_up_or_expired_demo_code_gets_the_shared_wording(public, client, status):
    public.status = status
    if status == 429:
        # litellm's spent-budget answer; an rpm/tpm limit carries no budget marker (EST-9240).
        public.body = {"error": {
            "message": "Budget has been exceeded! Current cost: 2.0000, Max budget: 2.0000",
            "type": "budget_exceeded", "param": None, "code": "429",
        }}
    headers = {"X-Demo-Code": CODE}

    translated = client.post("/v1/translate", headers=headers, json=TEXT)
    spoken = client.post("/v1/speak", headers=headers, json=SPEAK)

    assert translated.status_code == (429 if status == 429 else 401)
    assert spoken.status_code == status
    for response in (translated, spoken):
        assert response.json()["error"]["message"] == "This demo code is used up or expired"


def test_a_rate_limited_demo_code_says_busy_and_passes_retry_after(public, client):
    """An rpm limit on a demo code is busy, not used up or expired, with the gateway's Retry-After (EST-9240)."""
    public.status = 429
    public.body = RPM_BODY
    public.headers = {"retry-after": "30"}
    headers = {"X-Demo-Code": CODE}

    translated = client.post("/v1/translate", headers=headers, json=TEXT)
    spoken = client.post("/v1/speak", headers=headers, json=SPEAK)

    assert (translated.status_code, spoken.status_code) == (429, 429)
    for response in (translated, spoken):
        assert response.json()["error"]["message"] == "This demo code is busy. Try again in a minute."
        assert response.json()["error"]["type"] == "rate_limit_error"
        assert response.headers["retry-after"] == "30"


# litellm's rpm-limit answer, as the gateway sends it (no budget marker).
RPM_BODY = {"error": {
    "message": "LiteLLM Proxy: Rate limit exceeded for key: hashed-demo-code. Current rpm: 21, rpm limit: 20",
    "type": "None", "param": None, "code": "429",
}}


def _busy_segments(payload):
    """A gateway that summarizes, then rate-limits every segment call with a Retry-After."""
    from starlette.responses import JSONResponse
    if "summarize documents" in payload["messages"][0]["content"]:
        return "A short document."
    return JSONResponse(RPM_BODY, status_code=429, headers={"retry-after": "30"})


def test_a_busy_demo_code_on_a_long_text_keeps_retry_after_through_the_segments(public, client, monkeypatch):
    """The owner's repro: one translation is several segment calls; the whole-text error keeps Retry-After."""
    monkeypatch.setenv("LLM_SEGMENT_MAX_CHARS", "40")
    monkeypatch.setenv("LLM_MAX_SEGMENTS", "10")
    public.respond = _busy_segments

    response = client.post("/v1/translate", headers={"X-Demo-Code": CODE},
                           json={**TEXT, "text": "\n\n".join(["Hello world, a fine day."] * 5)})

    assert response.status_code == 429
    assert response.headers["retry-after"] == "30"
    assert "This demo code is busy. Try again in a minute." in response.text
    assert "used up or expired" not in response.text


def test_a_busy_demo_code_on_a_file_keeps_retry_after_through_the_segments(public, client, monkeypatch):
    monkeypatch.setenv("LLM_SEGMENT_MAX_CHARS", "40")
    monkeypatch.setenv("LLM_MAX_SEGMENTS", "10")
    public.respond = _busy_segments

    response = client.post(
        "/v1/translate/file", headers={"X-Demo-Code": CODE},
        data={"from_lang": "English", "to_lang": "Spanish"},
        files={"file": ("strings.json", b'{"a": "Hello there friend", "b": "Another long greeting"}',
                        "application/json")},
    )

    assert response.status_code == 429
    assert response.headers["retry-after"] == "30"
    assert "This demo code is busy. Try again in a minute." in response.text
    assert "used up or expired" not in response.text


def test_speech_with_a_preset_key_returns_audio(public, client):
    response = client.post("/v1/speak", headers=OPENAI, json=SPEAK)

    assert response.status_code == 200
    assert response.content == AUDIO_BODIES["mp3"]
    assert public.requests[0]["json"]["model"] == "gpt-4o-mini-tts"
