"""
`GET /v1/presets`: the mode and the presets the page may offer, from the one
presets file — never a base URL or a credential.
"""
from dataclasses import replace

import pytest

import llm_translate.services.presets as presets_module
from llm_translate.services.presets import Preset, load_presets
# The fake-endpoint fixtures from the credential tests (the endpoint itself calls no model).
from tests.integration.test_model_access import KEY, client, public, server  # noqa: F401

PLANTED = {
    "LLM_API_KEY": "sk-ENV-owner-key-0000",
    "TTS_API_KEY": "sk-ENV-tts-key-1111",
    "TTS_BASE_URL": "http://tts.internal:9000/v1",
}


def _expected(presets, demo_tts):
    return [
        {"id": p.id, "label": p.label,
         "speech": (demo_tts if p.id == "demo" else p.tts_model) is not None}
        for p in presets.values()
    ]


def test_presets_lists_the_file_presets_with_speech_flags(server, client):  # noqa: F811
    response = client.get("/v1/presets")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"public_demo", "presets"}
    assert body["public_demo"] is False
    # The server fixture sets DEMO_TTS_MODEL=demo-tts, so demo has speech here.
    assert body["presets"] == _expected(load_presets(), "demo-tts")
    assert [p["id"] for p in body["presets"]] == ["openai", "openrouter", "synthetic", "alibaba", "demo"]
    assert {p["id"]: p["speech"] for p in body["presets"]} == {
        "openai": True, "openrouter": False, "synthetic": False, "alibaba": False, "demo": True,
    }


def test_public_demo_is_reported_and_no_credentials_are_needed(public, client):  # noqa: F811
    response = client.get("/v1/presets")

    assert response.status_code == 200
    assert response.json()["public_demo"] is True
    assert public.requests == []


@pytest.mark.parametrize("value,expected", [("demo-tts", True), ("", False), (None, False)])
def test_demo_speech_follows_the_demo_tts_model(server, client, monkeypatch, value, expected):  # noqa: F811
    if value is None:
        monkeypatch.delenv("DEMO_TTS_MODEL", raising=False)
    else:
        monkeypatch.setenv("DEMO_TTS_MODEL", value)

    body = client.get("/v1/presets").json()

    assert next(p for p in body["presets"] if p["id"] == "demo")["speech"] is expected


def test_the_body_has_no_url_or_key(public, client, monkeypatch):  # noqa: F811
    for name, value in PLANTED.items():
        monkeypatch.setenv(name, value)
    headers = {"X-Model-Preset": "openai", "X-Model-Key": KEY, "X-Demo-Code": "demo-PLANTED-code-5150"}

    response = client.get("/v1/presets", headers=headers)

    assert response.status_code == 200
    text = response.text
    for secret in [*PLANTED.values(), KEY, "demo-PLANTED-code-5150", "http://gateway.internal:4000/v1"]:
        assert secret not in text
    assert "base_url" not in text and "http" not in text and "api_key" not in text
    assert all(set(p) == {"id", "label", "speech"} for p in response.json()["presets"])


def test_the_endpoint_reads_the_one_presets_file(server, client, monkeypatch):  # noqa: F811
    """A changed presets file changes the answer: the list is not hardcoded in the route."""
    twin = Preset(id="twin", label="Twin", base_url="https://twin.example/v1",
                  translate_model="twin-chat", review_model="twin-chat", tts_model="twin-tts")
    quiet = replace(twin, id="quiet", label="Quiet", tts_model=None)
    monkeypatch.setattr(presets_module, "load_presets", lambda: {"twin": twin, "quiet": quiet})

    body = client.get("/v1/presets").json()

    assert body["presets"] == [
        {"id": "twin", "label": "Twin", "speech": True},
        {"id": "quiet", "label": "Quiet", "speech": False},
    ]


def test_a_misspelled_public_demo_is_a_500_configuration_error(server, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("PUBLIC_DEMO", "ture")

    response = client.get("/v1/presets")

    assert response.status_code == 500
    assert response.json()["error"]["type"] == "configuration_error"
