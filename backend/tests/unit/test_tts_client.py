"""
Unit tests for the OpenAI-compatible text-to-speech client, against the fake server.
"""
import httpx
import pytest

from llm_translate.services.tts_client import TTSClient
from llm_translate.utils.config import load_tts_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import AUDIO_BODIES, FakeOpenAIServer, raising_client

ENV = {
    "TTS_BASE_URL": "http://tts.local/v1",
    "TTS_API_KEY": "sk-tts-secret",
    "TTS_MODEL": "voice-1",
    "TTS_VOICE": "nova",
}


@pytest.fixture
def server():
    return FakeOpenAIServer()


@pytest.mark.asyncio
@pytest.mark.parametrize("fmt", ["mp3", "wav"])
async def test_native_format_is_returned_as_the_endpoint_sent_it(server, fmt):
    async with server.http_client() as http:
        client = TTSClient(load_tts_settings(ENV), http_client=http)
        audio = await client.speak("Hello", "English", response_format=fmt)
    assert audio == AUDIO_BODIES[fmt]
    request = server.requests[0]
    assert request["url"] == "http://tts.local/v1/audio/speech"
    assert request["headers"]["authorization"] == "Bearer sk-tts-secret"
    assert request["json"] == {"model": "voice-1", "input": "Hello", "voice": "nova", "response_format": fmt}


@pytest.mark.asyncio
async def test_voice_and_instructions_are_sent_when_given(server):
    async with server.http_client() as http:
        await TTSClient(load_tts_settings(ENV), http_client=http).speak(
            "Hi", "English", voice="echo", instructions="Speak slowly"
        )
    body = server.requests[0]["json"]
    assert body["voice"] == "echo"
    assert body["instructions"] == "Speak slowly"


@pytest.mark.asyncio
async def test_format_outside_the_configured_list_is_converted(server, monkeypatch):
    env = {**ENV, "TTS_FORMATS": "wav"}
    async with server.http_client() as http:
        client = TTSClient(load_tts_settings(env), http_client=http)
        calls = []
        monkeypatch.setattr(client, "convert_audio_format",
                            lambda audio, src, dst: calls.append((audio, src, dst)) or b"converted")
        audio = await client.speak("Hi", "English", response_format="mp3")
    assert server.requests[0]["json"]["response_format"] == "wav"
    assert calls == [(AUDIO_BODIES["wav"], "wav", "mp3")]
    assert audio == b"converted"


@pytest.mark.asyncio
@pytest.mark.parametrize("status,error_type,code", [
    (401, ErrorType.AUTHENTICATION, 401),
    (429, ErrorType.RATE_LIMIT, 429),
    (400, ErrorType.BAD_REQUEST, 400),
    (503, ErrorType.API_ERROR, 500),
])
async def test_upstream_error_becomes_translation_error(server, status, error_type, code):
    server.status = status
    async with server.http_client() as http:
        client = TTSClient(load_tts_settings(ENV), http_client=http)
        with pytest.raises(TranslationError) as info:
            await client.speak("Hi", "English")
    assert info.value.error_type == error_type
    assert info.value.status_code == code
    assert "sk-tts-secret" not in info.value.message


@pytest.mark.asyncio
async def test_timeout_and_refused_connection(server):
    for exc, error_type, code in [
        (lambda r: httpx.ReadTimeout("slow", request=r), ErrorType.TIMEOUT, 504),
        (lambda r: httpx.ConnectError("refused", request=r), ErrorType.CONNECTION, 503),
    ]:
        async with raising_client(exc) as http:
            with pytest.raises(TranslationError) as info:
                await TTSClient(load_tts_settings(ENV), http_client=http).speak("Hi", "English")
        assert (info.value.error_type, info.value.status_code) == (error_type, code)


def test_settings_share_the_llm_endpoint_by_default():
    s = load_tts_settings({"LLM_BASE_URL": "http://llm.local/v1", "LLM_API_KEY": "k"})
    assert (s.base_url, s.api_key, s.model, s.voice) == ("http://llm.local/v1", "k", "gpt-4o-mini-tts", "alloy")


