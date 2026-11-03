"""
Whole-document mode: split a long text into segments, and join their translations.

A document is split at paragraph boundaries (a blank line), and consecutive
paragraphs are packed into one segment while it stays within the size limit.
A paragraph longer than the limit is split at its line boundaries instead and
never shares a segment with another paragraph. A line longer than the limit, or
more segments than the count limit, rejects the document (HTTP 413).
"""
import re
from dataclasses import dataclass
from typing import List, Tuple

from llm_translate.utils.exceptions import ErrorType, TranslationError

PARAGRAPH_BREAK = re.compile(r"(\r?\n[ \t\r]*\n\s*)")
LINE_BREAK = re.compile(r"(\r?\n)")


@dataclass(frozen=True)
class Document:
    """
    A document split into segments.

    Attributes:
        segments (List[str]): The segments, in order.
        separators (List[str]): The whitespace between each segment and the next.
    """
    segments: List[str]
    separators: List[str]

    def join(self, translations: List[str]) -> str:
        """Join one translation per segment with the document's own separators."""
        parts = [translations[0]]
        for separator, translation in zip(self.separators, translations[1:]):
            parts += [separator, translation]
        return "".join(parts)


def _pieces(text: str, pattern: re.Pattern) -> List[Tuple[str, str]]:
    """The pieces of `text` between `pattern` matches, each with the separator before it."""
    parts = pattern.split(text)
    return [(parts[i - 1] if i else "", parts[i]) for i in range(0, len(parts), 2)]


def _too_large(message: str) -> TranslationError:
    return TranslationError(message=message, error_type=ErrorType.PAYLOAD_TOO_LARGE, status_code=413)


def split_document(text: str, max_chars: int, max_segments: int) -> Document:
    """
    Split a document into segments of at most `max_chars` characters.

    Surrounding whitespace is dropped; a text within the limit is one segment.

    Args:
        text (str): The document.
        max_chars (int): Longest segment, in characters (`LLM_SEGMENT_MAX_CHARS`).
        max_segments (int): Most segments (`LLM_MAX_SEGMENTS`).

    Returns:
        Document: The segments and the separators between them.

    Raises:
        TranslationError: 413 if a line is longer than `max_chars`, or the
            document needs more than `max_segments` segments.
    """
    segments: List[str] = []
    separators: List[str] = []
    last_packable = False

    def add(separator: str, piece: str, packable: bool) -> None:
        nonlocal last_packable
        if packable and last_packable and len(segments[-1]) + len(separator) + len(piece) <= max_chars:
            segments[-1] += separator + piece
        else:
            if segments:
                separators.append(separator)
            segments.append(piece)
        last_packable = packable

    for separator, paragraph in _pieces(text.strip(), PARAGRAPH_BREAK):
        if len(paragraph) <= max_chars:
            add(separator, paragraph, packable=True)
            continue
        chunk_separator, chunk = separator, None
        for line_separator, line in _pieces(paragraph, LINE_BREAK):
            if len(line) > max_chars:
                raise _too_large(
                    f"The document has a line of {len(line)} characters, more than LLM_SEGMENT_MAX_CHARS "
                    f"({max_chars}) allows; it cannot be split at a paragraph or line boundary."
                )
            if chunk is not None and len(chunk) + len(line_separator) + len(line) <= max_chars:
                chunk += line_separator + line
                continue
            if chunk is not None:
                add(chunk_separator, chunk, packable=False)
                chunk_separator = line_separator
            chunk = line
        add(chunk_separator, chunk, packable=False)

    if len(segments) > max_segments:
        raise _too_large(
            f"The document splits into {len(segments)} segments, more than LLM_MAX_SEGMENTS ({max_segments}) allows."
        )
    return Document(segments=segments, separators=separators)
