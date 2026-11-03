"""
Unit tests for the OpenAI-compatible client, against the fake server.
"""
import asyncio

import httpx
import pytest

from llm_translate.services.llm_client import LLMClient, Usage
from llm_translate.utils.config import load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import FakeOpenAIServer, completion, raising_client

MESSAGES = [{"role": "system", "content": "s"}, {"role": "user", "content": "u"}]
TWO_TIERS = {
    "LLM_BASE_URL": "http://llm.local/v1",
    "LLM_API_KEY": "sk-test-secret",
    "LLM_TRANSLATE_MODEL": "fast",
    "LLM_REVIEW_MODEL": "careful",
}


@pytest.fixture
def server():
    return FakeOpenAIServer(translation="answer")


@pytest.mark.asyncio
@pytest.mark.parametrize("tier,model", [("translate", "fast"), ("review", "careful")])
async def test_each_tier_calls_its_own_model(server, tier, model):
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(TWO_TIERS), http_client=http)
        assert client.model_for(tier) == model
        assert await client.chat(MESSAGES, tier=tier) == "answer"
    assert server.requests[0]["json"]["model"] == model
    assert server.requests[0]["json"]["messages"] == MESSAGES


@pytest.mark.asyncio
async def test_default_tier_is_translate(server):
    async with server.http_client() as http:
        await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES)
    assert server.requests[0]["json"]["model"] == "fast"


@pytest.mark.asyncio
async def test_unknown_tier_is_rejected_before_any_call(server):
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(TWO_TIERS), http_client=http)
        with pytest.raises(ValueError, match="tier"):
            await client.chat(MESSAGES, tier="draft")
    assert server.requests == []


@pytest.mark.asyncio
async def test_temperature_is_sent(server):
    async with server.http_client() as http:
        await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES, temperature=0.1)
    assert server.requests[0]["json"]["temperature"] == 0.1


@pytest.mark.asyncio
async def test_timeout_from_env_is_applied_to_the_request(server):
    async with server.http_client() as http:
        await LLMClient(load_llm_settings({**TWO_TIERS, "LLM_TIMEOUT": "7"}), http_client=http).chat(MESSAGES)
    assert server.timeouts[0] == {"connect": 7.0, "read": 7.0, "write": 7.0, "pool": 7.0}


@pytest.mark.asyncio
async def test_concurrency_from_env_caps_requests_in_flight(server):
    server.delay = 0.05
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings({**TWO_TIERS, "LLM_MAX_CONCURRENCY": "2"}), http_client=http)
        results = await asyncio.gather(*(client.chat(MESSAGES) for _ in range(6)))
    assert results == ["answer"] * 6
    assert server.peak_in_flight == 2


@pytest.mark.asyncio
async def test_without_injected_client_it_opens_its_own(monkeypatch, server):
    """The production path (no http_client passed) builds its own httpx client per call."""
    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        "llm_translate.services.llm_client.httpx.AsyncClient",
        lambda **kwargs: real_client(transport=httpx.ASGITransport(app=server.app), **kwargs),
    )
    assert await LLMClient(load_llm_settings(TWO_TIERS)).chat(MESSAGES) == "answer"
    assert server.requests[0]["url"] == "http://llm.local/v1/chat/completions"


@pytest.mark.asyncio
@pytest.mark.parametrize("status,error_type,status_code", [
    (401, ErrorType.AUTHENTICATION, 401),
    (403, ErrorType.AUTHENTICATION, 401),
    (429, ErrorType.RATE_LIMIT, 429),
    (400, ErrorType.BAD_REQUEST, 400),
    (404, ErrorType.API_ERROR, 500),
    (500, ErrorType.API_ERROR, 500),
    (503, ErrorType.API_ERROR, 500),
])
async def test_http_errors_map_to_translation_errors(server, status, error_type, status_code):
    server.status = status
    async with server.http_client() as http:
        with pytest.raises(TranslationError) as excinfo:
            await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES)
    assert excinfo.value.error_type == error_type
    assert excinfo.value.status_code == status_code
    assert "sk-test-secret" not in excinfo.value.message


@pytest.mark.asyncio
@pytest.mark.parametrize("body", [
    {},
    {"choices": []},
    {"choices": [{"message": {}}]},
    {"choices": [{"message": {"content": None}}]},
    ["not", "an", "object"],
])
async def test_malformed_answers_are_errors(server, body):
    server.body = body
    async with server.http_client() as http:
        with pytest.raises(TranslationError) as excinfo:
            await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES)
    assert excinfo.value.error_type == ErrorType.API_ERROR


