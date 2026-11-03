"""
Unit tests for back-translation: each translated segment is translated back
into the source language on the `translate` tier, against the fake server.
"""
import pytest

from llm_translate.review import BackTranslation, back_translate, back_translate_segments
from llm_translate.services.llm_client import LLMClient, Usage
from llm_translate.utils.config import load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import BACK_TRANSLATION_MARKER, FakeOpenAIServer

ENV = {
    "LLM_BASE_URL": "http://llm.local/v1",
    "LLM_API_KEY": "key",
    "LLM_TRANSLATE_MODEL": "fast",
    "LLM_REVIEW_MODEL": "careful",
}


async def run(server, call):
    async with server.http_client() as http:
        return await call(LLMClient(load_llm_settings(ENV), http_client=http))


@pytest.mark.asyncio
async def test_back_translates_on_the_translate_tier_into_the_source_language():
    server = FakeOpenAIServer()
    server.back_translation = "Good morning"
    server.usage = {"prompt_tokens": 7, "completion_tokens": 3, "total_tokens": 10}

    result = await run(server, lambda client: back_translate(client, "Buenos días", "English", "Spanish"))

    assert result == BackTranslation(
        text="Good morning", model="fast", usage=Usage(prompt_tokens=7, completion_tokens=3, total_tokens=10)
    )
    assert len(server.requests) == 1
    sent = server.requests[0]["json"]
    assert sent["model"] == "fast"
    assert sent["temperature"] == 0.0
    assert BACK_TRANSLATION_MARKER in sent["messages"][0]["content"]
    assert "from Spanish back to English" in sent["messages"][1]["content"]
    assert '"Buenos días"' in sent["messages"][1]["content"]


@pytest.mark.asyncio
async def test_the_scripted_answer_is_the_back_translation():
    server = FakeOpenAIServer(translation="SHOULD NOT BE USED")
    server.respond = lambda body: '  "The cat is on the roof."  '

    result = await run(server, lambda client: back_translate(client, "Le chat est sur le toit.", "English", "French"))

    assert result.text == "The cat is on the roof."


@pytest.mark.asyncio
async def test_an_empty_answer_is_an_error():
    server = FakeOpenAIServer()
    server.back_translation = "   "

    with pytest.raises(TranslationError) as excinfo:
        await run(server, lambda client: back_translate(client, "Hola", "English", "Spanish"))

    assert excinfo.value.error_type == ErrorType.API_ERROR
    assert excinfo.value.status_code == 500


@pytest.mark.asyncio
async def test_an_endpoint_failure_is_raised():
    server = FakeOpenAIServer()
    server.status = 503

    with pytest.raises(TranslationError) as excinfo:
        await run(server, lambda client: back_translate(client, "Hola", "English", "Spanish"))

    assert excinfo.value.error_type == ErrorType.API_ERROR


@pytest.mark.asyncio
async def test_every_segment_is_back_translated_in_order():
    server = FakeOpenAIServer()
    answers = {"Hola": "Hello", "Adiós": "Goodbye", "Gracias": "Thank you"}
    server.respond = lambda body: next(
        back for source, back in answers.items() if f'"{source}"' in body["messages"][1]["content"]
    )

    results = await run(server, lambda client: back_translate_segments(
        client, ["Hola", "Adiós", "Gracias"], "English", "Spanish"
    ))

    assert [result.text for result in results] == ["Hello", "Goodbye", "Thank you"]
    assert len(server.requests) == 3
    assert {request["json"]["model"] for request in server.requests} == {"fast"}


@pytest.mark.asyncio
async def test_no_segments_make_no_calls():
    server = FakeOpenAIServer()

    assert await run(server, lambda client: back_translate_segments(client, [], "English", "Spanish")) == []
    assert server.requests == []


@pytest.mark.asyncio
async def test_failed_segments_are_all_listed():
    server = FakeOpenAIServer()
    server.respond = lambda body: "" if '"Adiós"' in body["messages"][1]["content"] \
        or '"Gracias"' in body["messages"][1]["content"] else "Hello"

    with pytest.raises(TranslationError) as excinfo:
        await run(server, lambda client: back_translate_segments(
            client, ["Hola", "Adiós", "Gracias"], "English", "Spanish"
        ))

    error = excinfo.value
    assert error.status_code == 500
    assert [failure["segment"] for failure in error.segment_errors] == [2, 3]
    assert "2 of 3 segments could not be back-translated" in error.message


@pytest.mark.asyncio
async def test_an_unexpected_segment_failure_is_raised_as_is():
    server = FakeOpenAIServer()
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)
        complete = client.complete

        async def flaky(messages, **kwargs):
            if '"Adiós"' in messages[1]["content"]:
                raise RuntimeError("boom")
            return await complete(messages, **kwargs)
        client.complete = flaky

        with pytest.raises(RuntimeError, match="boom"):
            await back_translate_segments(client, ["Hola", "Adiós"], "English", "Spanish")
