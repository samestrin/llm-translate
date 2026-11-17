"""
The opt-in preset checker: keys only from the environment, one short sentence
per preset, pass/fail/skip per check, and never a key in the output.
"""
import httpx
import pytest
from starlette.responses import JSONResponse

from scripts.check_presets import KEY_VARS, SENTENCE, Check, format_checks, main, redact, run_checks
from tests.fake_openai_server import FakeOpenAIServer

KEY = "sk-PLANTED-check-presets-0123456789"
CODE = "demo-PLANTED-code-9876543210"
DEMO_ENV = {
    "DEMO_GATEWAY_URL": "http://gateway.internal:4000/v1",
    "DEMO_TRANSLATE_MODEL": "demo-translate",
    "DEMO_TTS_MODEL": "demo-tts",
}


def _env(**extra):
    """A checker environment with no provider key set unless the test plants one."""
    return {**extra}


def _statuses(checks):
    return {(c.preset, c.kind): c.status for c in checks}


# Keys come only from the environment

def test_key_vars_follow_the_preset_ids():
    assert KEY_VARS == {
        "openai": "OPENAI_API_KEY",
        "openrouter": "OPENROUTER_API_KEY",
        "synthetic": "SYNTHETIC_API_KEY",
        "alibaba": "ALIBABA_API_KEY",
        "demo": "DEMO_CODE",
    }


@pytest.mark.asyncio
async def test_the_env_key_is_sent_as_the_bearer_token():
    fake = FakeOpenAIServer()

    await run_checks(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client())

    assert fake.requests, "the checker called the endpoint"
    assert all(r["headers"]["authorization"] == f"Bearer {KEY}" for r in fake.requests)


@pytest.mark.asyncio
async def test_each_check_sends_one_short_sentence_with_the_presets_models():
    fake = FakeOpenAIServer()

    await run_checks(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client())

    chat = [r for r in fake.requests if r["url"].endswith("/chat/completions")]
    speech = [r for r in fake.requests if r["url"].endswith("/audio/speech")]
    assert len(chat) == 1 and len(speech) == 1
    assert chat[0]["json"]["model"] == "gpt-5-nano"
    assert any(SENTENCE in m["content"] for m in chat[0]["json"]["messages"])
    assert speech[0]["json"]["model"] == "gpt-4o-mini-tts"
    assert speech[0]["json"]["input"] == SENTENCE


# A planted fake key never appears in the output

def test_a_planted_key_never_appears_in_the_output_on_success(capfd):
    fake = FakeOpenAIServer()

    code = main(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client())

    out, err = capfd.readouterr()
    assert code == 0
    assert KEY not in out and KEY not in err
    assert "openai" in out and "PASS" in out


def test_a_planted_key_echoed_in_an_upstream_error_never_appears_in_the_output(capfd):
    fake = FakeOpenAIServer()
    fake.status = 401
    fake.body = {"error": {"message": f"Incorrect API key provided: {KEY}"}}

    code = main(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client())

    out, err = capfd.readouterr()
    assert code == 1
    assert KEY not in out and KEY not in err
    assert "FAIL" in out


def test_a_planted_demo_code_never_appears_in_the_output(capfd):
    fake = FakeOpenAIServer()
    fake.status = 401
    fake.body = {"error": {"message": f"bad code {CODE}"}}

    code = main(_env(DEMO_CODE=CODE, **DEMO_ENV), http_client=fake.http_client())

    out, err = capfd.readouterr()
    assert code == 1
    assert CODE not in out and CODE not in err


def test_redact_replaces_every_secret():
    text = f"key={KEY} code={CODE} and {KEY} again"

    cleaned = redact(text, [KEY, CODE])

    assert KEY not in cleaned and CODE not in cleaned
    assert cleaned.count("[redacted]") == 3


def test_format_checks_redacts_the_detail():
    checks = [Check("openai", "translate", "FAIL", f"upstream said {KEY}")]

    lines = format_checks(checks, [KEY])

    assert KEY not in "\n".join(lines)
    assert "FAIL" in lines[0]


# An unset key is reported as skipped

@pytest.mark.asyncio
async def test_an_unset_key_is_skipped_and_nothing_is_called():
    fake = FakeOpenAIServer()

    checks = await run_checks(_env(), http_client=fake.http_client())

    assert checks and all(c.status == "SKIP" for c in checks)
    assert fake.requests == []
    assert all("is not set" in c.detail for c in checks)


def test_an_unset_key_names_the_variable_to_set(capfd):
    fake = FakeOpenAIServer()

    code = main(_env(), http_client=fake.http_client())

    out, _ = capfd.readouterr()
    assert code == 0
    assert "SKIP" in out
    for var in KEY_VARS.values():
        assert var in out


@pytest.mark.asyncio
async def test_one_unset_key_does_not_skip_the_others():
    fake = FakeOpenAIServer()

    checks = await run_checks(_env(OPENROUTER_API_KEY=KEY), http_client=fake.http_client())

    statuses = _statuses(checks)
    assert statuses[("openrouter", "translate")] == "PASS"
    assert statuses[("openai", "translate")] == "SKIP"


# A failing preset is reported as a failure

