"""
`POST /v1/translate/file`: one test per format, the failed-segment error, and
each rejection, against the fake OpenAI-compatible server.
"""
import io
import json
import re
from pathlib import Path

import polib
import pytest
from ruamel.yaml import YAML
from starlette.responses import JSONResponse

from tests.fake_openai_server import DETECT_MARKER
from tests.integration.test_v1_api import client, server  # noqa: F401  (fixtures)

FIXTURES = Path(__file__).parent.parent / "fixtures"
FORMATS = FIXTURES / "formats"
SEGMENT = re.compile(r'Translate the following text from .+? to .+?: "(.*)"\Z', re.DOTALL)
USAGE_PER_CALL = 2


def segment_of(payload):
    """The (masked) segment a translation prompt asks for."""
    return SEGMENT.search(payload["messages"][-1]["content"]).group(1)


def spanish(payload):
    """A fake model that keeps every mask: it prefixes each segment with `ES `."""
    return f"ES {segment_of(payload)}"


def upload(client, path, from_lang="English", to_lang="Spanish", name=None, content=None):  # noqa: F811
    data = path.read_bytes() if content is None else content
    return client.post(
        "/v1/translate/file",
        data={"from_lang": from_lang, "to_lang": to_lang},
        files={"file": (name or path.name, io.BytesIO(data), "application/octet-stream")},
    )


def translation_calls(server):  # noqa: F811
    return [r for r in server.requests if DETECT_MARKER not in r["json"]["messages"][0]["content"]]


def assert_report(body, segments, server, file_format):  # noqa: F811
    assert body["format"] == file_format
    assert body["from_lang"] == "English" and body["to_lang"] == "Spanish"
    assert body["report"] == {
        "segments": segments,
        "model": "translate-model",
        "usage": {
            "prompt_tokens": segments, "completion_tokens": segments, "total_tokens": segments * USAGE_PER_CALL,
        },
    }
    assert len(translation_calls(server)) == segments


# One test per format

def test_json_file_comes_back_with_keys_order_and_placeholders(server, client):  # noqa: F811
    server.respond = spanish
    response = upload(client, FORMATS / "app.json")

    assert response.status_code == 200
    body = response.json()
    translated = json.loads(body["content"])
    assert list(translated) == list(json.loads((FORMATS / "app.json").read_text()))
    assert translated["greeting"] == "ES Hello {name}, you have %d messages"
    assert translated["menu"] == {"items": ["ES Open", "ES Save as <b>new</b>", 7], "zebra": "ES Last key first"}
    assert translated["count"] == 3 and translated["blank"] == "" and translated["nothing"] is None
    assert_report(body, 6, server, "json")


def test_yaml_file_keeps_comments_anchors_and_placeholders(server, client):  # noqa: F811
    server.respond = spanish
    response = upload(client, FORMATS / "app.yaml")

    assert response.status_code == 200
    body = response.json()
    content = body["content"]
    assert "# Strings for the settings page" in content
    assert "title: ES My App  # shown in the header" in content
    data = YAML().load(content)
    assert data["greeting"] == "ES Hello {name}"
    assert data["menu"]["items"] == ["ES Open", "ES Save as <b>new</b>"]
    assert data["help"] == "ES First line\nSecond line with %s\n"
    assert body["report"]["segments"] == len(translation_calls(server))
    assert body["report"]["model"] == "translate-model"


def test_po_file_fills_msgstr_and_plural_forms(server, client):  # noqa: F811
    server.respond = spanish
    response = upload(client, FORMATS / "app.po")

    assert response.status_code == 200
    body = response.json()
    po = polib.pofile(body["content"])
    entries = {(e.msgctxt, e.msgid): e for e in po}
    assert entries[(None, "Hello %s")].msgstr == "ES Hello %s"
    assert entries[(None, "Hello %s")].comment == "Extracted comment"
    assert entries[("menu", "Open")].msgstr == "ES Open"
    assert entries[(None, "%d file")].msgstr_plural == {0: "ES %d file", 1: "ES %d files"}
    assert "#~ msgid \"Gone\"" in body["content"]
    assert_report(body, 5, server, "po")


