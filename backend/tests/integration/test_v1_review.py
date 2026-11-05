"""
`review=off|on` on `/v1/translate` and `/v1/translate/file`: off (the default) makes
no review call and has no `review` key; on checks every segment, lists flags
(segment id, reason, severity, source and translation) and reports the model and tokens per step. Against the fake server.
"""
import io
import json

from tests.fake_openai_server import BACK_TRANSLATION_MARKER, REVIEW_MARKER, REVISION_MARKER
from tests.integration.test_v1_api import client, server  # noqa: F401  (fixtures)

BODY = {"text": "Hello, world", "from_lang": "English", "to_lang": "Spanish"}
MAJOR = json.dumps({"errors": [{"category": "meaning", "severity": "major", "explanation": "Wrong sense"}]})
STEPS = ["translation", "back_translation", "review"]


def review_calls(server):  # noqa: F811
    markers = (BACK_TRANSLATION_MARKER, REVIEW_MARKER, REVISION_MARKER)
    return [r for r in server.requests if any(m in r["json"]["messages"][0]["content"] for m in markers)]


def upload(client, content, review=None, name="app.json"):  # noqa: F811
    data = {"from_lang": "English", "to_lang": "Spanish"}
    if review:
        data["review"] = review
    return client.post("/v1/translate/file", data=data, files={"file": (name, io.BytesIO(content), "text/plain")})


# /v1/translate

def test_text_review_is_off_by_default_and_calls_no_review_model(server, client):  # noqa: F811
    body = client.post("/v1/translate", json=BODY).json()
    assert "review" not in body
    assert review_calls(server) == []
    assert body["usage"]["total_tokens"] == 2


def test_text_review_off_is_the_same_as_the_default(server, client):  # noqa: F811
    body = client.post("/v1/translate", json={**BODY, "review": "off"}).json()
    assert "review" not in body and review_calls(server) == []


def test_text_review_on_with_a_clean_review_reports_steps_and_no_flags(server, client):  # noqa: F811
    response = client.post("/v1/translate", json={**BODY, "review": "on"})
    assert response.status_code == 200
    body = response.json()
    assert body["translation"] == "Hola, mundo"
    report = body["review"]
    assert report["flags"] == []
    assert [s["step"] for s in report["steps"]] == STEPS
    assert all(s["model"] for s in report["steps"])
    for step in report["steps"]:
        assert set(step["usage"]) == {"prompt_tokens", "completion_tokens", "total_tokens"}
        assert "cost" not in step and "price" not in step
    assert report["usage"]["total_tokens"] == 6
    assert body["usage"] == report["usage"]


def test_text_review_on_flags_a_segment_still_wrong_after_revision(server, client):  # noqa: F811
    server.review = MAJOR
    server.revision = "Hola, mundo revisado"
    body = client.post("/v1/translate", json={**BODY, "review": "on"}).json()
    assert body["translation"] == "Hola, mundo revisado"
    assert [f["segment"] for f in body["review"]["flags"]] == [1]
    flag = body["review"]["flags"][0]
    assert "still wrong after revision" in flag["reason"]
    assert (flag["severity"], flag["source"], flag["translation"]) == ("major", "Hello, world", "Hola, mundo revisado")
    assert [s["step"] for s in body["review"]["steps"]] == [*STEPS, "revision"]


def test_text_review_on_with_an_unreadable_review_flags_and_keeps_the_translation(server, client):  # noqa: F811
    server.review = "not json"
    response = client.post("/v1/translate", json={**BODY, "review": "on"})
    assert response.status_code == 200
    body = response.json()
    assert body["translation"] == "Hola, mundo"
    assert body["review"]["flags"] == [{
        "segment": 1, "reason": "review could not be read", "severity": None,
        "source": "Hello, world", "translation": "Hola, mundo",
    }]


