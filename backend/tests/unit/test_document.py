"""
Unit tests for splitting a document into segments at paragraph or line
boundaries, the size and count limits, and joining the translated segments.
"""
import pytest

from llm_translate.services.document import split_document
from llm_translate.utils.exceptions import ErrorType, TranslationError


def test_text_within_the_limit_is_one_segment():
    document = split_document("One.\n\nTwo.", max_chars=100, max_segments=5)
    assert document.segments == ["One.\n\nTwo."]
    assert document.separators == []


def test_paragraphs_are_packed_into_segments_up_to_the_limit():
    text = "aaaa\n\nbbbb\n\ncccc\n\ndddd"
    document = split_document(text, max_chars=10, max_segments=5)
    assert document.segments == ["aaaa\n\nbbbb", "cccc\n\ndddd"]
    assert document.separators == ["\n\n"]


def test_no_segment_is_longer_than_the_limit():
    text = "\n\n".join(f"Paragraph {n} has a few words." for n in range(20))
    document = split_document(text, max_chars=70, max_segments=50)
    assert len(document.segments) > 1
    assert all(len(segment) <= 70 for segment in document.segments)


def test_joining_the_segments_gives_back_the_document():
    text = "First.\n\n\nSecond.\n  \nThird.\n\nFourth line one.\nFourth line two."
    document = split_document(text, max_chars=20, max_segments=10)
    assert len(document.segments) > 1
    assert document.join(document.segments) == text


def test_join_keeps_the_separators_between_translated_segments():
    document = split_document("aaaa\n\n\nbbbb", max_chars=5, max_segments=5)
    assert document.join(["AAAA", "BBBB"]) == "AAAA\n\n\nBBBB"


def test_a_paragraph_over_the_limit_is_split_at_line_boundaries():
    text = "short\n\nline one\nline two\nline three"
    document = split_document(text, max_chars=20, max_segments=5)
    assert document.segments == ["short", "line one\nline two", "line three"]
    assert document.separators == ["\n\n", "\n"]


def test_surrounding_whitespace_is_not_a_segment():
    document = split_document("\n\n  aaaa\n\nbbbb  \n\n", max_chars=6, max_segments=5)
    assert document.segments == ["aaaa", "bbbb"]


def _rejected(text, max_chars, max_segments):
    with pytest.raises(TranslationError) as excinfo:
        split_document(text, max_chars=max_chars, max_segments=max_segments)
    assert excinfo.value.status_code == 413
    assert excinfo.value.error_type == ErrorType.PAYLOAD_TOO_LARGE
    return excinfo.value.message


def test_a_line_over_the_limit_is_rejected():
    message = _rejected("short\n\n" + "x" * 30, max_chars=20, max_segments=5)
    assert "LLM_SEGMENT_MAX_CHARS" in message
    assert "20" in message


def test_too_many_segments_is_rejected():
    message = _rejected("aaaa\n\nbbbb\n\ncccc", max_chars=5, max_segments=2)
    assert "LLM_MAX_SEGMENTS" in message
    assert "3" in message


def test_windows_line_endings_split_at_paragraphs_too():
    text = "aaaa\r\n\r\nbbbb\r\ncccc"
    document = split_document(text, max_chars=10, max_segments=5)
    assert document.segments == ["aaaa", "bbbb\r\ncccc"]
    assert document.join(document.segments) == text