@pytest.mark.asyncio
async def test_non_json_answer_is_an_error():
    def handler(request):
        return httpx.Response(200, text="<html>gateway</html>")

    async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as http:
        with pytest.raises(TranslationError) as excinfo:
            await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES)
    assert excinfo.value.error_type == ErrorType.API_ERROR


@pytest.mark.asyncio
async def test_timeout_is_reported_as_timeout():
    async with raising_client(lambda r: httpx.ReadTimeout("slow", request=r)) as http:
        with pytest.raises(TranslationError) as excinfo:
            await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES)
    assert excinfo.value.error_type == ErrorType.TIMEOUT
    assert excinfo.value.status_code == 504


@pytest.mark.asyncio
async def test_unreachable_endpoint_is_reported_as_connection_error():
    async with raising_client(lambda r: httpx.ConnectError("refused", request=r)) as http:
        with pytest.raises(TranslationError) as excinfo:
            await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).chat(MESSAGES)
    assert excinfo.value.error_type == ErrorType.CONNECTION
    assert excinfo.value.status_code == 503


def test_shared_client_is_reused_while_settings_are_unchanged(monkeypatch):
    """One client per configuration, so LLM_MAX_CONCURRENCY caps every request the app makes."""
    from unittest.mock import patch
    from llm_translate.services.llm_client import get_llm_client

    monkeypatch.setenv("LLM_BASE_URL", "http://llm.local/v1")
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "first")
    with patch("llm_translate.utils.config.load_dotenv"):
        first = get_llm_client()
        assert get_llm_client() is first
        monkeypatch.setenv("LLM_TRANSLATE_MODEL", "second")
        changed = get_llm_client()
    assert changed is not first
    assert changed.settings.translate_model == "second"


@pytest.mark.asyncio
async def test_complete_returns_content_model_and_usage(server):
    server.usage = {"prompt_tokens": 12, "completion_tokens": 3, "total_tokens": 15}
    async with server.http_client() as http:
        result = await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).complete(MESSAGES, tier="review")
    assert result.content == "answer"
    assert result.model == "careful"
    assert result.usage == Usage(prompt_tokens=12, completion_tokens=3, total_tokens=15)


@pytest.mark.asyncio
async def test_complete_reports_the_model_the_endpoint_names(server):
    """A router may answer with a more specific model than the one asked for."""
    server.body = {**completion("answer"), "model": "fast-2026-01"}
    async with server.http_client() as http:
        result = await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).complete(MESSAGES)
    assert result.model == "fast-2026-01"


@pytest.mark.asyncio
@pytest.mark.parametrize("missing", [{"model": None}, {"model": ""}, {"usage": None}])
async def test_complete_fills_in_what_the_endpoint_leaves_out(server, missing):
    """Some OpenAI-compatible servers send no model name or no usage."""
    body = completion("answer", model="fast")
    for key, value in missing.items():
        if value is None:
            del body[key]
        else:
            body[key] = value
    server.body = body
    async with server.http_client() as http:
        result = await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).complete(MESSAGES)
    assert result.content == "answer"
    assert result.model == "fast"
    if "usage" in missing:
        assert result.usage == Usage()


@pytest.mark.asyncio
@pytest.mark.parametrize("body", [
    {**completion("answer"), "choices": [{"message": {"content": 42}}]},
    {**completion("answer"), "choices": [{"message": {"content": ["a"]}}]},
    {**completion("answer"), "choices": "answer"},
    {**completion("answer"), "model": 7},
    {**completion("answer"), "usage": {"prompt_tokens": -1, "completion_tokens": 1, "total_tokens": 0}},
    {**completion("answer"), "usage": {"prompt_tokens": "many", "completion_tokens": 1, "total_tokens": 2}},
    {**completion("answer"), "usage": "lots"},
])
async def test_answers_that_break_the_schema_are_errors(server, body):
    server.body = body
    async with server.http_client() as http:
        with pytest.raises(TranslationError) as excinfo:
            await LLMClient(load_llm_settings(TWO_TIERS), http_client=http).complete(MESSAGES)
    assert excinfo.value.error_type == ErrorType.API_ERROR
    assert excinfo.value.status_code == 500


def test_usage_adds_up():
    total = Usage(prompt_tokens=1, completion_tokens=2, total_tokens=3) + Usage(
        prompt_tokens=10, completion_tokens=20, total_tokens=30
    )
    assert total == Usage(prompt_tokens=11, completion_tokens=22, total_tokens=33)