def test_text_review_on_numbers_flagged_segments_of_a_long_document(server, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("LLM_SEGMENT_MAX_CHARS", "25")
    text = "First paragraph here.\n\nSecond paragraph here."
    def respond(payload):
        system = payload["messages"][0]["content"]
        if REVIEW_MARKER in system:
            return '{"errors": []}' if "First" in payload["messages"][-1]["content"] else "bad"
        if BACK_TRANSLATION_MARKER in system:
            return "back"
        return "Hola"

    server.respond = respond
    body = client.post("/v1/translate", json={**BODY, "text": text, "review": "on"}).json()
    assert body["translation"] == "Hola\n\nHola"
    assert [f["segment"] for f in body["review"]["flags"]] == [2]
    # the flag carries the source of the server's own split, whatever LLM_SEGMENT_MAX_CHARS is
    assert body["review"]["flags"][0]["source"] == "Second paragraph here."
    assert body["review"]["flags"][0]["translation"] == "Hola"


def test_text_review_rejects_a_value_other_than_off_or_on(server, client):  # noqa: F811
    assert client.post("/v1/translate", json={**BODY, "review": "maybe"}).status_code == 422


def test_text_review_endpoint_failure_fails_the_request(server, client):  # noqa: F811
    def respond(payload):
        from starlette.responses import JSONResponse
        if REVIEW_MARKER in payload["messages"][0]["content"]:
            return JSONResponse({"error": {"message": "down"}}, status_code=500)
        return "Hola"

    server.respond = respond
    assert client.post("/v1/translate", json={**BODY, "review": "on"}).status_code == 500


def test_text_review_on_the_same_language_makes_no_call(server, client):  # noqa: F811
    body = client.post("/v1/translate", json={**BODY, "to_lang": "English", "review": "on"}).json()
    assert body["review"]["flags"] == [] and review_calls(server) == []


# /v1/translate/file

JSON_FILE = b'{"greeting": "Hello", "farewell": "Bye"}'


def test_file_review_is_off_by_default(server, client):  # noqa: F811
    body = upload(client, JSON_FILE).json()
    assert "review" not in body["report"]
    assert review_calls(server) == []


def test_file_review_on_reports_steps_and_flags_by_key(server, client):  # noqa: F811
    def respond(payload):
        system, last = payload["messages"][0]["content"], payload["messages"][-1]["content"]
        if REVISION_MARKER in system:
            return "Adiós revisado"
        if REVIEW_MARKER in system:
            return MAJOR if "Bye" in last else '{"errors": []}'
        if BACK_TRANSLATION_MARKER in system:
            return "back"
        return "Adiós" if "Bye" in last else "Hola"

    server.respond = respond
    response = upload(client, JSON_FILE, review="on")
    assert response.status_code == 200
    body = response.json()
    assert json.loads(body["content"]) == {"greeting": "Hola", "farewell": "Adiós revisado"}
    report = body["report"]["review"]
    assert [f["segment"] for f in report["flags"]] == ["/farewell"]
    flag = report["flags"][0]
    assert (flag["severity"], flag["source"], flag["translation"]) == ("major", "Bye", "Adiós revisado")
    assert [s["step"] for s in report["steps"]] == [*STEPS, "revision"]
    assert body["report"]["usage"] == report["usage"]


def test_file_review_rejects_a_value_other_than_off_or_on(server, client):  # noqa: F811
    assert upload(client, JSON_FILE, review="maybe").status_code == 422


def test_file_review_keeps_the_checked_translation_when_a_revision_loses_a_placeholder(server, client):  # noqa: F811
    def respond(payload):
        system = payload["messages"][0]["content"]
        if REVISION_MARKER in system:
            return "Adiós"
        if REVIEW_MARKER in system:
            return MAJOR
        if BACK_TRANSLATION_MARKER in system:
            return "back"
        return "Hola ⟦0⟧"

    server.respond = respond
    response = upload(client, b'{"greeting": "Hello, {name}"}', review="on")
    assert response.status_code == 200
    body = response.json()
    assert json.loads(body["content"]) == {"greeting": "Hola {name}"}
    flags = body["report"]["review"]["flags"]
    assert [f["segment"] for f in flags] == ["/greeting"]
    assert (flags[0]["source"], flags[0]["translation"]) == ("Hello, {name}", "Hola {name}")


def test_file_review_flag_of_a_yaml_file_carries_its_source(server, client):  # noqa: F811
    server.review = "not json"
    response = upload(client, b"greeting: Hello\n", review="on", name="messages.yaml")
    assert response.status_code == 200
    assert response.json()["report"]["review"]["flags"] == [{
        "segment": "/greeting", "reason": "review could not be read", "severity": None,
        "source": "Hello", "translation": "Hola, mundo",
    }]


def test_file_review_on_a_file_already_in_the_target_language_makes_no_review_call(server, client):  # noqa: F811
    response = client.post(
        "/v1/translate/file", data={"from_lang": "English", "to_lang": "english", "review": "on"},
        files={"file": ("a.json", io.BytesIO(JSON_FILE), "text/plain")},
    )
    assert response.status_code == 200
    assert review_calls(server) == []
    assert response.json()["report"]["review"]["flags"] == []
