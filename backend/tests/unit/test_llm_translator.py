"""
Unit tests for the translator on the OpenAI-compatible client: auto-detect,
the same-language shortcut and outer-quote stripping, against the fake server.
"""
import pytest

from llm_translate.services.llm_client import LLMClient
from llm_translate.services.llm_translator import LLMTranslator
from llm_translate.utils.config import load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError
from tests.fake_openai_server import DETECT_MARKER, FakeOpenAIServer

ENV = {
    "LLM_BASE_URL": "http://llm.local/v1",
    "LLM_API_KEY": "key",
    "LLM_TRANSLATE_MODEL": "fast",
    "LLM_REVIEW_MODEL": "careful",
}


async def translate(server, text="Hello", from_lang="English", to_lang="Spanish"):
    async with server.http_client() as http:
        translator = LLMTranslator(LLMClient(load_llm_settings(ENV), http_client=http))
        return await translator.translate(text, from_lang, to_lang)


def test_translator_reports_the_translate_model():
    translator = LLMTranslator(LLMClient(load_llm_settings(ENV)))
    assert translator.model == "fast"


@pytest.mark.asyncio
async def test_translates_with_the_translate_model():
    server = FakeOpenAIServer(translation="Hola")
    assert await translate(server) == "Hola"
    assert len(server.requests) == 1
    sent = server.requests[0]["json"]
    assert sent["model"] == "fast"
    assert "from English to Spanish" in sent["messages"][1]["content"]
    assert '"Hello"' in sent["messages"][1]["content"]


@pytest.mark.asyncio
@pytest.mark.parametrize("from_lang", ["Auto-detect", "auto-detect", " AUTO-DETECT "])
async def test_auto_detect_asks_for_the_language_first(from_lang):
    server = FakeOpenAIServer(translation="Hola", detected_language="English")
    assert await translate(server, from_lang=from_lang) == "Hola"
    assert len(server.requests) == 2
    detect, translation = (r["json"] for r in server.requests)
    assert DETECT_MARKER in detect["messages"][0]["content"]
    assert detect["model"] == "fast"
    assert "from English to Spanish" in translation["messages"][1]["content"]


@pytest.mark.asyncio
async def test_auto_detect_cleans_the_detected_name():
    server = FakeOpenAIServer(translation="Hola", detected_language=' "French." ')
    await translate(server, from_lang="Auto-detect")
    assert "from French to Spanish" in server.requests[1]["json"]["messages"][1]["content"]


@pytest.mark.asyncio
async def test_auto_detect_with_no_answer_is_an_error():
    server = FakeOpenAIServer(translation="Hola", detected_language="  ")
    with pytest.raises(TranslationError) as excinfo:
        await translate(server, from_lang="Auto-detect")
    assert excinfo.value.error_type == ErrorType.API_ERROR
    assert len(server.requests) == 1


@pytest.mark.asyncio
async def test_auto_detected_same_language_returns_the_original_text():
    server = FakeOpenAIServer(translation="SHOULD NOT BE USED", detected_language="spanish")
    assert await translate(server, text="  Hola amigo ", from_lang="Auto-detect") == "  Hola amigo "
    assert len(server.requests) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize("from_lang,to_lang", [("Spanish", "Spanish"), ("spanish", " Spanish ")])
async def test_same_language_returns_the_original_text_without_a_call(from_lang, to_lang):
    server = FakeOpenAIServer(translation="SHOULD NOT BE USED")
    assert await translate(server, text="Hola", from_lang=from_lang, to_lang=to_lang) == "Hola"
    assert server.requests == []


@pytest.mark.asyncio
@pytest.mark.parametrize("answer,expected", [
    ('"Hola"', "Hola"),
    ("'Hola'", "Hola"),
    ('  "Hola"  \n', "Hola"),
    ('"Dijo "sí" ayer"', 'Dijo "sí" ayer'),
    ("Hola", "Hola"),
    ('"Hola', '"Hola'),
    ("Hola'", "Hola'"),
    ("\"Hola'", "\"Hola'"),
    ('"', '"'),
    ("'", "'"),
])
async def test_outer_quotes_are_stripped(answer, expected):
    assert await translate(FakeOpenAIServer(translation=answer)) == expected


@pytest.mark.asyncio
async def test_client_errors_pass_through():
    server = FakeOpenAIServer()
    server.status = 401
    with pytest.raises(TranslationError) as excinfo:
        await translate(server)
    assert excinfo.value.error_type == ErrorType.AUTHENTICATION
