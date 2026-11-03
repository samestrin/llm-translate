"""
Placeholder and tag protection: mask what a translation must keep, check it came back.

`protect` replaces every placeholder in a segment with a numbered mask (`⟦0⟧`,
`⟦1⟧`, ...) before the segment goes to the model; `restore` puts the originals
back into the model's answer, or raises `PlaceholderError` naming the segment
when a mask is missing, duplicated, unknown, out of order, or when the answer
has a placeholder of its own.

Protected:
- brace placeholders: `{name}`, `{0}`, `{}`, `{amount, number}`, `{{name}}`, `${name}`
- printf: `%s`, `%d`, `%1$d`, `%.2f`, `%(name)s`, `%%` (a `%` glued to a letter
  or digit before it, as in `100%ig`, is text)
- ICU `plural`, `select` and `selectordinal`: the header, each `selector {`,
  each closing `}` and `#`; the words in the branches stay translatable
- HTML tags and comments, and autolinks such as `<https://example.com>`
- Markdown inline code, `**`, `__`, `~~`, and the `[`, `](url)` / `][ref]`
  around link and image text (the text itself stays translatable)

Placeholders may move, since languages order words differently; only the parts
of one structure (an ICU message, a tag pair, a link) must stay in order.
"""
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union

from llm_translate.utils.exceptions import ErrorType, TranslationError

Segment = Union[str, int]

_MASK = re.compile(r"⟦(\d+)⟧")

_MUSTACHE = re.compile(r"\{\{\s*[\w.-]+\s*\}\}")
_BRACE = re.compile(r"\{\s*[\w.$-]*\s*(?:[,:!][^{}]*)?\}")
_TEMPLATE = re.compile(r"\$\{[^{}]+\}")
_PRINTF = re.compile(
    r"%%"
    r"|%\([\w.]+\)[-+0#]*\d*(?:\.\d+)?[diouxXeEfFgGcrsa]"
    r"|%(?:\d+\$)?[-+0#]*(?:\d+|\*)?(?:\.(?:\d+|\*))?(?:hh|h|ll|l|L|q|j|z|t)?[diouxXeEfFgGaAcspn@]"
)
_HTML_COMMENT = re.compile(r"<!--.*?-->", re.DOTALL)
_AUTOLINK = re.compile(r"<(?:https?|ftp|mailto):[^<>\s]+>")
_TAG = re.compile(r"<(/?)([A-Za-z][\w:-]*)(?:\s[^<>]*)?/?>")
_CODE = re.compile(r"(`+)(?!`).+?(?<!`)\1(?!`)")
_EMPHASIS = re.compile(r"\*\*|__|~~")
_LINK = re.compile(
    r"(!?\[)([^\[\]]*)(\]\((?:[^()\s]|\([^()]*\))*(?:\s+\"[^\"]*\")?\)|\]\[[^\[\]]*\])"
)
_ICU_HEADER = re.compile(r"\{\s*[\w.]+\s*,\s*(plural|select|selectordinal)\s*,(?:\s*offset:\s*\d+)?")
_ICU_SELECTOR = re.compile(r"\s*((?:=\d+|[\w-]+)\s*\{)")

_VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


@dataclass
class _Token:
    start: int
    end: int
    group: Optional[int] = None  # parts of one structure share a group and must stay in order


@dataclass
class ProtectedText:
    """
    A segment with its placeholders masked.

    Attributes:
        text: The segment as the model sees it; `⟦i⟧` stands for `placeholders[i]`.
        placeholders: The masked originals, in source order.
        groups: Lists of placeholder indices whose order the translation must keep.
    """
    text: str
    placeholders: List[str]
    groups: List[List[int]] = field(default_factory=list)


