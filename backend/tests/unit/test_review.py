"""
Unit tests for the review: the `review` tier compares source, translation and
back-translation and answers errors as structured output, against the fake server.
"""
import json
from pathlib import Path

import httpx
import pytest
from pydantic import ValidationError

from llm_translate.review import (
    ERROR_CATEGORIES,
    SEVERITIES,
    UNREADABLE_REVIEW,
    ReviewAnswer,
    ReviewError,
    SegmentReview,
    review_segment,
    review_segments,
)
from llm_translate.services.llm_client import LLMClient, Usage
from llm_translate.utils.config import load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import REVIEW_MARKER, FakeOpenAIServer, raising_client

ENV = {
    "LLM_BASE_URL": "http://llm.local/v1",
    "LLM_API_KEY": "key",
    "LLM_TRANSLATE_MODEL": "fast",
    "LLM_REVIEW_MODEL": "careful",
}

PLANTED = json.loads((Path(__file__).parent.parent / "fixtures" / "review" / "planted_meaning_error.json").read_text())


async def run(server, call):
    async with server.http_client() as http:
        return await call(LLMClient(load_llm_settings(ENV), http_client=http))


def review_one(source="Hello", translation="Hola", back_translation="Hello"):
    return lambda client: review_segment(client, source, translation, back_translation, "English", "Spanish")


def sent_texts(body):
    """The source, translation and back-translation the review prompt carries."""
    user = body["messages"][1]["content"]
    return json.loads(user[user.index("{"):user.rindex("}") + 1])


# --- the schema ---------------------------------------------------------------

def test_the_categories_and_severities_are_the_planned_ones():
    assert ERROR_CATEGORIES == ("meaning", "terminology", "fluency", "style", "format")
    assert SEVERITIES == ("minor", "major", "critical")


def test_the_json_schema_lists_every_category_and_severity_and_requires_each_field():
    schema = ReviewAnswer.model_json_schema()
    error = schema["$defs"]["ReviewError"]

    assert schema["required"] == ["errors"]
    assert sorted(error["required"]) == ["category", "explanation", "severity"]
    assert error["properties"]["category"]["enum"] == list(ERROR_CATEGORIES)
    assert error["properties"]["severity"]["enum"] == list(SEVERITIES)


@pytest.mark.parametrize("category", ERROR_CATEGORIES)
@pytest.mark.parametrize("severity", SEVERITIES)
def test_every_category_and_severity_is_accepted(category, severity):
    error = ReviewError(category=category, severity=severity, explanation="why")

    assert (error.category, error.severity) == (category, severity)


@pytest.mark.parametrize("bad", [
    {"category": "grammar", "severity": "minor", "explanation": "why"},
    {"category": "meaning", "severity": "fatal", "explanation": "why"},
    {"category": "Meaning", "severity": "minor", "explanation": "why"},
    {"severity": "minor", "explanation": "why"},
    {"category": "meaning", "explanation": "why"},
    {"category": "meaning", "severity": "minor"},
    {"category": "meaning", "severity": "minor", "explanation": ""},
    {"category": "meaning", "severity": "minor", "explanation": 3},
])
def test_an_error_outside_the_schema_is_rejected(bad):
    with pytest.raises(ValidationError):
        ReviewError.model_validate(bad)


@pytest.mark.parametrize("bad", [{}, {"errors": None}, {"errors": "none"}, {"errors": [{}]}, []])
def test_an_answer_outside_the_schema_is_rejected(bad):
    with pytest.raises(ValidationError):
        ReviewAnswer.model_validate(bad)


def test_no_errors_is_a_valid_answer():
    assert ReviewAnswer.model_validate({"errors": []}).errors == []


@pytest.mark.asyncio
async def test_the_prompt_carries_the_schema_the_answer_is_read_with():
    server = FakeOpenAIServer()

    await run(server, review_one())

    system = server.requests[0]["json"]["messages"][0]["content"]
    assert json.dumps(ReviewAnswer.model_json_schema()) in system


# --- the planted meaning error ------------------------------------------------