def test_markdown_file_keeps_code_blocks_and_links(server, client):  # noqa: F811
    server.respond = spanish
    source = (FIXTURES / "sample.md").read_text()
    response = upload(client, FIXTURES / "sample.md")

    assert response.status_code == 200
    body = response.json()
    content = body["content"]
    blocks = re.compile(r"^```.*?^```$", re.DOTALL | re.MULTILINE)
    assert blocks.findall(content) == blocks.findall(source)
    assert content.startswith("---\ntitle: Keep me\n---\n\n# ES Getting *started*\n")
    assert '[docs](https://example.com/docs "Docs")' in content
    assert_report(body, 10, server, "markdown")


def test_html_file_keeps_tags_and_attributes(server, client):  # noqa: F811
    server.respond = spanish
    response = upload(client, FIXTURES / "sample.html")

    assert response.status_code == 200
    body = response.json()
    content = body["content"]
    assert '<h1 class="big" title="Do not touch">ES Welcome</h1>' in content
    assert '<a href="https://example.com/?a=1&amp;b=2">ES docs</a>' in content
    assert '<script>var greeting = "Hello <b>";</script>' in content
    assert_report(body, 8, server, "html")


def test_srt_file_keeps_cue_numbers_and_timings(server, client):  # noqa: F811
    server.respond = spanish
    response = upload(client, FORMATS / "sample.srt")

    assert response.status_code == 200
    body = response.json()
    assert body["content"] == (
        "1\n00:00:01,000 --> 00:00:03,500\nES Hello, {name}!\n\n"
        "2\n00:00:04,000 --> 00:00:06,250\nES See you soon.\nTake care.\n"
    )
    assert_report(body, 2, server, "srt")