class PlaceholderError(TranslationError):
    """
    A translation that lost, changed or misordered a segment's placeholders.

    Attributes:
        segment: The segment the failure belongs to.
        missing: Placeholders the translation does not contain.
        duplicated: Placeholders the translation contains more than once.
        unexpected: Masks or placeholders in the translation that the source did not have.
        misordered: Parts of one structure (ICU message, tag pair, link) that came back out of order.
    """

    def __init__(
        self,
        segment: Segment,
        missing: List[str],
        duplicated: List[str],
        unexpected: List[str],
        misordered: List[str],
    ):
        self.segment = segment
        self.missing = missing
        self.duplicated = duplicated
        self.unexpected = unexpected
        self.misordered = misordered
        problems = []
        for label, items in (
            ("missing", missing),
            ("duplicated", duplicated),
            ("unexpected", unexpected),
            ("out of order", misordered),
        ):
            if items:
                problems.append(f"{label} {', '.join(items)}")
        super().__init__(
            message=f"Segment {segment}: the translation did not keep its placeholders ({'; '.join(problems)}).",
            error_type=ErrorType.API_ERROR,
            status_code=500,
        )


def protect(text: str) -> ProtectedText:
    """Mask every placeholder and tag in `text`."""
    groups: List[List[_Token]] = []
    tokens = _scan(text, 0, len(text), in_plural=False, groups=groups)
    _pair_tags(text, tokens, groups)

    index = {id(token): i for i, token in enumerate(tokens)}
    parts, placeholders, position = [], [], 0
    for i, token in enumerate(tokens):
        parts.append(text[position:token.start])
        parts.append(f"⟦{i}⟧")
        placeholders.append(text[token.start:token.end])
        position = token.end
    parts.append(text[position:])
    return ProtectedText(
        text="".join(parts),
        placeholders=placeholders,
        groups=[[index[id(token)] for token in group] for group in groups],
    )


def restore(protected: ProtectedText, translation: str, segment: Segment) -> str:
    """
    Put the placeholders back into the model's translation of `protected.text`.

    Raises:
        PlaceholderError: When any placeholder is missing, duplicated, unexpected
            or out of order; it names `segment`.
    """
    count = len(protected.placeholders)
    seen: Dict[int, int] = {}
    first_at: Dict[int, int] = {}
    unexpected: List[str] = []
    for match in _MASK.finditer(translation):
        i = int(match.group(1))
        if i >= count:
            unexpected.append(match.group(0))
            continue
        seen[i] = seen.get(i, 0) + 1
        first_at.setdefault(i, match.start())
    for token in _scan(translation, 0, len(translation), in_plural=False, groups=[]):
        original = translation[token.start:token.end]
        if not _MASK.fullmatch(original):
            unexpected.append(original)

    missing = [protected.placeholders[i] for i in range(count) if i not in seen]
    duplicated = [protected.placeholders[i] for i in range(count) if seen.get(i, 0) > 1]
    misordered: List[str] = []
    for group in protected.groups:
        positions = [first_at[i] for i in group if i in first_at]
        if positions != sorted(positions):
            misordered.extend(protected.placeholders[i] for i in group)

    if missing or duplicated or unexpected or misordered:
        raise PlaceholderError(segment, missing, duplicated, unexpected, misordered)
    return _MASK.sub(lambda match: protected.placeholders[int(match.group(1))], translation)


