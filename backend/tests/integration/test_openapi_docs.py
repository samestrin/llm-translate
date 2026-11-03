"""
The OpenAPI schema served at `/openapi.json` and the docs page at `/docs`.
"""
from fastapi.testclient import TestClient

from main import app

V1_ROUTES = {("/v1/translate", "post"), ("/v1/speak", "post")}
ERROR_STATUSES = {"400", "401", "422", "429", "500"}

client = TestClient(app)


def _schema():
    return client.get("/openapi.json").json()


def test_docs_page_is_served():
    response = client.get("/docs")
    assert response.status_code == 200
    assert "swagger" in response.text.lower()


def test_schema_lists_every_v1_route():
    paths = _schema()["paths"]
    served = {(p, m) for p, ops in paths.items() if p.startswith("/v1") for m in ops}
    assert served == V1_ROUTES
    routes = {(r.path, m.lower()) for r in app.routes if r.path.startswith("/v1") for m in r.methods}
    assert routes == V1_ROUTES


def test_every_v1_route_has_summary_and_described_errors():
    paths = _schema()["paths"]
    for path, method in V1_ROUTES:
        op = paths[path][method]
        assert op["summary"], path
        assert op["tags"] == ["v1"], path
        for status in ERROR_STATUSES:
            assert op["responses"][status]["description"], (path, status)
        for status in ERROR_STATUSES - {"422"}:
            assert "error" in op["responses"][status]["content"]["application/json"]["example"]


def test_v1_request_and_response_examples():
    schema = _schema()
    translate = schema["paths"]["/v1/translate"]["post"]
    ok = translate["responses"]["200"]["content"]["application/json"]["schema"]
    assert ok["$ref"].endswith("V1TranslationResponse")
    assert "examples" in schema["components"]["schemas"]["TranslationRequest"]["properties"]["text"] or \
        "example" in schema["components"]["schemas"]["TranslationRequest"]
    assert "example" in schema["components"]["schemas"]["V1TranslationResponse"]
    audio = schema["paths"]["/v1/speak"]["post"]["responses"]["200"]["content"]
    assert "audio/mpeg" in audio


# The documented examples must be what the routes return.

def _example(path, status):
    op = _schema()["paths"][path]["post"]
    return op["responses"][status]["content"]["application/json"]["example"]


def _documented(response):
    """The body as OpenAPI shows it: the schema generator leaves out null fields."""
    error = {k: v for k, v in response.json()["error"].items() if v is not None}
    return response.status_code, {"error": error}


def _fake_server(monkeypatch):
    from tests.integration.test_v1_api import ENV_VARS
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("LLM_BASE_URL", "http://llm.local/v1")
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "translate-model")


def test_documented_translate_errors_match_real_bodies(monkeypatch):
    from unittest.mock import patch
    _fake_server(monkeypatch)
    body = {"text": " ", "from_lang": "English", "to_lang": "Spanish"}
    from tests.fake_openai_server import FakeOpenAIServer
    import httpx
    fake = FakeOpenAIServer(translation="x", detected_language="English")
    real = httpx.AsyncClient
    monkeypatch.setattr("llm_translate.services.llm_client.httpx.AsyncClient",
                        lambda **kw: real(transport=httpx.ASGITransport(app=fake.app), **kw))
    ok = {**body, "text": "Hello"}
    with patch("llm_translate.utils.config.load_dotenv"):
        blank = client.post("/v1/translate", json=body)
        fake.status = 401
        auth = client.post("/v1/translate", json=ok)
        fake.status = 429
        limited = client.post("/v1/translate", json=ok)
        with patch("main.get_translation_service", side_effect=RuntimeError("boom")):
            unexpected = client.post("/v1/translate", json={**body, "text": "Hello"})
    assert _documented(blank) == (400, _example("/v1/translate", "400"))
    assert _documented(unexpected) == (500, _example("/v1/translate", "500"))
    assert _documented(auth) == (401, _example("/v1/translate", "401"))
    assert _documented(limited) == (429, _example("/v1/translate", "429"))


def test_documented_speak_errors_match_real_bodies(monkeypatch):
    from unittest.mock import patch
    from tests.fake_openai_server import FakeOpenAIServer
    import httpx
    _fake_server(monkeypatch)
    fake = FakeOpenAIServer(translation="x", detected_language="English")
    real = httpx.AsyncClient
    monkeypatch.setattr("llm_translate.services.tts_client.httpx.AsyncClient",
                        lambda **kw: real(transport=httpx.ASGITransport(app=fake.app), **kw))
    body = {"text": "Hola", "lang": "Spanish"}
    with patch("llm_translate.utils.config.load_dotenv"):
        fake.status = 400
        bad = client.post("/v1/speak", json=body)
        fake.status = 401
        auth = client.post("/v1/speak", json=body)
        fake.status = 429
        limited = client.post("/v1/speak", json=body)
        with patch("main.get_tts_client", side_effect=RuntimeError("boom")):
            unexpected = client.post("/v1/speak", json=body)
    for status, response in (("400", bad), ("401", auth), ("429", limited), ("500", unexpected)):
        assert _documented(response) == (int(status), _example("/v1/speak", status)), status
