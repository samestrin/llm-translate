"""
Opt-in preset checker: does each preset in `llm_translate/presets.json` work with a real key?

Manual tool, never run in CI (`main` refuses when `CI` is set). Run from `backend/`:

    python scripts/check_presets.py

Keys are read only from the environment, one variable per preset:
`OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `SYNTHETIC_API_KEY`, `ALIBABA_API_KEY`,
and optionally `DEMO_CODE` for the demo preset (which also needs
`DEMO_GATEWAY_URL` and `DEMO_TRANSLATE_MODEL`; `DEMO_TTS_MODEL` enables speech).
No `.env` file is read and no key is ever printed: every output line is
redacted and the model clients' loggers are silenced for the run, so even an
upstream error body that echoes the key cannot reach the output.

Each preset gets one short sentence: a translate call always, and a speak call
where the preset has a speech model. Every check prints PASS, FAIL or SKIP
(an unset key is skipped). Exit code: 0 when nothing failed, 1 when any check
failed, 2 when refused (CI).
"""
import asyncio
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Dict, List, Mapping, Optional, Tuple

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from llm_translate.services.llm_client import LLMClient  # noqa: E402
from llm_translate.services.presets import DEMO_PRESET, ModelAccess, Preset, load_presets, resolve_access  # noqa: E402
from llm_translate.services.tts_client import TTSClient  # noqa: E402
from llm_translate.utils.exceptions import TranslationError  # noqa: E402

# The environment variable that holds each preset's key (the demo preset takes a code).
# Derived from the presets file, so a new preset can never be missed here.
KEY_VARS: Dict[str, str] = {
    preset_id: "DEMO_CODE" if preset_id == DEMO_PRESET else f"{preset_id.upper()}_API_KEY"
    for preset_id in load_presets()
}

SENTENCE = "Hello, how are you today?"

# The clients log upstream error bodies, which a provider may echo a key in.
_CLIENT_LOGGERS = ("llm_translate.LLMClient", "llm_translate.TTSClient")
_REDACTED = "[redacted]"


@dataclass(frozen=True)
class Check:
    """One check's outcome: `status` is PASS, FAIL or SKIP; `detail` says why, never with a key."""
    preset: str
    kind: str
    status: str
    detail: str = ""


def redact(text: str, secrets: List[str]) -> str:
    """Replace every known credential in `text`, so no output line can carry one."""
    for secret in secrets:
        if secret:
            text = text.replace(secret, _REDACTED)
    return text


def format_checks(checks: List[Check], secrets: List[str]) -> List[str]:
    """One redacted output line per check."""
    lines = []
    for check in checks:
        line = f"{check.preset:<10} {check.kind:<9} {check.status}"
        if check.detail:
            line += f"  {check.detail}"
        lines.append(redact(line, secrets))
    return lines


def _quiet(client) -> None:
    """Silence a model client's logger: its error lines can hold an upstream body with the key."""
    client.logger.setLevel(logging.CRITICAL + 1)


async def _translate(access: ModelAccess, env: Mapping[str, str],
                     http_client: Optional[httpx.AsyncClient]) -> Tuple[str, bool]:
    client = LLMClient(access.llm_settings(env), http_client=http_client)
    _quiet(client)
    content = await client.chat([
        {"role": "system", "content": "Translate the user's sentence into Spanish. Answer with the translation only."},
        {"role": "user", "content": SENTENCE},
    ], tier="translate")
    ok = bool(content.strip())
    return ("" if ok else "the model returned an empty answer"), ok


async def _speak(access: ModelAccess, env: Mapping[str, str],
                 http_client: Optional[httpx.AsyncClient]) -> Tuple[str, bool]:
    client = TTSClient(access.tts_settings(env), http_client=http_client)
    _quiet(client)
    audio = await client.speak(SENTENCE, lang="English")
    ok = bool(audio)
    return ("" if ok else "the endpoint returned no audio"), ok


