"""
HTML files: translate the text nodes, keep everything else byte for byte.

Tags, attributes, comments, doctype and the text inside `script`, `style`,
`pre`, `code`, `textarea`, `kbd` and `samp` are never segments. A text node's
leading and trailing whitespace stays; entities are decoded for the model and
the translation is escaped (`&`, `<`, `>`) on the way back.
"""
import html
from html.parser import HTMLParser
from typing import List, Tuple

from llm_translate.formats.document import TextDocument
from llm_translate.utils.exceptions import ErrorType, TranslationError

_VERBATIM = {"script", "style", "pre", "code", "textarea", "kbd", "samp"}


class _Scanner(HTMLParser):
    """Collects the character spans of markup and of text that must stay as it is."""

    def __init__(self, source: str):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_starts = [0]
        for line in source.split("\n"):
            self.line_starts.append(self.line_starts[-1] + len(line) + 1)
        self.kept: List[Tuple[int, int]] = []
        self.depth = {name: 0 for name in _VERBATIM}

    def _offset(self) -> int:
        line, column = self.getpos()
        return self.line_starts[line - 1] + column

    def _keep_until(self, terminator: str) -> None:
        start = self._offset()
        stop = self.source.find(terminator, start)
        self.kept.append((start, len(self.source) if stop < 0 else stop + len(terminator)))

    def handle_starttag(self, tag, attrs):
        start = self._offset()
        self.kept.append((start, start + len(self.get_starttag_text())))
        if tag in _VERBATIM:
            self.depth[tag] += 1

    def handle_startendtag(self, tag, attrs):
        start = self._offset()
        self.kept.append((start, start + len(self.get_starttag_text())))

    def handle_endtag(self, tag):
        self._keep_until(">")
        if tag in _VERBATIM and self.depth[tag]:
            self.depth[tag] -= 1

    def handle_comment(self, data):
        self._keep_until("-->")

    def handle_decl(self, decl):
        self._keep_until(">")

    def handle_pi(self, data):
        self._keep_until(">")

    def unknown_decl(self, data):
        self._keep_until("]>" if data.startswith("CDATA") else ">")

    def handle_data(self, data):
        if any(self.depth.values()):
            start = self._offset()
            self.kept.append((start, start + len(data)))

    def handle_entityref(self, name):
        self._keep_data(f"&{name}")

    def handle_charref(self, name):
        self._keep_data(f"&#{name}")

    def _keep_data(self, prefix: str) -> None:
        if any(self.depth.values()):
            start = self._offset()
            stop = self.source.find(";", start)
            self.kept.append((start, start + len(prefix) if stop < 0 else stop + 1))


def parse(source: str) -> TextDocument:
    """
    Split an HTML file into text-node segments.

    Raises:
        TranslationError: (400) when the parser cannot read the file.
    """
    scanner = _Scanner(source)
    try:
        scanner.feed(source)
        scanner.close()
    except Exception as e:
        raise TranslationError(
            message="The HTML file could not be parsed.",
            error_type=ErrorType.API_ERROR,
            status_code=400,
        ) from e

    # Everything between kept spans is a text node; keep whitespace-only nodes as they are.
    pieces: List[Tuple[bool, str]] = []  # (is_segment, text)
    segments: List[str] = []
    position = 0
    for start, stop in sorted(scanner.kept) + [(len(source), len(source))]:
        if start > position:
            node = source[position:start]
            core = node.strip()
            if core:
                lead = node[: len(node) - len(node.lstrip())]
                trail = node[len(node.rstrip()):]
                pieces.append((False, lead))
                pieces.append((True, core))
                pieces.append((False, trail))
                segments.append(html.unescape(core))
            else:
                pieces.append((False, node))
        if stop > start:
            pieces.append((False, source[start:stop]))
        position = max(position, stop)

    def render(translations: List[str]) -> str:
        if len(translations) != len(segments):
            raise ValueError(f"expected {len(segments)} translations, got {len(translations)}")
        texts = iter(translations)
        out = []
        for is_segment, text in pieces:
            if not is_segment:
                out.append(text)
                continue
            translation = next(texts).strip()
            # an unchanged node keeps its source bytes, entities included
            out.append(text if translation == html.unescape(text) else html.escape(translation, quote=False))
        return "".join(out)

    return TextDocument(segments=segments, render=render)