@pytest.mark.asyncio
async def test_a_planted_meaning_error_is_returned_scored():
    server = FakeOpenAIServer()
    server.usage = {"prompt_tokens": 40, "completion_tokens": 20, "total_tokens": 60}

    def reviewer(body):
        # Answer only if the reviewer was shown all three texts of the fixture.
        assert sent_texts(body) == {
            "source": PLANTED["source"],
            "translation": PLANTED["translation"],
            "back_translation": PLANTED["back_translation"],
        }
        return json.dumps(PLANTED["review_answer"])
    server.respond = reviewer

    result = await run(server, lambda client: review_segment(
        client, PLANTED["source"], PLANTED["translation"], PLANTED["back_translation"],
        PLANTED["source_lang"], PLANTED["target_lang"],
    ))

    assert result.flag is None
    assert result.model == "careful"
    assert result.usage == Usage(prompt_tokens=40, completion_tokens=20, total_tokens=60)
    meaning = [error for error in result.errors if error.category == PLANTED["planted"]["category"]]
    assert len(meaning) == 1
    assert meaning[0].severity == PLANTED["planted"]["severity"]
    assert "negation" in meaning[0].explanation
    assert [(error.category, error.severity) for error in result.errors] == [
        ("meaning", "critical"), ("style", "minor")
    ]


@pytest.mark.asyncio
async def test_the_review_runs_on_the_review_tier_with_the_languages():
    server = FakeOpenAIServer()

    await run(server, review_one())

    assert len(server.requests) == 1
    sent = server.requests[0]["json"]
    assert sent["model"] == "careful"
    assert sent["temperature"] == 0.0
    assert REVIEW_MARKER in sent["messages"][0]["content"]
    assert "from English into Spanish" in sent["messages"][1]["content"]


@pytest.mark.asyncio
async def test_quotes_and_braces_in_the_texts_reach_the_reviewer_intact():
    server = FakeOpenAIServer()
    source = 'Say "hi" {name}\nthen } leave'

    await run(server, review_one(source=source, translation='Di "hola" {name}', back_translation="Say hi"))

    assert sent_texts(server.requests[0]["json"]) == {
        "source": source, "translation": 'Di "hola" {name}', "back_translation": "Say hi",
    }


@pytest.mark.asyncio
async def test_a_clean_segment_has_no_errors_and_no_flag():
    server = FakeOpenAIServer()

    result = await run(server, review_one())

    assert result == SegmentReview(errors=[], flag=None, model="careful", usage=Usage(**server.usage))


@pytest.mark.asyncio
@pytest.mark.parametrize("fenced", [
    '```json\n{"errors": [{"category": "fluency", "severity": "major", "explanation": "stiff"}]}\n```',
    '```\n{"errors": [{"category": "fluency", "severity": "major", "explanation": "stiff"}]}\n```',
    '  {"errors": [{"category": "fluency", "severity": "major", "explanation": "stiff"}]}  ',
])
async def test_an_answer_in_a_code_fence_is_read(fenced):
    server = FakeOpenAIServer()
    server.review = fenced

    result = await run(server, review_one())

    assert result.flag is None
    assert [(error.category, error.severity) for error in result.errors] == [("fluency", "major")]


# --- an unreadable review flags the segment -----------------------------------

@pytest.mark.asyncio
@pytest.mark.parametrize("answer", [
    "",
    "Looks fine to me.",
    '{"errors": [',
    '["meaning"]',
    '{"verdict": "ok"}',
    '{"errors": [{"category": "grammar", "severity": "minor", "explanation": "x"}]}',
    '{"errors": [{"category": "meaning", "severity": "huge", "explanation": "x"}]}',
    'Here is my review: {"errors": []}',
])
async def test_an_answer_that_is_not_valid_structured_output_flags_the_segment(answer):
    server = FakeOpenAIServer()
    server.review = answer
    server.usage = {"prompt_tokens": 5, "completion_tokens": 1, "total_tokens": 6}

    result = await run(server, review_one())

    assert result.flag == UNREADABLE_REVIEW == "review could not be read"
    assert result.errors == []
    assert result.model == "careful"
    assert result.usage == Usage(prompt_tokens=5, completion_tokens=1, total_tokens=6)