def test_srt_cue_over_the_line_limit_is_rewrapped(server, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("LLM_SRT_MAX_LINE_CHARS", "10")
    server.respond = spanish
    response = upload(client, FORMATS / "sample.srt")

    assert response.status_code == 200
    lines = response.json()["content"].split("\n")
    assert "00:00:01,000 --> 00:00:03,500" in lines
    assert all(len(line) <= 30 for line in lines)  # the timing line is the longest
    assert all(len(line) <= 10 for line in lines if line and "-->" not in line)


# A failed segment fails the whole file

def test_one_broken_placeholder_returns_an_error_listing_that_segment_and_no_file(server, client):  # noqa: F811
    def renames_the_placeholder(payload):
        segment = segment_of(payload)
        return f"Hola {{nombre}}" if "⟦0⟧" in segment else f"ES {segment}"

    server.respond = renames_the_placeholder
    response = upload(client, FORMATS / "broken_placeholder.json")

    assert response.status_code == 500
    body = response.json()
    assert set(body) == {"error"}
    error = body["error"]
    assert error["type"] == "api_error"
    assert error["segment_errors"] == [{
        "segment": 1,
        "type": "api_error",
        "message": "Segment /greeting: the translation did not keep its placeholders "
                   "(missing {name}; unexpected {nombre}).",
    }]
    assert error["message"].startswith("1 of 2 segments failed, so the file was not translated")
    assert "content" not in json.dumps(body) and "Goodbye" not in json.dumps(body)


def test_model_errors_list_every_failed_segment(server, client):  # noqa: F811
    def fails_the_second_cue(payload):
        if "See you soon" in segment_of(payload):
            return JSONResponse({"error": {"message": "rate limited"}}, status_code=429)
        return spanish(payload)

    server.respond = fails_the_second_cue
    response = upload(client, FORMATS / "sample.srt")

    assert response.status_code == 429
    error = response.json()["error"]
    assert error["type"] == "rate_limit_error"
    assert [e["segment"] for e in error["segment_errors"]] == [2]
    assert error["message"].startswith("1 of 2 segments failed")


# Languages

def test_auto_detect_runs_once_for_the_whole_file(server, client):  # noqa: F811
    server.respond = lambda payload: (
        "English" if DETECT_MARKER in payload["messages"][0]["content"] else spanish(payload)
    )
    response = upload(client, FORMATS / "sample.srt", from_lang="Auto-detect")

    assert response.status_code == 200
    body = response.json()
    assert body["from_lang"] == "Auto-detect"
    detections = [r for r in server.requests if DETECT_MARKER in r["json"]["messages"][0]["content"]]
    assert len(detections) == 1
    assert body["report"]["usage"]["total_tokens"] == 3 * USAGE_PER_CALL
    assert "ES See you soon." in body["content"]


def test_same_language_returns_the_file_unchanged_without_a_model(server, client):  # noqa: F811
    response = upload(client, FORMATS / "app.json", to_lang="english")

    assert response.status_code == 200
    body = response.json()
    assert json.loads(body["content"]) == json.loads((FORMATS / "app.json").read_text())
    assert body["report"]["model"] is None
    assert body["report"]["usage"]["total_tokens"] == 0
    assert server.requests == []


def test_segment_of_placeholders_only_is_not_sent_to_the_model(server, client):  # noqa: F811
    server.respond = spanish
    content = b'{"count": "{count}", "label": "%d items", "title": "Inbox"}'
    response = upload(client, FORMATS / "app.json", content=content)

    assert response.status_code == 200
    assert json.loads(response.json()["content"]) == {"count": "{count}", "label": "ES %d items", "title": "ES Inbox"}
    assert len(translation_calls(server)) == 2


def test_surrounding_whitespace_of_a_value_is_kept(server, client):  # noqa: F811
    server.respond = lambda payload: f"  ES {segment_of(payload).strip()}  "
    response = upload(client, FORMATS / "app.json", content=b'{"a": "  Hello\\n"}')

    assert json.loads(response.json()["content"]) == {"a": "  ES Hello\n"}


# Rejections

def test_unsupported_format_is_a_400_without_the_file_name(server, client):  # noqa: F811
    response = upload(client, FORMATS / "app.json", name="secret-plans.txt")

    assert response.status_code == 400
    error = response.json()["error"]
    assert error["type"] == "bad_request_error"
    assert "secret-plans" not in json.dumps(response.json())
    assert server.requests == []


def test_malformed_file_is_a_400(server, client):  # noqa: F811
    response = upload(client, FORMATS / "app.json", content=b'{"a": ')

    assert response.status_code == 400
    assert response.json()["error"]["message"].startswith("The JSON file is malformed")
    assert server.requests == []


def test_file_over_the_byte_limit_is_a_413(server, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("LLM_MAX_FILE_BYTES", "10")
    response = upload(client, FORMATS / "app.json")

    assert response.status_code == 413
    assert response.json()["error"]["message"] == "The file is larger than LLM_MAX_FILE_BYTES (10 bytes) allows."
    assert server.requests == []


def test_file_with_too_many_segments_is_a_413(server, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("LLM_MAX_SEGMENTS", "2")
    response = upload(client, FORMATS / "app.json")

    assert response.status_code == 413
    assert response.json()["error"]["message"] == "The file has 6 segments, more than LLM_MAX_SEGMENTS (2) allows."
    assert server.requests == []


def test_file_without_segments_comes_back_unchanged(server, client):  # noqa: F811
    response = upload(client, FORMATS / "app.json", content=b'{"count": 3}\n')

    assert response.status_code == 200
    assert response.json()["content"] == '{"count": 3}\n'
    assert response.json()["report"]["segments"] == 0
    assert server.requests == []


def test_missing_target_language_is_a_422(server, client):  # noqa: F811
    response = client.post(
        "/v1/translate/file", data={"from_lang": "English"},
        files={"file": ("app.json", b'{"a": "b"}', "application/json")},
    )
    assert response.status_code == 422


@pytest.mark.parametrize("raw", [b"", b"\xff\xfe\x00bad"])
def test_empty_or_binary_file_is_a_400(server, client, raw):  # noqa: F811
    response = upload(client, FORMATS / "app.json", content=raw)
    assert response.status_code == 400
