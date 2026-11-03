"""
Prompt snapshot tests for the style guide.
"""
import pytest

from llm_translate.services.glossary import GlossaryEntry
from llm_translate.services.llm_client import LLMClient
from llm_translate.services.llm_translator import LLMTranslator
from llm_translate.services.style_guide import StyleGuide, style_guide_prompt
from llm_translate.utils.config import load_llm_settings
from tests.fake_openai_server import FakeOpenAIServer
from tests.unit.test_llm_translator import ENV

FULL = StyleGuide(tone="friendly", formality="informal", audience="developers", notes="Avoid idioms.")


def test_style_guide_prompt_snapshot():
    assert style_guide_prompt(FULL) == (
        "Follow this style guide:\n"
        "- Tone: friendly\n"
        "- Formality: informal\n"
        "- Audience: developers\n"
        "- Notes: Avoid idioms."
    )


def test_blank_fields_are_left_out():
    assert style_guide_prompt(StyleGuide(tone=" ", formality="formal")) == "Follow this style guide:\n- Formality: formal"


@pytest.mark.parametrize("guide", [None, StyleGuide(), StyleGuide(notes="  ")])
def test_an_empty_style_guide_adds_nothing(guide):
    assert style_guide_prompt(guide) == ""


async def sent_prompt(**kwargs):
    server = FakeOpenAIServer(translation="Hola")
    async with server.http_client() as http:
        translator = LLMTranslator(LLMClient(load_llm_settings(ENV), http_client=http))
        await translator.translate_structured("Hello cloud", "English", "Spanish", **kwargs)
    return server.requests[0]["json"]["messages"][1]["content"]


@pytest.mark.asyncio
async def test_the_full_prompt_snapshot_has_style_guide_then_glossary_then_text():
    prompt = await sent_prompt(
        style_guide=FULL, glossary=[GlossaryEntry(source_term="cloud", target_term="nube")]
    )
    assert prompt == (
        "Follow this style guide:\n"
        "- Tone: friendly\n"
        "- Formality: informal\n"
        "- Audience: developers\n"
        "- Notes: Avoid idioms.\n\n"
        'Use this glossary for the terms below:\n- "cloud" -> "nube"\n\n'
        'Translate the following text from English to Spanish: "Hello cloud"'
    )


@pytest.mark.asyncio
async def test_without_a_style_guide_the_prompt_is_unchanged():
    assert await sent_prompt() == 'Translate the following text from English to Spanish: "Hello cloud"'
