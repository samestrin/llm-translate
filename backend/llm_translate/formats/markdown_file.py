"""
Markdown files: translate the inline text of paragraphs, headings, list items,
quotes and table cells; keep everything else byte for byte.

Fenced and indented code blocks, HTML blocks, link reference definitions, YAML
front matter and the markers around the text (`#`, `>`, `-`, table pipes, setext
underlines) are never segments. A segment is the inline source of one block, so
inline code, link destinations and inline HTML are still in it for
`placeholders.protect` to mask.
"""
import re
from typing import List, Optional, Tuple

from markdown_it import MarkdownIt

from llm_translate.formats.document import TextDocument
from llm_translate.utils.exceptions import ErrorType, TranslationError

_FRONT_MATTER = re.compile(r"\A---[ \t]*\r?\n.*?\r?\n---[ \t]*(?:\r?\n|\Z)", re.DOTALL)

# The character span of each line of a block's text in the source
_Pieces = List[Tuple[int, int]]


def _unreadable() -> TranslationError:
    return TranslationError(
        message="The Markdown file could not be kept intact: a text block does not appear in the file as parsed.",
        error_type=ErrorType.API_ERROR,
        status_code=400,
    )


def parse(source: str) -> TextDocument:
    """
    Split a Markdown file into inline-text segments.

    Raises:
        TranslationError: (400) when a block's text cannot be located in the source,
            so the file could not be put back together unchanged.
    """
    front = _FRONT_MATTER.match(source)
    base = front.end() if front else 0
    body = source[base:]
    line_starts = [0]
    for line in body.split("\n"):
        line_starts.append(line_starts[-1] + len(line) + 1)

    segments: List[str] = []
    blocks: List[_Pieces] = []
    row = None
    cursor = 0
    for token in MarkdownIt("commonmark").enable("table").parse(body):
        if token.type == "tr_open":
            row = token.map
        elif token.type == "inline" and token.content.strip():
            pieces = _locate(token, row, body, line_starts, cursor)
            if pieces is None:
                raise _unreadable()
            blocks.append([(base + a, base + b) for a, b in pieces])
            segments.append(token.content)
            cursor = pieces[-1][1]

    def render(translations: List[str]) -> str:
        if len(translations) != len(segments):
            raise ValueError(f"expected {len(segments)} translations, got {len(translations)}")
        out, position = [], 0
        for pieces, translation in zip(blocks, translations):
            start, stop = pieces[0][0], pieces[-1][1]
            text = translation.strip()
            if len(pieces) > 1:
                # continuation lines keep the block's own prefix (`> `, list indentation)
                line_start = source.rfind("\n", 0, pieces[1][0]) + 1
                text = text.replace("\n", "\n" + source[line_start:pieces[1][0]])
            else:
                text = " ".join(text.split("\n"))
            out.append(source[position:start])
            out.append(text)
            position = stop
        out.append(source[position:])
        return "".join(out)

    return TextDocument(segments=segments, render=render)


def _locate(token, row, body: str, line_starts: List[int], cursor: int) -> Optional[_Pieces]:
    """The span of each content line of an inline token in `body`, or None if it is not there."""
    parts = token.content.split("\n")
    if token.map is None:
        # a table cell has no map of its own: look for it in its row, after the previous cell
        if row is None:
            return None
        row_start, row_end = line_starts[row[0]], line_starts[row[1]]
        index = body.find(parts[0], max(cursor, row_start), row_end)
        return None if index < 0 else [(index, index + len(parts[0]))]
    first = token.map[0]
    pieces: _Pieces = []
    for i, part in enumerate(parts):
        if first + i + 1 >= len(line_starts):
            return None
        start, stop = line_starts[first + i], line_starts[first + i + 1] - 1
        index = body.rfind(part, start, stop)
        if index < 0:
            return None
        pieces.append((index, index + len(part)))
    return pieces
