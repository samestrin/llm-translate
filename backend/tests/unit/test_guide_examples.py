"""
The glossary and style guide examples the web app's `/guide` page shows are ones the API accepts.

The page renders `frontend/src/pages/guide-examples.json`, so that file is the example the
visitor copies. Here each glossary entry is validated with `GlossaryEntry`, the whole worked
example with `V1TranslationRequest`, and its `glossary_misses` with `find_misses`. The page's
field lists are checked against the models' own fields, so the guide cannot drift from the code.
The frontend's `Guide.test.jsx` checks the page shows this file and that `toRequestGlossary`
maps the rows a visitor types to these same entries.
"""
import json
from pathlib import Path

import pytest

from llm_translate.api.models import V1TranslationRequest
from llm_translate.services.glossary import GlossaryEntry, GlossaryMiss, applicable, find_misses, glossary_prompt
from llm_translate.services.style_guide import StyleGuide, style_guide_prompt

REPO = Path(__file__).resolve().parents[3]
EXAMPLES_PATH = REPO / "frontend" / "src" / "pages" / "guide-examples.json"


@pytest.fixture(scope="module")
def examples():
    return json.loads(EXAMPLES_PATH.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def worked(examples):
    """The worked example: the text, the entries the page shows and the translation it got."""
    example = examples["glossary"]["example"]
    return example, [GlossaryEntry(**entry) for entry in example["request"]]


# The fields the page documents are the models' fields


def test_the_page_documents_every_glossary_field(examples):
    documented = [field["key"] for field in examples["glossary"]["fields"]]
    assert documented == list(GlossaryEntry.model_fields)


def test_the_page_documents_every_style_guide_field(examples):
    documented = [field["key"] for field in examples["styleGuide"]["fields"]]
    assert documented == list(StyleGuide.model_fields)


# Each example glossary JSON the page shows


def test_every_glossary_entry_the_page_shows_is_valid(examples):
    shown = examples["glossary"]["example"]["request"]
    assert shown, "the page should show a glossary example"
    for entry in shown:
        parsed = GlossaryEntry(**entry)
        assert parsed.source_term == entry["source_term"]
        assert parsed.do_not_translate == entry.get("do_not_translate", False)
        assert parsed.target_term == entry.get("target_term")
        assert parsed.note == entry.get("note")


def test_the_worked_example_is_a_request_the_api_accepts(examples):
    example = examples["glossary"]["example"]
    request = V1TranslationRequest(
        text=example["text"],
        from_lang=example["fromLang"],
        to_lang=example["toLang"],
        glossary=example["request"],
        style_guide=examples["styleGuide"]["example"],
    )
    assert [entry.model_dump() for entry in request.glossary] == [
        GlossaryEntry(**entry).model_dump() for entry in example["request"]
    ]
    assert request.style_guide == StyleGuide(**examples["styleGuide"]["example"])


def test_the_example_rows_reach_the_prompt(worked):
    _, entries = worked
    prompt = glossary_prompt(entries)
    for entry in entries:
        assert f'"{entry.source_term}"' in prompt
    assert '"Dashboard" -> "Panel" (the home screen)' in prompt
    assert '"LLM Translate" -> keep unchanged, do not translate' in prompt


# What the page says `glossary_misses` means


def test_the_misses_the_page_shows_are_the_ones_the_check_reports(worked):
    example, entries = worked
    assert applicable(entries, example["text"]) == entries, "both terms occur in the example text"
    misses = find_misses(entries, example["text"], example["translation"])
    assert misses == [GlossaryMiss(**miss) for miss in example["misses"]]


def test_a_translated_term_is_a_miss_only_when_the_output_lacks_it(worked):
    example, entries = worked
    used = example["translation"].replace("tablero", "Panel")
    assert find_misses(entries, example["text"], used) == []


def test_a_keep_as_is_term_must_appear_unchanged(worked):
    example, entries = worked
    translated_brand = example["translation"].replace("LLM Translate", "LLM Traducir")
    assert find_misses(entries, example["text"], translated_brand) == [
        GlossaryMiss(term="Dashboard", expected="Panel"),
        GlossaryMiss(term="LLM Translate", expected="LLM Translate"),
    ]


def test_a_term_the_text_does_not_contain_is_not_checked(worked):
    _, entries = worked
    assert find_misses(entries, "A sentence with neither term.", "Una frase sin ninguno de los términos.") == []


# The style guide example


def test_the_style_guide_example_is_valid_and_reaches_the_prompt(examples):
    shown = examples["styleGuide"]["example"]
    guide = StyleGuide(**shown)
    prompt = style_guide_prompt(guide)
    assert prompt.startswith("Follow this style guide:")
    for value in shown.values():
        assert value in prompt


def test_the_style_guide_example_fills_every_field(examples):
    assert set(examples["styleGuide"]["example"]) == set(StyleGuide.model_fields)
