"""
Unit tests for revision: a segment the reviewer rates major or critical is revised
once on the `review` tier, then back-translated and reviewed again; one still
rated major or critical is flagged with the reason. Against the fake server.
"""
import json
from pathlib import Path

import httpx
import pytest
from starlette.responses import JSONResponse

from llm_translate.review import (
    EMPTY_REVISION,
    STILL_WRONG,
    UNREADABLE_REVIEW,
    CheckedSegment,
    ReviewError,
    ReviewStep,
    check_segment,
    check_segments,
    needs_revision,
    revise,
)
from llm_translate.services.llm_client import LLMClient, Usage
from llm_translate.utils.config import load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import (
    BACK_TRANSLATION_MARKER,
    REVIEW_MARKER,
    REVISION_MARKER,
    FakeOpenAIServer,
    raising_client,
)

ENV = {
    "LLM_BASE_URL": "http://llm.local/v1",
    "LLM_API_KEY": "key",
    "LLM_TRANSLATE_MODEL": "fast",
    "LLM_REVIEW_MODEL": "careful",
}

PLANTED = json.loads((Path(__file__).parent.parent / "fixtures" / "review" / "planted_meaning_error.json").read_text())

CLEAN = '{"errors": []}'


def errors(*pairs):
    """A review answer with one error per (category, severity) pair."""
    return json.dumps({"errors": [
        {"category": category, "severity": severity, "explanation": f"{severity} {category} problem"}
        for category, severity in pairs
    ]})


async def run(server, call):
    async with server.http_client() as http:
        return await call(LLMClient(load_llm_settings(ENV), http_client=http))


def kind(body):
    system = body["messages"][0]["content"]
    if REVISION_MARKER in system:
        return "revision"
    if REVIEW_MARKER in system:
        return "review"
    if BACK_TRANSLATION_MARKER in system:
        return "back_translation"
    return "translation"


def script(server, reviews, revision="Revisada", back_translations=("Hello", "Hello revised")):
    """Answer the reviews, back-translations and revision in the order they are asked."""
    queues = {"review": list(reviews), "back_translation": list(back_translations), "revision": [revision]}

    def respond(body):
        return queues[kind(body)].pop(0)
    server.respond = respond


def kinds(server):
    return [kind(request["json"]) for request in server.requests]


def payload(body):
    """The JSON data a review or revision prompt carries."""
    user = body["messages"][1]["content"]
    return json.loads(user[user.index("{"):user.rindex("}") + 1])


def check_one(source="Hello", translation="Hola"):
    return lambda client: check_segment(client, source, translation, "English", "Spanish")


def check_planted(client):
    return check_segment(client, PLANTED["source"], PLANTED["translation"], PLANTED["source_lang"], PLANTED["target_lang"])


def serious(result):
    return [error for error in result.errors if error.severity in ("major", "critical")]


# --- which errors call for a revision ------------------------------------------

@pytest.mark.parametrize("severities, expected", [
    ([], False),
    (["minor"], False),
    (["minor", "minor"], False),
    (["major"], True),
    (["critical"], True),
    (["minor", "critical"], True),
])
def test_only_major_or_critical_errors_call_for_a_revision(severities, expected):
    found = [ReviewError(category="meaning", severity=severity, explanation="why") for severity in severities]

    assert needs_revision(found) is expected


# --- the planted error: fixed or flagged, never silent ---------------------------

@pytest.mark.asyncio
async def test_a_planted_error_that_the_revision_fixes_comes_back_revised_and_unflagged():
    server = FakeOpenAIServer()
    script(
        server,
        reviews=[json.dumps(PLANTED["review_answer"]), CLEAN],
        revision=PLANTED["revision"],
        back_translations=[PLANTED["back_translation"], PLANTED["revision_back_translation"]],
    )

    result = await run(server, check_planted)

    assert result.translation == PLANTED["revision"]
    assert result.revised is True
    assert result.flag is None
    assert result.errors == []
    assert kinds(server) == ["back_translation", "review", "revision", "back_translation", "review"]
    # The second review saw the revised text and its own back-translation.
    assert payload(server.requests[4]["json"]) == {
        "source": PLANTED["source"],
        "translation": PLANTED["revision"],
        "back_translation": PLANTED["revision_back_translation"],
    }
    assert PLANTED["revision"] in server.requests[3]["json"]["messages"][1]["content"]


