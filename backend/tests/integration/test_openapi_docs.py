"""
The OpenAPI schema served at `/openapi.json` and the docs page at `/docs`.
"""
from fastapi.testclient import TestClient

from main import app

V1_ROUTES = {("/v1/translate", "post"), ("/v1/speak", "post")}
ERROR_STATUSES = {"400", "422", "500"}

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
        assert "error" in op["responses"]["400"]["content"]["application/json"]["example"]


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


def test_deprecated_aliases_marked():
    paths = _schema()["paths"]
    assert paths["/translate"]["post"]["deprecated"] is True
    assert paths["/speak"]["post"]["deprecated"] is True
