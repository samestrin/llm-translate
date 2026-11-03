"""
Unit tests for the glossary: entry validation, which entries apply to a text,
the prompt block and the miss check.
"""
import pytest
from pydantic import ValidationError

from llm_translate.services.glossary import GlossaryEntry, GlossaryMiss, applicable, find_misses, glossary_prompt

CLOUD = GlossaryEntry(source_term="cloud", target_term="nube", note="computing sense, not weather")
ACME = GlossaryEntry(source_term="Acme Cloud", do_not_translate=True)


# Entries

def test_a_do_not_translate_entry_needs_no_target():
    assert ACME.target_term is None
    assert ACME.expected_target == "Acme Cloud"


def test_a_translated_entry_expects_its_target():
    assert CLOUD.expected_target == "nube"


@pytest.mark.parametrize("entry", [
    {"source_term": "", "target_term": "x"},
    {"source_term": "   ", "target_term": "x"},
    {"source_term": "cloud"},
    {"source_term": "cloud", "target_term": "  "},
])
def test_an_entry_with_no_source_or_no_target_is_invalid(entry):
    with pytest.raises(ValidationError):
        GlossaryEntry(**entry)


# Which entries count

def test_an_entry_counts_only_when_its_term_is_in_the_source():
    assert applicable([CLOUD, ACME], "The weather is fine") == []
    assert applicable([CLOUD, ACME], "Rain from a cloud") == [CLOUD]


def test_the_source_match_is_a_case_insensitive_substring():
    assert applicable([CLOUD], "CLOUDS over the hills") == [CLOUD]
    assert applicable([ACME], "we run on ACME CLOUD") == [ACME]


# Prompt

def test_the_prompt_lists_targets_notes_and_terms_to_keep():
    block = glossary_prompt([CLOUD, ACME])
    assert '"cloud" -> "nube" (computing sense, not weather)' in block
    assert '"Acme Cloud" -> keep unchanged, do not translate' in block


def test_no_entries_means_no_prompt_block():
    assert glossary_prompt([]) == ""


# Misses

def test_a_used_target_is_not_a_miss():
    assert find_misses([CLOUD], "the cloud", "la nube") == []


def test_the_target_match_ignores_case():
    assert find_misses([CLOUD], "Cloud first", "Nube primero") == []


def test_a_missing_target_is_a_miss():
    assert find_misses([CLOUD], "the cloud", "la niebla") == [GlossaryMiss(term="cloud", expected="nube")]


def test_a_do_not_translate_term_must_appear_unchanged():
    assert find_misses([ACME], "Acme Cloud is up", "Acme Cloud está activo") == []
    assert find_misses([ACME], "Acme Cloud is up", "Acme Nube está activo") == [
        GlossaryMiss(term="Acme Cloud", expected="Acme Cloud")
    ]
    assert find_misses([ACME], "Acme Cloud is up", "acme cloud está activo") == [
        GlossaryMiss(term="Acme Cloud", expected="Acme Cloud")
    ]


def test_a_term_not_in_the_source_is_never_a_miss():
    assert find_misses([CLOUD, ACME], "Sunny today", "Soleado hoy") == []