def test_settings_tts_vars_win_over_llm_vars():
    s = load_tts_settings({**ENV, "LLM_BASE_URL": "http://llm.local/v1", "LLM_API_KEY": "k"})
    assert (s.base_url, s.api_key) == ("http://tts.local/v1", "sk-tts-secret")


def test_legacy_groq_source_maps_to_groq_endpoint():
    s = load_tts_settings({"TTS_SOURCE": "groq", "GROQ_API_KEY": "g", "TTS_MODEL": "playai-tts"})
    assert s.base_url == "https://api.groq.com/openai/v1"
    assert (s.api_key, s.voice, s.formats) == ("g", "Fritz-PlayAI", ("wav",))


@pytest.mark.parametrize("source, model", [("groq", "playai-tts"), ("openai", "gpt-4o-mini-tts")])
def test_legacy_source_without_tts_model_uses_the_vendors_old_default_model(source, model):
    # GroqSpeaker defaulted to playai-tts; Groq rejects the OpenAI model name.
    s = load_tts_settings({"TTS_SOURCE": source, "GROQ_API_KEY": "g", "OPENAI_API_KEY": "o"})
    assert s.model == model
    assert load_tts_settings({"TTS_SOURCE": source, "GROQ_API_KEY": "g", "TTS_MODEL": "m"}).model == "m"


def test_invalid_settings_are_rejected():
    with pytest.raises(ValueError, match="TTS_SOURCE"):
        load_tts_settings({"TTS_SOURCE": "nope"})
    with pytest.raises(ValueError, match="TTS_TIMEOUT"):
        load_tts_settings({**ENV, "TTS_TIMEOUT": "-1"})
    with pytest.raises(ValueError, match="TTS_FORMATS"):
        load_tts_settings({**ENV, "TTS_FORMATS": " , "})


@pytest.mark.asyncio
async def test_forbidden_keeps_its_real_status(server):
    server.status = 403
    async with server.http_client() as http:
        with pytest.raises(TranslationError) as info:
            await TTSClient(load_tts_settings(ENV), http_client=http).speak("Hi", "English")
    assert (info.value.error_type, info.value.status_code) == (ErrorType.AUTHENTICATION, 403)


@pytest.mark.asyncio
async def test_default_http_client_is_used_when_none_is_injected(server, monkeypatch):
    real = httpx.AsyncClient
    monkeypatch.setattr(httpx, "AsyncClient", lambda *a, **k: real(transport=httpx.ASGITransport(app=server.app)))
    audio = await TTSClient(load_tts_settings(ENV)).speak("Hi", "English", response_format="wav")
    assert audio == AUDIO_BODIES["wav"]
    assert server.requests[0]["url"] == "http://tts.local/v1/audio/speech"


@pytest.mark.asyncio
async def test_conversion_failure_is_a_translation_error(server):
    env = {**ENV, "TTS_FORMATS": "wav"}
    async with server.http_client() as http:
        client = TTSClient(load_tts_settings(env), http_client=http)
        with pytest.raises(TranslationError) as info:
            await client.speak("Hi", "English", response_format="mp3")  # fake wav bytes cannot decode
    assert (info.value.error_type, info.value.status_code) == (ErrorType.API_ERROR, 500)


def test_get_tts_client_reuses_client_until_settings_change(monkeypatch):
    from llm_translate.services import tts_client as mod
    monkeypatch.setattr(mod, "_shared_client", None)
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setattr(mod, "load_dotenv", lambda *a, **k: None, raising=False)
    first = mod.get_tts_client()
    assert mod.get_tts_client() is first
    monkeypatch.setenv("TTS_MODEL", "voice-2")
    second = mod.get_tts_client()
    assert second is not first and second.settings.model == "voice-2"