@pytest.mark.asyncio
async def test_a_planted_error_the_revision_does_not_fix_is_flagged_with_the_reason():
    server = FakeOpenAIServer()
    still = {"errors": [PLANTED["review_answer"]["errors"][0]]}
    script(server, reviews=[json.dumps(PLANTED["review_answer"]), json.dumps(still)], revision="Tómelo en ayunas.")

    result = await run(server, check_planted)

    assert result.translation == "Tómelo en ayunas."
    assert result.revised is True
    assert result.flag.startswith(STILL_WRONG)
    assert "critical meaning" in result.flag
    assert "negation is lost" in result.flag
    assert [(error.category, error.severity) for error in result.errors] == [("meaning", "critical")]


@pytest.mark.asyncio
async def test_a_segment_is_revised_once_only():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical")), errors(("meaning", "critical"))])

    result = await run(server, check_one())

    assert kinds(server).count("revision") == 1
    assert kinds(server).count("review") == 2
    assert result.flag is not None


@pytest.mark.asyncio
@pytest.mark.parametrize("severity", ["major", "critical"])
async def test_a_major_or_critical_error_is_revised(severity):
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("fluency", severity)), CLEAN])

    result = await run(server, check_one())

    assert result.revised is True
    assert result.translation == "Revisada"
    assert result.flag is None


@pytest.mark.asyncio
@pytest.mark.parametrize("severity", ["major", "critical"])
async def test_a_revision_still_rated_major_or_critical_is_flagged(severity):
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical")), errors(("style", "minor"), ("terminology", severity))])

    result = await run(server, check_one())

    assert result.flag == f"{STILL_WRONG}: {severity} terminology error: {severity} terminology problem"
    assert result.translation == "Revisada"


@pytest.mark.asyncio
async def test_every_remaining_serious_error_is_named_in_the_flag():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical")), errors(("meaning", "critical"), ("format", "major"))])

    result = await run(server, check_one())

    assert result.flag == (
        f"{STILL_WRONG}: critical meaning error: critical meaning problem; major format error: major format problem"
    )


@pytest.mark.asyncio
async def test_a_revision_left_with_minor_errors_is_not_flagged_and_keeps_them():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical")), errors(("style", "minor"))])

    result = await run(server, check_one())

    assert result.flag is None
    assert result.translation == "Revisada"
    assert [(error.category, error.severity) for error in result.errors] == [("style", "minor")]


# Never silent: whatever the reviews and the revision answer, a delivered
# translation rated major or critical carries a flag, and a segment whose first
# review is major or critical comes back revised or flagged.
SERIOUS = [errors(("meaning", "major")), errors(("meaning", "critical"))]
ANSWERS = [CLEAN, errors(("style", "minor")), *SERIOUS, "not json"]


@pytest.mark.asyncio
@pytest.mark.parametrize("first", ANSWERS)
@pytest.mark.parametrize("second", ANSWERS)
@pytest.mark.parametrize("revision", ["Revisada", "  "])
async def test_a_serious_error_is_never_delivered_silently(first, second, revision):
    server = FakeOpenAIServer()
    script(server, reviews=[first, second], revision=revision)

    result = await run(server, check_one())

    assert result.flag or not serious(result)
    if first in SERIOUS:
        assert result.revised or result.flag
    if first == "not json":
        assert result.flag == UNREADABLE_REVIEW


# --- segments that need no revision -----------------------------------------------

