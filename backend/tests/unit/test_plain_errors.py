"""
Plain-word errors for a refused key, a used-up or expired demo code and a rate limit (epic 08 T3).

One test per case, on both clients: the shared wording, and a planted key echoed
in an upstream body reaching neither the error message nor the captured logs.
"""
import logging

import pytest

from llm_translate.services.llm_client import LLMClient
from llm_translate.services.presets import resolve_access
from llm_translate.services.tts_client import TTSClient
from llm_translate.utils.config import load_llm_settings, load_tts_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import FakeOpenAIServer

KEY = "sk-test-PLANTED-plain-4242"
CODE = "demo-PLANTED-plain-777"
MESSAGES = [{"role": "user", "content": "Hello"}]
DEMO_ENV = {
    "DEMO_GATEWAY_URL": "http://gateway.internal:4000/v1",
    "DEMO_TRANSLATE_MODEL": "demo-translate",
    "DEMO_TTS_MODEL": "demo-tts",
}
KINDS = ["llm", "tts"]


@pytest.fixture
def server():
    return FakeOpenAIServer()


def _settings(kind, credential="preset", preset="openai"):
    """The request-scoped settings a visitor's preset key or demo code builds."""
    access = (resolve_access(preset, KEY) if credential == "preset"
              else resolve_access(demo_code=CODE, env=DEMO_ENV))
    return access.llm_settings({}) if kind == "llm" else access.tts_settings({})


async def _call(kind, settings, http):
    if kind == "llm":
        return await LLMClient(settings, http_client=http).chat(MESSAGES)
    return await TTSClient(settings, http_client=http).speak("Hi", "English")


async def _error(kind, settings, server):
    async with server.http_client() as http:
        with pytest.raises(TranslationError) as info:
            await _call(kind, settings, http)
    return info.value


# The shared wording

@pytest.mark.asyncio
@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("preset,label", [("openai", "OpenAI"), ("alibaba", "Alibaba (DashScope intl)")])
@pytest.mark.parametrize("status", [401, 403])
async def test_a_rejected_key_says_the_provider_rejected_it(server, kind, preset, label, status):
    server.status = status
    error = await _error(kind, _settings(kind, preset=preset), server)
    assert error.message == f"The key was rejected by {label}"
    assert error.error_type == ErrorType.AUTHENTICATION
    assert error.status_code == (401 if kind == "llm" else status)


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("preset,label", [("openai", "OpenAI"), ("alibaba", "Alibaba (DashScope intl)")])
async def test_a_rate_limit_says_the_provider_is_rate_limiting(server, kind, preset, label):
    server.status = 429
    error = await _error(kind, _settings(kind, preset=preset), server)
    assert error.message == f"{label} is rate limiting this key. Try again shortly."
    assert error.error_type == ErrorType.RATE_LIMIT
    assert error.status_code == 429


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("status", [401, 403])
async def test_an_expired_or_revoked_demo_code_says_used_up_or_expired(server, kind, status):
    server.status = status
    error = await _error(kind, _settings(kind, credential="demo"), server)
    assert error.message == "This demo code is used up or expired"
    assert error.error_type == ErrorType.AUTHENTICATION
    assert error.status_code == (401 if kind == "llm" else status)


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", KINDS)
async def test_a_used_up_demo_code_budget_says_used_up_or_expired(server, kind):
    """The gateway reports a spent budget as 429; a demo code never gets the provider rate-limit wording."""
    server.status = 429
    error = await _error(kind, _settings(kind, credential="demo"), server)
    assert error.message == "This demo code is used up or expired"
    assert error.error_type == ErrorType.RATE_LIMIT
    assert error.status_code == 429


# The env key (no preset) gets the same wording, with the vendor it can name

@pytest.mark.asyncio
@pytest.mark.parametrize("env,label", [
    ({"AI_SOURCE": "openai", "OPENAI_API_KEY": KEY}, "OpenAI"),
    ({"AI_SOURCE": "groq", "GROQ_API_KEY": KEY}, "Groq"),
    ({"LLM_BASE_URL": "http://llm.local/v1", "LLM_API_KEY": KEY}, "the model provider"),
])
@pytest.mark.parametrize("status", [401, 429])
async def test_an_env_key_error_names_the_vendor_or_the_model_provider(server, env, label, status):
    server.status = status
    error = await _error("llm", load_llm_settings(env), server)
    expected = (f"The key was rejected by {label}" if status == 401
                else f"{label} is rate limiting this key. Try again shortly.")
    assert error.message == expected


@pytest.mark.asyncio
@pytest.mark.parametrize("env,label", [
    ({"TTS_SOURCE": "groq", "GROQ_API_KEY": KEY}, "Groq"),
    ({"TTS_BASE_URL": "http://tts.local/v1", "TTS_API_KEY": KEY}, "the speech provider"),
    ({"AI_SOURCE": "openai", "OPENAI_API_KEY": KEY}, "OpenAI"),  # speech shares the LLM_* endpoint
])
@pytest.mark.parametrize("status", [401, 429])
async def test_an_env_speech_key_error_names_the_vendor_or_the_speech_provider(server, env, label, status):
    server.status = status
    error = await _error("tts", load_tts_settings(env), server)
    expected = (f"The key was rejected by {label}" if status == 401
                else f"{label} is rate limiting this key. Try again shortly.")
    assert error.message == expected


# A planted key echoed upstream reaches neither the message nor the logs

@pytest.mark.asyncio
@pytest.mark.parametrize("kind", KINDS)
@pytest.mark.parametrize("credential", ["preset", "demo"])
@pytest.mark.parametrize("status", [400, 401, 403, 429, 500])
async def test_a_planted_key_echoed_in_an_error_body_reaches_neither_message_nor_logs(
    server, kind, credential, status, caplog
):
    caplog.set_level(logging.DEBUG)
    server.status = status
    server.body = {"error": {
        "message": f"Incorrect API key provided: {KEY} (demo code {CODE}). "
                   "You can find your API key at https://platform.openai.com/account/api-keys.",
    }}
    error = await _error(kind, _settings(kind, credential=credential), server)
    for secret in (KEY, CODE):
        assert secret not in error.message
        assert secret not in str(error.to_dict())
        assert secret not in caplog.text
    assert f"HTTP {status}" in caplog.text  # the status is still logged


@pytest.mark.asyncio
async def test_a_planted_key_in_a_malformed_success_body_is_not_logged(server, caplog):
    """A 200 answer that breaks the completion schema is an error, and its body is not logged either."""
    caplog.set_level(logging.DEBUG)
    server.body = {"choices": [], "echo": f"{KEY} {CODE}"}
    error = await _error("llm", _settings("llm"), server)
    assert error.error_type == ErrorType.API_ERROR
    for secret in (KEY, CODE):
        assert secret not in str(error.to_dict())
        assert secret not in caplog.text
