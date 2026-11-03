"""
Unit tests for SRT cues: numbers and timings survive translation, an over-long
translated cue is re-wrapped to the line limit, and length never fails a cue.
"""
import pytest

from llm_translate.formats.srt import parse, render, wrap
from llm_translate.utils.config import DEFAULT_SRT_MAX_LINE_CHARS, load_llm_settings
from llm_translate.utils.exceptions import TranslationError

SAMPLE = (
    "1\n00:00:01,000 --> 00:00:03,500\nHello there,\nhow are you?\n\n"
    "2\n00:00:04,000 --> 00:00:06,250\nFine.\n\n"
    "17\n00:01:00,000 --> 00:01:02,000 X1:10\nGoodbye\n"
)


def test_parse_reads_numbers_timings_and_text():
    cues = parse(SAMPLE)
    assert [c.number for c in cues] == ["1", "2", "17"]
    assert cues[0].timing == "00:00:01,000 --> 00:00:03,500"
    assert cues[0].text == "Hello there,\nhow are you?"
    assert cues[2].timing.endswith("X1:10")


def test_timings_and_numbers_identical_after_translation():
    cues = parse(SAMPLE)
    out = render(cues, ["Hallo,\nwie geht es dir?", "Gut.", "Auf Wiedersehen"], 42)
    again = parse(out)
    assert [(c.number, c.timing) for c in again] == [(c.number, c.timing) for c in cues]


def test_crlf_and_bom_are_accepted():
    cues = parse("﻿" + SAMPLE.replace("\n", "\r\n"))
    assert len(cues) == 3


def test_over_long_cue_is_rewrapped_to_the_limit():
    long = "Dies ist eine sehr lange übersetzte Untertitelzeile, die nicht passt"
    out = parse(render(parse("1\n00:00:01,000 --> 00:00:02,000\nShort\n"), [long], 30))[0].text
    assert "\n" in out
    assert all(len(line) <= 30 for line in out.split("\n"))
    assert " ".join(out.split("\n")) == long


def test_short_lines_and_breaks_are_kept():
    assert wrap("Hallo,\nwie geht es?", 42) == "Hallo,\nwie geht es?"


def test_word_longer_than_limit_does_not_fail():
    assert wrap("Donaudampfschifffahrtsgesellschaft ja", 10) == "Donaudampfschifffahrtsgesellschaft\nja"


def test_empty_translation_keeps_cue():
    out = render(parse("1\n00:00:01,000 --> 00:00:02,000\nHi\n"), [""], 42)
    assert out == "1\n00:00:01,000 --> 00:00:02,000\n"


@pytest.mark.parametrize("bad", ["", "hello\nworld", "1\nnot a timing\ntext"])
def test_malformed_file_is_a_400_error(bad):
    with pytest.raises(TranslationError) as raised:
        parse(bad)
    assert raised.value.status_code == 400


def test_line_limit_setting():
    assert load_llm_settings({}).srt_max_line_chars == DEFAULT_SRT_MAX_LINE_CHARS == 42
    assert load_llm_settings({"LLM_SRT_MAX_LINE_CHARS": "30"}).srt_max_line_chars == 30
    with pytest.raises(ValueError):
        load_llm_settings({"LLM_SRT_MAX_LINE_CHARS": "0"})


@pytest.mark.parametrize("translations", [["one", "two"], ["a", "b", "c", "d"]])
def test_render_needs_one_translation_per_cue(translations):
    with pytest.raises(ValueError):
        render(parse(SAMPLE), translations, 42)