@pytest.mark.asyncio
async def test_a_failing_preset_is_a_failure_and_other_presets_still_run():
    fake = FakeOpenAIServer()

    def respond(payload):
        if payload["model"] == "gpt-5-nano":
            return JSONResponse({"error": {"message": "boom"}}, status_code=500)
        return "Hola"

    fake.respond = respond
    checks = await run_checks(
        _env(OPENAI_API_KEY=KEY, OPENROUTER_API_KEY=KEY), http_client=fake.http_client()
    )

    statuses = _statuses(checks)
    assert statuses[("openai", "translate")] == "FAIL"
    assert statuses[("openrouter", "translate")] == "PASS"


def test_a_failure_gives_exit_code_1_and_a_pass_gives_0(capfd):
    fake = FakeOpenAIServer()
    fake.status = 500

    assert main(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client()) == 1
    capfd.readouterr()

    fake.status = 200
    assert main(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client()) == 0


@pytest.mark.asyncio
async def test_an_empty_answer_is_a_failure():
    fake = FakeOpenAIServer()
    fake.respond = lambda payload: ""

    checks = await run_checks(_env(OPENAI_API_KEY=KEY), http_client=fake.http_client())

    assert _statuses(checks)[("openai", "translate")] == "FAIL"


@pytest.mark.asyncio
async def test_a_failing_speak_check_is_a_failure():
    fake = FakeOpenAIServer()

    async def fail_speech(scope, receive, send):
        if scope["path"].endswith("/audio/speech"):
            await JSONResponse({"error": {"message": "no tts"}}, status_code=400)(scope, receive, send)
        else:
            await fake.app(scope, receive, send)

    client = httpx.AsyncClient(transport=httpx.ASGITransport(app=fail_speech))
    checks = await run_checks(_env(OPENAI_API_KEY=KEY), http_client=client)

    statuses = _statuses(checks)
    assert statuses[("openai", "translate")] == "PASS"
    assert statuses[("openai", "speak")] == "FAIL"


# Speech only where the preset has it

@pytest.mark.asyncio
async def test_speak_runs_only_for_presets_with_a_speech_model():
    fake = FakeOpenAIServer()

    checks = await run_checks(
        _env(OPENAI_API_KEY=KEY, OPENROUTER_API_KEY=KEY, SYNTHETIC_API_KEY=KEY, ALIBABA_API_KEY=KEY),
        http_client=fake.http_client(),
    )

    statuses = _statuses(checks)
    assert statuses[("openai", "speak")] == "PASS"
    for preset in ("openrouter", "synthetic", "alibaba"):
        assert statuses[(preset, "speak")] == "SKIP"
        assert statuses[(preset, "translate")] == "PASS"
    speech = [r for r in fake.requests if r["url"].endswith("/audio/speech")]
    assert len(speech) == 1 and speech[0]["json"]["model"] == "gpt-4o-mini-tts"


# The demo code

@pytest.mark.asyncio
async def test_a_demo_code_uses_the_gateway_and_demo_models():
    fake = FakeOpenAIServer()

    checks = await run_checks(_env(DEMO_CODE=CODE, **DEMO_ENV), http_client=fake.http_client())

    statuses = _statuses(checks)
    assert statuses[("demo", "translate")] == "PASS"
    assert statuses[("demo", "speak")] == "PASS"
    assert all(r["headers"]["authorization"] == f"Bearer {CODE}" for r in fake.requests)
    chat = [r for r in fake.requests if r["url"].endswith("/chat/completions")]
    assert chat[0]["json"]["model"] == "demo-translate"


@pytest.mark.asyncio
async def test_demo_without_a_tts_model_skips_speech():
    fake = FakeOpenAIServer()
    env = _env(DEMO_CODE=CODE, **{k: v for k, v in DEMO_ENV.items() if k != "DEMO_TTS_MODEL"})

    checks = await run_checks(env, http_client=fake.http_client())

    statuses = _statuses(checks)
    assert statuses[("demo", "translate")] == "PASS"
    assert statuses[("demo", "speak")] == "SKIP"


@pytest.mark.asyncio
async def test_a_demo_code_without_a_gateway_is_a_failure_not_a_crash():
    fake = FakeOpenAIServer()

    checks = await run_checks(_env(DEMO_CODE=CODE), http_client=fake.http_client())

    statuses = _statuses(checks)
    assert statuses[("demo", "translate")] == "FAIL"
    assert fake.requests == []
    detail = next(c.detail for c in checks if c.preset == "demo" and c.kind == "translate")
    assert CODE not in detail


# Never run in CI

def test_main_refuses_to_run_in_ci(capfd):
    fake = FakeOpenAIServer()

    code = main(_env(CI="true", OPENAI_API_KEY=KEY), http_client=fake.http_client())

    out, _ = capfd.readouterr()
    assert code == 2
    assert "CI" in out
    assert fake.requests == []
    assert KEY not in out


def test_main_runs_when_ci_is_not_set(capfd):
    fake = FakeOpenAIServer()

    code = main(_env(CI="", OPENAI_API_KEY=KEY), http_client=fake.http_client())

    capfd.readouterr()
    assert code == 0
    assert fake.requests