@pytest.mark.asyncio
async def test_a_clean_segment_is_not_revised():
    server = FakeOpenAIServer()
    script(server, reviews=[CLEAN])

    result = await run(server, check_one())

    assert result == CheckedSegment(
        translation="Hola",
        revised=False,
        errors=[],
        flag=None,
        steps=[
            ReviewStep(step="back_translation", model="fast", usage=Usage(**server.usage)),
            ReviewStep(step="review", model="careful", usage=Usage(**server.usage)),
        ],
    )
    assert kinds(server) == ["back_translation", "review"]


@pytest.mark.asyncio
async def test_a_segment_with_only_minor_errors_is_not_revised_and_keeps_them():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("style", "minor"), ("fluency", "minor"))])

    result = await run(server, check_one())

    assert result.revised is False
    assert result.translation == "Hola"
    assert result.flag is None
    assert [error.category for error in result.errors] == ["style", "fluency"]
    assert "revision" not in kinds(server)


# --- unreadable reviews and empty revisions --------------------------------------

@pytest.mark.asyncio
async def test_an_unreadable_first_review_flags_the_original_without_a_revision():
    server = FakeOpenAIServer()
    script(server, reviews=["Looks fine."])

    result = await run(server, check_one())

    assert (result.translation, result.revised, result.flag) == ("Hola", False, UNREADABLE_REVIEW)
    assert kinds(server) == ["back_translation", "review"]


@pytest.mark.asyncio
async def test_an_unreadable_second_review_flags_the_revised_text():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical")), "Looks fine."])

    result = await run(server, check_one())

    assert (result.translation, result.revised, result.flag) == ("Revisada", True, UNREADABLE_REVIEW)
    assert result.errors == []


@pytest.mark.asyncio
@pytest.mark.parametrize("empty", ["", "   ", '""'])
async def test_an_empty_revision_keeps_the_original_and_flags_it(empty):
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical"))], revision=empty)

    result = await run(server, check_one())

    assert result.translation == "Hola"
    assert result.revised is False
    assert result.flag == f"{EMPTY_REVISION}: critical meaning error: critical meaning problem"
    assert [(error.category, error.severity) for error in result.errors] == [("meaning", "critical")]
    assert kinds(server) == ["back_translation", "review", "revision"]


# --- the revision call ---------------------------------------------------------------

@pytest.mark.asyncio
async def test_the_revision_runs_on_the_review_tier_with_the_source_translation_and_errors():
    server = FakeOpenAIServer()
    server.revision = '"Adiós"'
    found = [ReviewError(category="meaning", severity="critical", explanation="It says hello, not goodbye.")]

    result = await run(server, lambda client: revise(client, 'Say "bye" {name}', "Hola", found, "English", "Spanish"))

    assert result.text == "Adiós"
    assert result.model == "careful"
    assert result.usage == Usage(**server.usage)
    sent = server.requests[0]["json"]
    assert sent["model"] == "careful"
    assert sent["temperature"] == 0.0
    assert REVISION_MARKER in sent["messages"][0]["content"]
    assert "from English into Spanish" in sent["messages"][1]["content"]
    assert payload(sent) == {
        "source": 'Say "bye" {name}',
        "translation": "Hola",
        "errors": [{"category": "meaning", "severity": "critical", "explanation": "It says hello, not goodbye."}],
    }


@pytest.mark.asyncio
async def test_each_step_records_its_model_and_tokens_in_order():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical")), CLEAN])
    server.usage = {"prompt_tokens": 3, "completion_tokens": 2, "total_tokens": 5}

    result = await run(server, check_one())

    assert [(step.step, step.model) for step in result.steps] == [
        ("back_translation", "fast"), ("review", "careful"), ("revision", "careful"),
        ("back_translation", "fast"), ("review", "careful"),
    ]
    assert {step.usage for step in result.steps} == {Usage(prompt_tokens=3, completion_tokens=2, total_tokens=5)}


@pytest.mark.asyncio
async def test_an_http_error_on_the_revision_is_raised():
    server = FakeOpenAIServer()
    script(server, reviews=[errors(("meaning", "critical"))])
    respond = server.respond

    def failing(body):
        if kind(body) == "revision":
            return JSONResponse({"error": {"message": "down"}}, status_code=503)
        return respond(body)
    server.respond = failing

    with pytest.raises(TranslationError) as excinfo:
        await run(server, check_one())

    assert excinfo.value.error_type == ErrorType.API_ERROR


