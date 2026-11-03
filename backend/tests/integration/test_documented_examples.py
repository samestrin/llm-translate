"""
The glossary and style guide examples in the READMEs and the OpenAPI schema run, and return what they show.

Each documented request is posted to `/v1/translate` against the fake model
endpoint, which answers with the documented translation, model and usage; the
response must then equal the documented response, `glossary_misses` included.
"""
import json
import re
from pathlib import Path

import pytest

from tests.integration.test_v1_api import client, server  # noqa: F401  (fixtures)

REPO = Path(__file__).resolve().parents[3]
EXAMPLE_HEADING = "Glossary and style guide"


def _readme_example(path):
    """The request in the section's curl `-d '...'` and the response in the JSON block after it."""
    text = (REPO / path).read_text()
    section = text.split(f"### {EXAMPLE_HEADING}", 1)[1].split("\n## ", 1)[0].split("\n### ", 1)[0]
    request = re.search(r"-d '(\{.*?\})'", section, re.S).group(1)
    response = re.search(r"```json\n(.*?)```", section, re.S).group(1)
    return json.loads(request), json.loads(response)


def _openapi_examples(client):  # noqa: F811
    op = client.get("/openapi.json").json()["paths"]["/v1/translate"]["post"]
    requests = op["requestBody"]["content"]["application/json"]["examples"]
    responses = op["responses"]["200"]["content"]["application/json"]["examples"]
    assert requests.keys() == responses.keys()
    return [(name, requests[name]["value"], responses[name]["value"]) for name in requests]


def _run(server, client, request, documented, monkeypatch):  # noqa: F811
    """Post `request` with the fake endpoint scripted to give the documented answer."""
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", documented["model"])
    server.translation = documented["translation"]
    server.usage = dict(documented["usage"])
    server.requests.clear()
    response = client.post("/v1/translate", json=request)
    assert response.status_code == 200, response.text
    return response.json(), server.requests[-1]["json"]["messages"][1]["content"]


@pytest.mark.parametrize("path", ["README.md", "backend/README.md"])
def test_readme_glossary_and_style_guide_example_runs(path, server, client, monkeypatch):  # noqa: F811
    request, documented = _readme_example(path)
    assert request["glossary"] and request["style_guide"]
    assert documented["glossary_misses"], "the example should show a reported miss"
    assert "'" not in json.dumps(request, ensure_ascii=False), "a quote would end the shell's -d '...'"

    body, prompt = _run(server, client, request, documented, monkeypatch)

    assert body == documented
    assert "Follow this style guide:" in prompt
    for entry in request["glossary"]:
        assert f'"{entry["source_term"]}"' in prompt


def test_openapi_examples_run(server, client, monkeypatch):  # noqa: F811
    examples = _openapi_examples(client)
    names = {name for name, _, _ in examples}
    assert {"plain", "glossary_and_style_guide"} <= names
    for name, request, documented in examples:
        body, _ = _run(server, client, request, documented, monkeypatch)
        assert body == documented, name


def test_readmes_show_the_openapi_glossary_example(client):  # noqa: F811
    _, request, documented = next(e for e in _openapi_examples(client) if e[0] == "glossary_and_style_guide")
    for path in ("README.md", "backend/README.md"):
        assert _readme_example(path) == (request, documented), path