# --- an endpoint failure fails the request ------------------------------------

@pytest.mark.asyncio
async def test_an_http_error_from_the_review_endpoint_is_raised():
    server = FakeOpenAIServer()
    server.status = 503

    with pytest.raises(TranslationError) as excinfo:
        await run(server, review_one())

    assert excinfo.value.error_type == ErrorType.API_ERROR


@pytest.mark.asyncio
@pytest.mark.parametrize("exc, error_type, status", [
    (lambda request: httpx.ReadTimeout("slow", request=request), ErrorType.TIMEOUT, 504),
    (lambda request: httpx.ConnectError("refused", request=request), ErrorType.CONNECTION, 503),
])
async def test_a_timeout_or_connection_failure_is_raised(exc, error_type, status):
    async with raising_client(exc) as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)
        with pytest.raises(TranslationError) as excinfo:
            await review_segment(client, "Hello", "Hola", "Hello", "English", "Spanish")

    assert (excinfo.value.error_type, excinfo.value.status_code) == (error_type, status)


# --- every segment -------------------------------------------------------------

def per_segment(answers):
    """Answer each review by the source text it carries."""
    return lambda body: answers[sent_texts(body)["source"]]


@pytest.mark.asyncio
async def test_every_segment_is_reviewed_in_order():
    server = FakeOpenAIServer()
    server.respond = per_segment({
        "One": '{"errors": []}',
        "Two": '{"errors": [{"category": "terminology", "severity": "minor", "explanation": "term"}]}',
        "Three": "not json",
    })

    results = await run(server, lambda client: review_segments(
        client, ["One", "Two", "Three"], ["Uno", "Dos", "Tres"], ["One", "Two", "Three"], "English", "Spanish"
    ))

    assert [result.flag for result in results] == [None, None, UNREADABLE_REVIEW]
    assert [[error.category for error in result.errors] for result in results] == [[], ["terminology"], []]
    assert len(server.requests) == 3
    assert {request["json"]["model"] for request in server.requests} == {"careful"}
    assert [sent_texts(request["json"])["translation"] for request in server.requests] == ["Uno", "Dos", "Tres"]


@pytest.mark.asyncio
async def test_no_segments_make_no_calls():
    server = FakeOpenAIServer()

    assert await run(server, lambda client: review_segments(client, [], [], [], "English", "Spanish")) == []
    assert server.requests == []


@pytest.mark.asyncio
async def test_lists_of_different_lengths_are_refused():
    server = FakeOpenAIServer()

    with pytest.raises(ValueError):
        await run(server, lambda client: review_segments(client, ["One"], ["Uno", "Dos"], ["One"], "English", "Spanish"))
    assert server.requests == []


@pytest.mark.asyncio
async def test_a_review_endpoint_failure_on_any_segment_fails_the_whole_request():
    server = FakeOpenAIServer()
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)
        complete = client.complete

        async def failing(messages, **kwargs):
            if sent_texts({"messages": messages})["source"] in ("Two", "Three"):
                raise TranslationError("The model endpoint did not answer.", ErrorType.TIMEOUT, 504)
            return await complete(messages, **kwargs)
        client.complete = failing

        with pytest.raises(TranslationError) as excinfo:
            await review_segments(
                client, ["One", "Two", "Three"], ["Uno", "Dos", "Tres"], ["One", "Two", "Three"], "English", "Spanish"
            )

    error = excinfo.value
    assert (error.error_type, error.status_code) == (ErrorType.TIMEOUT, 504)
    assert [failure["segment"] for failure in error.segment_errors] == [2, 3]
    assert "2 of 3 segments could not be reviewed" in error.message


@pytest.mark.asyncio
async def test_an_unexpected_segment_failure_is_raised_as_is():
    server = FakeOpenAIServer()
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)

        async def broken(messages, **kwargs):
            raise RuntimeError("boom")
        client.complete = broken

        with pytest.raises(RuntimeError, match="boom"):
            await review_segments(client, ["One"], ["Uno"], ["One"], "English", "Spanish")
