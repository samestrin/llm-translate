"""
Unit tests for whole-document mode: a document longer than one segment is
summarized once, each segment is translated with the summary and its
neighbours, and the translations are joined; a failed segment fails the whole
request and an over-limit document is rejected before any call.
"""
import pytest
from starlette.responses import JSONResponse

from llm_translate.services.glossary import GlossaryEntry, GlossaryMiss
from llm_translate.services.llm_client import LLMClient, Usage
from llm_translate.services.llm_translator import SEGMENT_MARKER, LLMTranslator
from llm_translate.utils.config import load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import DETECT_MARKER, SUMMARY_MARKER, FakeOpenAIServer

ENV = {
    "LLM_BASE_URL": "http://llm.local/v1",
    "LLM_TRANSLATE_MODEL": "fast",
    "LLM_REVIEW_MODEL": "careful",
    "LLM_SEGMENT_MAX_CHARS": "80",
    "LLM_MAX_SEGMENTS": "10",
}

PARAGRAPHS = [f"Segment {n}: the widget section {n} explains how the widget works." for n in range(1, 11)]
DOCUMENT = "\n\n".join(PARAGRAPHS)
SUMMARY = "A manual for the widget. Key terms: widget -> artilugio."


def segment_of(payload):
    """The segment a translation request asks for (not its neighbours)."""
    prompt = payload["messages"][1]["content"]
    return prompt.rsplit(SEGMENT_MARKER, 1)[1].split(': "', 1)[1][:-1]


def is_summary(payload):
    return SUMMARY_MARKER in payload["messages"][0]["content"]


def segment_requests(server):
    return [r["json"] for r in server.requests if not is_summary(r["json"])
            and DETECT_MARKER not in r["json"]["messages"][0]["content"]]


def drifting_model(payload):
    """
    A model that names the widget "artilugio" when the prompt says so, and
    otherwise drifts between two other words from segment to segment.
    """
    if is_summary(payload):
        return SUMMARY
    segment = segment_of(payload)
    prompt = payload["messages"][1]["content"]
    if "widget -> artilugio" in prompt:
        term = "artilugio"
    else:
        term = "aparato" if int(segment.split()[1].rstrip(":")) % 2 else "dispositivo"
    return segment.replace("widget", term).replace("Segment", "Segmento")


async def translate(server, text=DOCUMENT, env=None, **kwargs):
    async with server.http_client() as http:
        translator = LLMTranslator(LLMClient(load_llm_settings({**ENV, **(env or {})}), http_client=http))
        return await translator.translate_structured(
            text, kwargs.pop("from_lang", "English"), kwargs.pop("to_lang", "Spanish"), **kwargs
        )


@pytest.mark.asyncio
async def test_ten_segments_keep_terms_consistent():
    server = FakeOpenAIServer()
    server.respond = drifting_model

    result = await translate(server)

    assert len(segment_requests(server)) == 10
    assert result.text.count("artilugio") == 20
    assert "aparato" not in result.text and "dispositivo" not in result.text
    expected = [p.replace("widget", "artilugio").replace("Segment", "Segmento") for p in PARAGRAPHS]
    assert result.text == "\n\n".join(expected)


@pytest.mark.asyncio
async def test_the_summary_is_one_extra_call_on_the_translate_tier():
    server = FakeOpenAIServer()
    server.respond = drifting_model

    result = await translate(server)

    summaries = [r["json"] for r in server.requests if is_summary(r["json"])]
    assert len(summaries) == 1
    assert len(server.requests) == 11
    assert summaries[0]["model"] == "fast"
    assert DOCUMENT in summaries[0]["messages"][1]["content"]
    assert all(r["json"]["model"] == "fast" for r in server.requests)
    assert result.model == "fast"


