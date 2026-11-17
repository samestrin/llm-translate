"""
Speech by preset: `POST /v1/speak` uses the preset's TTS model, and a preset
without one is a 400 `speech_not_available` — never a fallback to another provider.
"""
import pytest

from llm_translate.services.presets import load_presets
from tests.fake_openai_server import AUDIO_BODIES
# The fake-endpoint fixtures from the credential tests: every outgoing request lands
# on the fake, and the env endpoint holds the owner's key.
from tests.integration.test_model_access import KEY, SPEAK, client, public, server  # noqa: F401

NO_SPEECH = ["openrouter", "synthetic", "alibaba"]


@pytest.mark.parametrize("preset", NO_SPEECH)
def test_a_preset_without_speech_is_a_400_speech_not_available(public, client, preset):  # noqa: F811
    headers = {"X-Model-Preset": preset, "X-Model-Key": KEY}

    response = client.post("/v1/speak", headers=headers, json=SPEAK)
    alias = client.post("/speak", headers=headers, json=SPEAK)

    assert response.status_code == 400
    error = response.json()["error"]
    assert error["type"] == "speech_not_available"
    assert load_presets()[preset].label in error["message"]
    assert error["details"] is None
    # The deprecated alias keeps its `{"detail": "..."}` body, with the same status and words.
    assert alias.status_code == 400
    assert set(alias.json()) == {"detail"}
    assert load_presets()[preset].label in alias.json()["detail"]
    assert public.requests == []


def test_demo_without_a_tts_model_is_a_400_speech_not_available(public, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("DEMO_TTS_MODEL", "")

    response = client.post("/v1/speak", headers={"X-Demo-Code": "demo-code-1"}, json=SPEAK)
    alias = client.post("/speak", headers={"X-Demo-Code": "demo-code-1"}, json=SPEAK)

    assert response.status_code == 400
    assert response.json()["error"]["type"] == "speech_not_available"
    assert alias.status_code == 400
    assert set(alias.json()) == {"detail"}
    assert public.requests == []


@pytest.mark.parametrize("preset", NO_SPEECH)
def test_no_speech_falls_back_to_the_env_endpoint_when_not_public(server, client, preset):  # noqa: F811
    """Even with a working `TTS_*`/`LLM_*` endpoint in the env, a preset without speech never reaches it."""
    headers = {"X-Model-Preset": preset, "X-Model-Key": KEY}

    response = client.post("/v1/speak", headers=headers, json=SPEAK)
    alias = client.post("/speak", headers=headers, json=SPEAK)

    assert (response.status_code, alias.status_code) == (400, 400)
    assert response.json()["error"]["type"] == "speech_not_available"
    assert server.requests == []


def test_demo_without_a_tts_model_does_not_fall_back_when_not_public(server, client, monkeypatch):  # noqa: F811
    monkeypatch.setenv("DEMO_TTS_MODEL", "")

    response = client.post("/v1/speak", headers={"X-Demo-Code": "demo-code-1"}, json=SPEAK)

    assert response.status_code == 400
    assert response.json()["error"]["type"] == "speech_not_available"
    assert server.requests == []


def test_a_preset_with_speech_uses_the_preset_endpoint_even_when_the_env_has_one(server, client):  # noqa: F811
    response = client.post("/v1/speak", headers={"X-Model-Preset": "openai", "X-Model-Key": KEY}, json=SPEAK)

    assert response.status_code == 200
    assert response.content == AUDIO_BODIES["mp3"]
    assert [(r["url"], r["json"]["model"], r["headers"].get("authorization")) for r in server.requests] == [
        ("https://api.openai.com/v1/audio/speech", "gpt-4o-mini-tts", f"Bearer {KEY}"),
    ]
