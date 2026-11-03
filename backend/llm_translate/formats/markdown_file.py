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
    cells: _Pieces = []
    cell = -1  # index of the table cell being read, -1 outside one
    count = 0
    for token in MarkdownIt("commonmark").enable("table").parse(body):
        if token.type == "tr_open":
            cells = _row_cells(body, line_starts[token.map[0]], line_starts[token.map[0] + 1] - 1)
            count = 0
        elif token.type in ("th_open", "td_open"):
            cell, count = count, count + 1
        elif token.type in ("th_close", "td_close"):
            cell = -1
        elif token.type == "inline" and token.content.strip():
            if cell >= 0:
                # cut the cell from its row's source: markdown-it has already unescaped `\|`
                pieces = [cells[cell]] if cell < len(cells) else None
                text = body[pieces[0][0]:pieces[0][1]] if pieces else ""
            else:
                pieces, text = _locate(token, body, line_starts), token.content
            if pieces is None:
                raise _unreadable()
            blocks.append([(base + a, base + b) for a, b in pieces])
            segments.append(text)

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


def _row_cells(body: str, start: int, stop: int) -> _Pieces:
    """The span of each cell's text (without padding) in the table row at `body[start:stop]`."""
    cells: _Pieces = []
    position = start
    while position <= stop:
        end = position
        while end < stop and body[end] != "|":
            end += 2 if body[end] == "\\" else 1
        end = min(end, stop)
        text = body[position:end]
        lead = len(text) - len(text.lstrip())
        cells.append((position + lead, position + len(text.rstrip())))
        position = end + 1
    # a leading or trailing pipe leaves an empty piece at that end
    if cells and cells[0][0] == cells[0][1] and body[start:stop].lstrip().startswith("|"):
        cells.pop(0)
    if cells and cells[-1][0] == cells[-1][1] and body[start:stop].rstrip().endswith("|"):
        cells.pop()
    return cells


def _locate(token, body: str, line_starts: List[int]) -> Optional[_Pieces]:
    """The span of each content line of a block's inline token in `body`, or None if it is not there."""
    first = token.map[0]
    pieces: _Pieces = []
    for i, part in enumerate(token.content.split("\n")):
        start, stop = line_starts[first + i], line_starts[first + i + 1] - 1
        index = body.rfind(part, start, stop)
        if index < 0:
            return None
        pieces.append((index, index + len(part)))
    return pieces