@pytest.mark.asyncio
async def test_a_timeout_on_the_revision_is_raised():
    async with raising_client(lambda request: httpx.ReadTimeout("slow", request=request)) as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)
        found = [ReviewError(category="meaning", severity="major", explanation="why")]
        with pytest.raises(TranslationError) as excinfo:
            await revise(client, "Hello", "Hola", found, "English", "Spanish")

    assert (excinfo.value.error_type, excinfo.value.status_code) == (ErrorType.TIMEOUT, 504)


# --- every segment -----------------------------------------------------------------

def by_source(answers):
    """Answer each call by the segment it is about; the second review gets the second answer."""
    seen = {}

    def respond(body):
        step = kind(body)
        if step == "back_translation":
            text = body["messages"][1]["content"]
            return "Back " + text[text.index('"') + 1:-1]
        if step == "revision":
            return "Revised " + payload(body)["source"]
        source = payload(body)["source"]
        seen[source] = seen.get(source, 0) + 1
        return answers[source][seen[source] - 1]
    return respond


@pytest.mark.asyncio
async def test_every_segment_is_checked_in_order_and_a_flag_does_not_fail_the_request():
    server = FakeOpenAIServer()
    server.respond = by_source({
        "One": [CLEAN],
        "Two": [errors(("meaning", "critical")), CLEAN],
        "Three": [errors(("meaning", "critical")), errors(("meaning", "major"))],
    })

    results = await run(server, lambda client: check_segments(
        client, ["One", "Two", "Three"], ["Uno", "Dos", "Tres"], "English", "Spanish"
    ))

    assert [result.translation for result in results] == ["Uno", "Revised Two", "Revised Three"]
    assert [result.revised for result in results] == [False, True, True]
    assert [result.flag is None for result in results] == [True, True, False]
    assert results[2].flag.startswith(STILL_WRONG)


@pytest.mark.asyncio
async def test_no_segments_make_no_calls():
    server = FakeOpenAIServer()

    assert await run(server, lambda client: check_segments(client, [], [], "English", "Spanish")) == []
    assert server.requests == []


@pytest.mark.asyncio
async def test_lists_of_different_lengths_are_refused():
    server = FakeOpenAIServer()

    with pytest.raises(ValueError):
        await run(server, lambda client: check_segments(client, ["One"], ["Uno", "Dos"], "English", "Spanish"))
    assert server.requests == []


@pytest.mark.asyncio
async def test_an_endpoint_failure_on_any_segment_fails_the_whole_request():
    server = FakeOpenAIServer()
    server.respond = by_source({"One": [CLEAN], "Two": [errors(("meaning", "critical"))]})
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)
        complete = client.complete

        async def failing(messages, **kwargs):
            if kind({"messages": messages}) == "revision":
                raise TranslationError("The model endpoint did not answer.", ErrorType.TIMEOUT, 504)
            return await complete(messages, **kwargs)
        client.complete = failing

        with pytest.raises(TranslationError) as excinfo:
            await check_segments(client, ["One", "Two"], ["Uno", "Dos"], "English", "Spanish")

    error = excinfo.value
    assert (error.error_type, error.status_code) == (ErrorType.TIMEOUT, 504)
    assert [failure["segment"] for failure in error.segment_errors] == [2]
    assert "1 of 2 segments could not be reviewed" in error.message


@pytest.mark.asyncio
async def test_an_unexpected_segment_failure_is_raised_as_is():
    server = FakeOpenAIServer()
    async with server.http_client() as http:
        client = LLMClient(load_llm_settings(ENV), http_client=http)

        async def broken(messages, **kwargs):
            raise RuntimeError("boom")
        client.complete = broken

        with pytest.raises(RuntimeError, match="boom"):
            await check_segments(client, ["One"], ["Uno"], "English", "Spanish")