@pytest.mark.asyncio
async def test_each_segment_is_sent_with_the_summary_and_its_neighbours():
    server = FakeOpenAIServer()
    server.respond = drifting_model

    await translate(server)

    prompts = {segment_of(r): r["messages"][1]["content"] for r in segment_requests(server)}
    assert set(prompts) == set(PARAGRAPHS)
    for prompt in prompts.values():
        assert SUMMARY in prompt
        assert "from English to Spanish" in prompt
    first, middle, last = prompts[PARAGRAPHS[0]], prompts[PARAGRAPHS[4]], prompts[PARAGRAPHS[9]]
    assert "Previous segment" not in first and PARAGRAPHS[1] in first
    assert PARAGRAPHS[3] in middle and PARAGRAPHS[5] in middle
    assert PARAGRAPHS[2] not in middle and PARAGRAPHS[6] not in middle
    assert PARAGRAPHS[8] in last and "Next segment" not in last


@pytest.mark.asyncio
async def test_usage_sums_the_summary_and_every_segment():
    server = FakeOpenAIServer()
    server.respond = drifting_model
    server.usage = {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}

    result = await translate(server)

    assert result.usage == Usage(prompt_tokens=33, completion_tokens=22, total_tokens=55)


@pytest.mark.asyncio
async def test_auto_detect_runs_once_on_the_first_segment():
    server = FakeOpenAIServer(detected_language="English")
    respond = drifting_model
    server.respond = lambda p: "English" if DETECT_MARKER in p["messages"][0]["content"] else respond(p)

    result = await translate(server, from_lang="Auto-detect")

    detects = [r["json"] for r in server.requests if DETECT_MARKER in r["json"]["messages"][0]["content"]]
    assert len(detects) == 1
    assert PARAGRAPHS[0] in detects[0]["messages"][1]["content"]
    assert PARAGRAPHS[1] not in detects[0]["messages"][1]["content"]
    assert len(server.requests) == 12
    assert "artilugio" in result.text


@pytest.mark.asyncio
async def test_the_same_language_shortcut_needs_no_summary():
    server = FakeOpenAIServer()
    result = await translate(server, from_lang="English", to_lang="english")
    assert result.text == DOCUMENT
    assert server.requests == []


@pytest.mark.asyncio
async def test_text_within_one_segment_makes_no_summary_call():
    server = FakeOpenAIServer(translation="Hola")
    result = await translate(server, text="Hello")
    assert result.text == "Hola"
    assert len(server.requests) == 1
    assert SEGMENT_MARKER not in server.requests[0]["json"]["messages"][1]["content"]


@pytest.mark.asyncio
async def test_glossary_reaches_the_segments_that_use_it_and_misses_cover_the_document():
    server = FakeOpenAIServer()
    server.respond = lambda p: SUMMARY if is_summary(p) else segment_of(p)
    glossary = [
        GlossaryEntry(source_term="section 3", target_term="sección 3"),
        GlossaryEntry(source_term="widget", target_term="artilugio"),
    ]

    result = await translate(server, glossary=glossary)

    prompts = {segment_of(r): r["messages"][1]["content"] for r in segment_requests(server)}
    assert '"section 3" -> "sección 3"' in prompts[PARAGRAPHS[2]]
    assert '"section 3"' not in prompts[PARAGRAPHS[4]]
    assert all('"widget" -> "artilugio"' in prompt for prompt in prompts.values())
    assert result.glossary_misses == [
        GlossaryMiss(term="section 3", expected="sección 3"),
        GlossaryMiss(term="widget", expected="artilugio"),
    ]


def failing_on(*numbers, response=None):
    """A model that fails the segments with the given numbers and echoes every other one."""
    def respond(payload):
        if is_summary(payload):
            return SUMMARY
        segment = segment_of(payload)
        if int(segment.split()[1].rstrip(":")) in numbers:
            return response or JSONResponse({"error": {"message": "boom"}}, status_code=500)
        return segment
    return respond


