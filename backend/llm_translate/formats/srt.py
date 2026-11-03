"""
SRT subtitles: translate the text of each cue, keep its number and timing.

`parse` splits a file into cues; the text of each cue is the segment sent to the
model. `render` writes the cues back with the translated text, wrapping any line
longer than `max_line_chars` at word boundaries. Length alone never fails a
segment: a word longer than the limit stays on a line of its own.
"""
import re
from dataclasses import dataclass
from typing import List, Sequence

from llm_translate.utils.exceptions import ErrorType, TranslationError

_TIMING = re.compile(r"^\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}.*$")


@dataclass(frozen=True)
class Cue:
    """
    One subtitle cue.

    Attributes:
        number: The cue number line, exactly as written.
        timing: The timing line, exactly as written.
        text: The cue's text, lines joined by newlines; this is the segment to translate.
    """
    number: str
    timing: str
    text: str


def parse(content: str) -> List[Cue]:
    """
    Split an SRT file into cues.

    Raises:
        TranslationError: When a block has no number and timing line, or no cue is found.
    """
    content = content.lstrip("﻿").replace("\r\n", "\n").replace("\r", "\n")
    cues: List[Cue] = []
    for block in re.split(r"\n{2,}", content.strip("\n")):
        lines = block.split("\n")
        if len(lines) < 2 or not lines[0].strip().isdigit() or not _TIMING.match(lines[1]):
            raise _malformed(f"cue {len(cues) + 1} has no number and timing line")
        cues.append(Cue(number=lines[0].strip(), timing=lines[1].strip(), text="\n".join(lines[2:])))
    if not cues:
        raise _malformed("no cues found")
    return cues


def render(cues: Sequence[Cue], translations: Sequence[str], max_line_chars: int) -> str:
    """Write `cues` back with `translations` as their text; numbers and timings are untouched."""
    if len(cues) != len(translations):
        raise ValueError("one translation per cue is required")
    blocks = []
    for cue, translation in zip(cues, translations):
        text = wrap(translation, max_line_chars)
        blocks.append("\n".join([cue.number, cue.timing] + ([text] if text else [])))
    return "\n\n".join(blocks) + "\n"


def wrap(text: str, max_line_chars: int) -> str:
    """
    Wrap lines longer than `max_line_chars` at spaces; shorter lines and line breaks stay.

    An over-long line is split into the fewest lines, as evenly as the words allow.
    """
    return "\n".join(_wrap_line(line.strip(), max_line_chars) for line in text.strip().split("\n"))


def _wrap_line(line: str, limit: int) -> str:
    if len(line) <= limit:
        return line
    words = line.split()
    wanted = -(-len(line) // limit)  # fewest lines that could hold it
    target = max(1, -(-len(line) // wanted))
    lines: List[str] = []
    current = ""
    for word in words:
        joined = f"{current} {word}" if current else word
        if current and (len(joined) > limit or (len(current) >= target and len(lines) < wanted - 1)):
            lines.append(current)
            current = word
        else:
            current = joined
    lines.append(current)
    return "\n".join(lines)


def _malformed(reason: str) -> TranslationError:
    return TranslationError(
        message=f"The SRT file is malformed: {reason}.",
        error_type=ErrorType.INVALID_REQUEST,
        status_code=400,
    )