def _scan(text: str, start: int, end: int, in_plural: bool, groups: List[List[_Token]]) -> List[_Token]:
    """The placeholder tokens in `text[start:end]`, in order."""
    tokens: List[_Token] = []
    i = start
    while i < end:
        char = text[i]
        found: Optional[List[_Token]] = None
        if char == "{":
            found = _icu(text, i, end, groups)
            if found is None:
                match = _MUSTACHE.match(text, i, end) or _BRACE.match(text, i, end)
                found = [_Token(i, match.end())] if match else None
        elif char == "$":
            found = _single(_TEMPLATE, text, i, end)
        elif char == "%":
            match = _PRINTF.match(text, i, end)
            # `100%ig` is text; `100%%` is an escaped percent sign
            if match and (match.group(0) == "%%" or i == 0 or not text[i - 1].isalnum()):
                found = [_Token(i, match.end())]
        elif char == "<":
            found = (
                _single(_HTML_COMMENT, text, i, end)
                or _single(_AUTOLINK, text, i, end)
                or _single(_TAG, text, i, end)
            )
        elif char == "`":
            found = _single(_CODE, text, i, end)
        elif char in "*_~":
            found = _single(_EMPHASIS, text, i, end)
        elif char in "[!":
            found = _link(text, i, end, in_plural, groups)
        elif char == "#" and in_plural:
            found = [_Token(i, i + 1)]
        elif char == "⟦":
            found = _single(_MASK, text, i, end)

        if found:
            tokens.extend(found)
            i = found[-1].end
        else:
            i += 1
    return tokens


def _single(pattern: re.Pattern, text: str, i: int, end: int) -> Optional[List[_Token]]:
    match = pattern.match(text, i, end)
    return [_Token(i, match.end())] if match else None


def _link(text: str, i: int, end: int, in_plural: bool, groups: List[List[_Token]]) -> Optional[List[_Token]]:
    """`[`, the tokens in the link text, and `](url)` or `][ref]`; the two ends stay in order."""
    match = _LINK.match(text, i, end)
    if not match:
        return None
    opener = _Token(match.start(1), match.end(1))
    closer = _Token(match.start(3), match.end(3))
    inner = _scan(text, match.start(2), match.end(2), in_plural, groups)
    groups.append([opener, closer])
    return [opener, *inner, closer]


def _icu(text: str, i: int, end: int, groups: List[List[_Token]]) -> Optional[List[_Token]]:
    """The structure of an ICU plural or select message starting at `i`, or None if there is none."""
    header = _ICU_HEADER.match(text, i, end)
    if not header:
        return None
    in_plural = header.group(1) != "select"
    nested: List[List[_Token]] = []
    structure = [_Token(i, header.end())]
    tokens = list(structure)
    position = header.end()
    while True:
        while position < end and text[position].isspace():
            position += 1
        if position >= end:
            return None
        if text[position] == "}":
            closing = _Token(position, position + 1)
            structure.append(closing)
            tokens.append(closing)
            break
        selector = _ICU_SELECTOR.match(text, position, end)
        if not selector:
            return None
        opening = _Token(selector.start(1), selector.end(1))
        body_end = _matching_brace(text, opening.end, end)
        if body_end is None:
            return None
        closing = _Token(body_end, body_end + 1)
        structure.extend([opening, closing])
        tokens.extend([opening, *_scan(text, opening.end, body_end, in_plural, nested), closing])
        position = closing.end
    if len(structure) < 4:  # a header and a closing brace with no branch is not a message
        return None
    groups.append(structure)
    groups.extend(nested)
    return tokens


def _matching_brace(text: str, start: int, end: int) -> Optional[int]:
    """The index of the `}` that closes a brace opened just before `start`."""
    depth = 1
    for position in range(start, end):
        if text[position] == "{":
            depth += 1
        elif text[position] == "}":
            depth -= 1
            if depth == 0:
                return position
    return None


def _pair_tags(text: str, tokens: List[_Token], groups: List[List[_Token]]) -> None:
    """Group each HTML opening tag with its closing tag, so the two stay in order."""
    open_tags: List[tuple] = []
    for token in tokens:
        match = _TAG.fullmatch(text, token.start, token.end)
        if not match:
            continue
        name = match.group(2).lower()
        if match.group(1):
            for depth in range(len(open_tags) - 1, -1, -1):
                if open_tags[depth][0] == name:
                    groups.append([open_tags[depth][1], token])
                    del open_tags[depth:]
                    break
        elif name not in _VOID_TAGS and not match.group(0).endswith("/>"):
            open_tags.append((name, token))