@pytest.mark.asyncio
async def test_one_failing_segment_fails_the_request_and_lists_it():
    server = FakeOpenAIServer()
    server.respond = failing_on(4)

    with pytest.raises(TranslationError) as excinfo:
        await translate(server)

    error = excinfo.value
    assert error.status_code == 500
    assert error.error_type == ErrorType.API_ERROR
    assert "segment 4 of 10" in error.message
    assert error.segment_errors == [{
        "segment": 4,
        "type": "api_error",
        "message": "Model endpoint error (HTTP 500). Please try again later.",
    }]
    assert error.to_dict()["error"]["segment_errors"] == error.segment_errors
    assert len(segment_requests(server)) == 10


@pytest.mark.asyncio
async def test_every_failing_segment_is_listed_in_order():
    server = FakeOpenAIServer()
    server.respond = failing_on(2, 7, response=JSONResponse({"error": {}}, status_code=429))

    with pytest.raises(TranslationError) as excinfo:
        await translate(server)

    error = excinfo.value
    assert [e["segment"] for e in error.segment_errors] == [2, 7]
    assert {e["type"] for e in error.segment_errors} == {"rate_limit_error"}
    assert error.status_code == 429
    assert "2 of 10 segments failed" in error.message


@pytest.mark.asyncio
async def test_an_empty_segment_answer_fails_the_request():
    server = FakeOpenAIServer()
    server.respond = lambda p: SUMMARY if is_summary(p) else ("  " if "Segment 5:" in segment_of(p) else "ok")

    with pytest.raises(TranslationError) as excinfo:
        await translate(server)

    assert [e["segment"] for e in excinfo.value.segment_errors] == [5]
    assert excinfo.value.segment_errors[0]["message"] == "The model returned an empty translation."


@pytest.mark.asyncio
@pytest.mark.parametrize("answer", ["", "   "])
async def test_an_empty_summary_fails_before_any_segment(answer):
    server = FakeOpenAIServer()
    server.summary = answer

    with pytest.raises(TranslationError) as excinfo:
        await translate(server)

    assert excinfo.value.status_code == 500
    assert excinfo.value.error_type == ErrorType.API_ERROR
    assert len(server.requests) == 1


@pytest.mark.asyncio
async def test_a_failed_summary_call_fails_before_any_segment():
    server = FakeOpenAIServer()
    server.status = 503

    with pytest.raises(TranslationError) as excinfo:
        await translate(server)

    assert excinfo.value.segment_errors is None
    assert len(server.requests) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("env,setting", [
    ({"LLM_MAX_SEGMENTS": "5"}, "LLM_MAX_SEGMENTS"),
    ({"LLM_SEGMENT_MAX_CHARS": "40"}, "LLM_SEGMENT_MAX_CHARS"),
])
async def test_an_over_limit_document_is_rejected_before_any_call(env, setting):
    server = FakeOpenAIServer()

    with pytest.raises(TranslationError) as excinfo:
        await translate(server, env=env, from_lang="Auto-detect")

    assert excinfo.value.status_code == 413
    assert excinfo.value.error_type == ErrorType.PAYLOAD_TOO_LARGE
    assert setting in excinfo.value.message
    assert server.requests == []


@pytest.mark.asyncio
async def test_an_unexpected_segment_failure_is_raised_as_is():
    server = FakeOpenAIServer()
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)
        translator = LLMTranslator(client)
        complete = client.complete

        async def flaky(messages, **kwargs):
            if SEGMENT_MARKER in messages[1]["content"] and "Segment 6:" in segment_of({"messages": messages}):
                raise RuntimeError("boom")
            return await complete(messages, **kwargs)
        client.complete = flaky

        with pytest.raises(RuntimeError, match="boom"):
            await translator.translate_structured(DOCUMENT, "English", "Spanish")


@pytest.mark.asyncio
async def test_detect_summary_and_segment_calls_all_run_at_temperature_zero():
    server = FakeOpenAIServer(detected_language="English")
    server.respond = lambda payload: (
        "English" if DETECT_MARKER in payload["messages"][0]["content"] else drifting_model(payload)
    )

    await translate(server, from_lang="Auto-detect")

    assert len(server.requests) == 12
    assert [r["json"]["temperature"] for r in server.requests] == [0] * 12
