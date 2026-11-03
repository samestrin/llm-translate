"""
What the structured formats (JSON, YAML, PO) share: a parsed file is a list of
segments to translate and a way to write the file back with translated values.
"""
from dataclasses import dataclass
from typing import Callable, Dict, List

from llm_translate.utils.exceptions import ErrorType, TranslationError


@dataclass(frozen=True)
class Segment:
    """
    One string to translate.

    Attributes:
        id: Where it sits in the file (`menu.items[0]`, `msgid 'Hello'`); names the
            segment when it fails.
        text: The source string.
    """
    id: str
    text: str


class FormatDocument:
    """A parsed file: its segments, and the file again with translated segments."""

    segments: List[Segment]

    def render(self, translations: Dict[str, str]) -> str:
        """Write the file with each segment's text replaced by `translations[segment.id]`."""
        raise NotImplementedError


def malformed(format_name: str, reason: str, original: Exception) -> TranslationError:
    """The error for a file that does not parse; it carries the parser's reason, never the file."""
    return TranslationError(
        f"The {format_name} file is malformed: {reason}",
        error_type=ErrorType.INVALID_REQUEST,
        status_code=400,
        original_exception=original,
    )


def translatable(text: str) -> bool:
    """Blank strings have nothing to translate."""
    return bool(text.strip())


def needs(document: FormatDocument, translations: Dict[str, str]) -> Callable[[str, str], str]:
    """A lookup that returns the translation of segment `id`, or `text` when the segment is not translatable."""
    ids = {segment.id for segment in document.segments}

    def lookup(segment_id: str, text: str) -> str:
        if segment_id not in ids:
            return text
        try:
            return translations[segment_id]
        except KeyError:
            raise TranslationError(
                f"No translation for segment {segment_id}",
                error_type=ErrorType.INVALID_REQUEST,
                status_code=400,
            )

    return lookup