def test_get_speaker_service_reads_the_environment(monkeypatch):
    from llm_translate.services.tts_client import get_tts_client as get_speaker_service
    from llm_translate.services import tts_client as mod
    monkeypatch.setattr(mod, "_shared_client", None)
    for k, v in ENV.items():
        monkeypatch.setenv(k, v)
    client = get_speaker_service()
    assert (client.settings.base_url, client.settings.model) == ("http://tts.local/v1", "voice-1")
    monkeypatch.setenv("TTS_SOURCE", "nope")
    with pytest.raises(ValueError, match="TTS_SOURCE"):
        get_speaker_service()


KOKORO_ENV = {"TTS_BASE_URL": "http://tts.local/v1", "TTS_MODEL": "kokoro"}


@pytest.mark.asyncio
@pytest.mark.parametrize("lang, voice", [
    ("English", "af_heart"),
    ("Spanish", "ef_dora"),
    ("French", "ff_siwis"),
    ("Italian", "if_sara"),
    ("Portuguese", "pf_dora"),
    ("Japanese", "jf_alpha"),
    ("Chinese", "zf_xiaobei"),
    ("Hindi", "hf_alpha"),
    (" spanish ", "ef_dora"),
    ("German", "af_heart"),
])
async def test_kokoro_model_without_tts_voice_picks_the_voice_for_the_language(server, lang, voice):
    async with server.http_client() as http:
        await TTSClient(load_tts_settings(KOKORO_ENV), http_client=http).speak("Hola", lang)
    assert server.requests[0]["json"]["voice"] == voice


@pytest.mark.asyncio
@pytest.mark.parametrize("model", ["kokoro", "hexgrad/Kokoro-82M"])
async def test_tts_voice_wins_over_the_kokoro_language_voice(server, model):
    env = {**KOKORO_ENV, "TTS_MODEL": model, "TTS_VOICE": "bf_emma"}
    async with server.http_client() as http:
        await TTSClient(load_tts_settings(env), http_client=http).speak("Hola", "Spanish")
    assert server.requests[0]["json"]["voice"] == "bf_emma"


@pytest.mark.asyncio
async def test_request_voice_wins_over_the_kokoro_language_voice(server):
    async with server.http_client() as http:
        await TTSClient(load_tts_settings(KOKORO_ENV), http_client=http).speak("Hola", "Spanish", voice="em_alex")
    assert server.requests[0]["json"]["voice"] == "em_alex"


@pytest.mark.asyncio
async def test_other_models_keep_alloy_for_every_language(server):
    env = {"TTS_BASE_URL": "http://tts.local/v1", "TTS_MODEL": "gpt-4o-mini-tts"}
    async with server.http_client() as http:
        await TTSClient(load_tts_settings(env), http_client=http).speak("Hola", "Spanish")
    assert server.requests[0]["json"]["voice"] == "alloy"


def test_voice_set_tracks_tts_voice_only():
    assert load_tts_settings(KOKORO_ENV).voice_set is False
    assert load_tts_settings({**KOKORO_ENV, "TTS_VOICE": "  "}).voice_set is False
    assert load_tts_settings({**KOKORO_ENV, "TTS_VOICE": "af_bella"}).voice_set is True
    # A legacy vendor's voice is a default, not a choice: a Kokoro model still picks per language.
    assert load_tts_settings({"TTS_SOURCE": "openai", "OPENAI_API_KEY": "k", "TTS_MODEL": "kokoro"}).voice_set is False


@pytest.mark.asyncio
async def test_kokoro_model_behind_a_legacy_vendor_still_picks_per_language(server):
    env = {"TTS_SOURCE": "openai", "OPENAI_API_KEY": "k", "TTS_BASE_URL": "http://tts.local/v1", "TTS_MODEL": "kokoro"}
    async with server.http_client() as http:
        await TTSClient(load_tts_settings(env), http_client=http).speak("Bonjour", "French")
    assert server.requests[0]["json"]["voice"] == "ff_siwis"