async def _run_check(preset_id: str, kind: str,
                     call: Callable[[], Awaitable[Tuple[str, bool]]]) -> Check:
    try:
        detail, ok = await call()
    except TranslationError as e:
        return Check(preset_id, kind, "FAIL", e.message)
    except Exception as e:  # a broken setting or endpoint is a failure of this check, not a crash
        return Check(preset_id, kind, "FAIL", f"{type(e).__name__}: {e}")
    return Check(preset_id, kind, "PASS" if ok else "FAIL", detail)


async def _check_preset(preset: Preset, env: Mapping[str, str],
                        http_client: Optional[httpx.AsyncClient]) -> List[Check]:
    var = KEY_VARS[preset.id]
    key = (env.get(var) or "").strip()
    if not key:
        skip = f"{var} is not set"
        return [Check(preset.id, "translate", "SKIP", skip), Check(preset.id, "speak", "SKIP", skip)]

    try:
        if preset.id == DEMO_PRESET:
            access = resolve_access(preset=DEMO_PRESET, demo_code=key, env=env)
        else:
            # The same validation the server applies: a credential that cannot be a
            # key is refused here, before it can reach a header or an error message.
            access = resolve_access(preset=preset.id, api_key=key, env=env)
    except TranslationError as e:
        return [Check(preset.id, "translate", "FAIL", e.message), Check(preset.id, "speak", "FAIL", e.message)]
    except ValueError as e:  # e.g. a misspelled PUBLIC_DEMO: a failure of this preset, not a crash
        return [Check(preset.id, "translate", "FAIL", str(e)), Check(preset.id, "speak", "FAIL", str(e))]

    checks = [await _run_check(preset.id, "translate", lambda: _translate(access, env, http_client))]
    if access.preset.tts_model is None:
        checks.append(Check(preset.id, "speak", "SKIP", "no speech model for this preset"))
    else:
        checks.append(await _run_check(preset.id, "speak", lambda: _speak(access, env, http_client)))
    return checks


async def run_checks(env: Mapping[str, str], http_client: Optional[httpx.AsyncClient] = None) -> List[Check]:
    """
    Check every preset whose key is set in `env`, in presets-file order.

    Args:
        env (Mapping[str, str]): The environment to read keys and `DEMO_*` settings from.
            Nothing else is consulted; no `.env` file is loaded.
        http_client (httpx.AsyncClient, optional): Client for every model call (tests point it
            at the fake OpenAI server). Defaults to the clients' own per-request connections.

    Returns:
        List[Check]: Two checks per preset (translate, speak), never raising for a bad
            key or endpoint. Details can hold upstream text; print them only through
            `format_checks`, which redacts the credentials.
    """
    loggers = [logging.getLogger(name) for name in _CLIENT_LOGGERS]
    saved_levels = [logger.level for logger in loggers]
    try:
        checks: List[Check] = []
        for preset in load_presets().values():
            checks.extend(await _check_preset(preset, env, http_client))
        return checks
    finally:
        for logger, level in zip(loggers, saved_levels):
            logger.setLevel(level)


def _is_ci(env: Mapping[str, str]) -> bool:
    return (env.get("CI") or "").strip().lower() in ("1", "true", "yes", "on")


def main(env: Optional[Mapping[str, str]] = None, http_client: Optional[httpx.AsyncClient] = None) -> int:
    """Run every check, print one redacted line per check plus a summary, and return the exit code."""
    env = os.environ if env is None else env
    if _is_ci(env):
        print("check_presets.py is opt-in and never runs in CI. "
              "Run it locally with your provider keys in the environment.")
        return 2

    checks = asyncio.run(run_checks(env, http_client=http_client))
    secrets = [(env.get(var) or "").strip() for var in KEY_VARS.values()]
    for line in format_checks(checks, secrets):
        print(line)
    failed = sum(c.status == "FAIL" for c in checks)
    passed = sum(c.status == "PASS" for c in checks)
    skipped = sum(c.status == "SKIP" for c in checks)
    print(f"{passed} passed, {failed} failed, {skipped} skipped")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
