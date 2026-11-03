"""
Unit tests for temperature 0 and the opt-in translation cache.
"""
import pytest

from llm_translate.services.cache import TranslationCache, get_translation_cache
from llm_translate.services.glossary import GlossaryEntry
from llm_translate.services.llm_client import LLMClient
from llm_translate.services.llm_translator import LLMTranslator
from llm_translate.utils.config import load_llm_settings
from tests.fake_openai_server import FakeOpenAIServer

ENV = {"LLM_BASE_URL": "http://llm.local/v1", "LLM_API_KEY": "key", "LLM_TRANSLATE_MODEL": "fast"}


async def run(server, cache, text="Hello", env=ENV, **kwargs):
    async with server.http_client() as http:
        translator = LLMTranslator(LLMClient(load_llm_settings(env), http_client=http), cache=cache)
        return await translator.translate_structured(
            text, kwargs.pop("from_lang", "English"), kwargs.pop("to_lang", "Spanish"), **kwargs
        )


@pytest.mark.asyncio
async def test_calls_run_at_temperature_zero():
    server = FakeOpenAIServer(translation="Hola")
    await run(server, None)
    assert server.requests[0]["json"]["temperature"] == 0


@pytest.mark.asyncio
async def test_a_cache_hit_is_marked_cached_and_makes_no_call():
    server, cache = FakeOpenAIServer(translation="Hola"), TranslationCache(10)
    first = await run(server, cache)
    second = await run(server, cache)
    assert (first.cached, second.cached) == (False, True)
    assert second.text == first.text and second.model == first.model
    assert second.usage.total_tokens == 0
    assert len(server.requests) == 1


@pytest.mark.asyncio
async def test_with_the_cache_off_nothing_is_cached():
    server = FakeOpenAIServer(translation="Hola")
    results = [await run(server, None) for _ in range(2)]
    assert [r.cached for r in results] == [False, False]
    assert len(server.requests) == 2


@pytest.mark.asyncio
@pytest.mark.parametrize("change", [
    {"text": "Goodbye"},
    {"to_lang": "French"},
    {"glossary": [GlossaryEntry(source_term="Hello", target_term="Hola!")]},
    {"env": {**ENV, "LLM_TRANSLATE_MODEL": "other"}},
    {"env": {**ENV, "LLM_REVIEW_MODEL": "other"}},
])
async def test_a_different_input_or_setting_misses(change):
    server, cache = FakeOpenAIServer(translation="Hola"), TranslationCache(10)
    await run(server, cache)
    assert (await run(server, cache, **change)).cached is False


def test_the_least_recently_used_entry_is_evicted():
    cache = TranslationCache(2)
    cache.put("a", 1)
    cache.put("b", 2)
    cache.get("a")
    cache.put("c", 3)
    assert (cache.get("a"), cache.get("b"), cache.get("c")) == (1, None, 3)


def test_the_cache_is_off_by_default_and_set_from_the_environment():
    assert load_llm_settings(ENV).cache_size == 0
    assert get_translation_cache(0) is None
    assert load_llm_settings({**ENV, "LLM_CACHE_SIZE": "5"}).cache_size == 5
    assert get_translation_cache(5) is get_translation_cache(5)
    get_translation_cache(0)


@pytest.mark.parametrize("value", ["-1", "x", "1.5"])
def test_an_invalid_cache_size_is_an_error(value):
    with pytest.raises(ValueError, match="LLM_CACHE_SIZE"):
        load_llm_settings({**ENV, "LLM_CACHE_SIZE": value})
