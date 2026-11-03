"""
YAML: translate string values; keys, order, comments, anchors, quoting style and
block scalars stay (ruamel.yaml round-trips them).
"""
import io
import re
from typing import Any, Dict, List

from ruamel.yaml import YAML
from ruamel.yaml.error import YAMLError
from ruamel.yaml.scalarstring import ScalarString

from llm_translate.formats.base import FormatDocument, Segment, malformed, needs, translatable


def _yaml(offset: int = 0) -> YAML:
    yaml = YAML(typ="rt")
    yaml.preserve_quotes = True
    yaml.width = 4096  # never re-fold a long line
    yaml.indent(mapping=2, sequence=offset + 2, offset=offset)
    return yaml


def _sequence_offset(text: str) -> int:
    """How far the source indents a sequence's dashes under its key (0 or 2 are the usual styles)."""
    match = re.search(r"^( *)[^\s#-][^\n]*:[ \t]*\n( *)- ", text, re.MULTILINE)
    return max(len(match.group(2)) - len(match.group(1)), 0) if match else 0


class YamlDocument(FormatDocument):
    def __init__(self, data: Any, offset: int = 0):
        self._data = data
        self._offset = offset
        self._anchored: Dict[int, Any] = {}
        self.segments: List[Segment] = []
        self._walk(data, "", lambda path, text: self.segments.append(Segment(path, text)) or text, set())

    def render(self, translations: Dict[str, str]) -> str:
        # Edits in place; an aliased scalar is translated once and its replacement shared.
        self._anchored = {}
        self._walk(self._data, "", needs(self, translations), set())
        stream = io.StringIO()
        _yaml(self._offset).dump(self._data, stream)
        return stream.getvalue()

    def _walk(self, node: Any, path: str, visit, seen: set) -> None:
        if isinstance(node, dict):
            if id(node) in seen:
                return
            seen.add(id(node))
            for key in list(node.keys()):
                child = f"{path}.{key}" if path else str(key)
                node[key] = self._value(node[key], child, visit, seen)
        elif isinstance(node, list):
            if id(node) in seen:
                return
            seen.add(id(node))
            for i in range(len(node)):
                node[i] = self._value(node[i], f"{path}[{i}]", visit, seen)

    def _value(self, value: Any, path: str, visit, seen: set) -> Any:
        if isinstance(value, str):
            if not translatable(value):
                return value
            anchored = getattr(getattr(value, "anchor", None), "value", None) is not None
            if anchored and id(value) in self._anchored:  # an alias of a scalar already handled
                return self._anchored[id(value)]
            new = visit(path, str(value))
            result = value if new == value else self._replace(value, new)
            if anchored:
                self._anchored[id(value)] = result
            return result
        self._walk(value, path, visit, seen)
        return value

    @staticmethod
    def _replace(value: Any, new: str) -> Any:
        if not isinstance(value, ScalarString):
            return new
        replacement = type(value)(new)
        anchor = getattr(value, "anchor", None)
        if anchor is not None and anchor.value is not None:
            replacement.yaml_set_anchor(anchor.value, always_dump=anchor.always_dump)
        return replacement


def parse(text: str) -> YamlDocument:
    try:
        data = _yaml().load(text)
    except YAMLError as error:
        mark = getattr(error, "problem_mark", None)
        where = f"line {mark.line + 1}, column {mark.column + 1}" if mark else "invalid syntax"
        raise malformed("YAML", where, error)
    return YamlDocument(data, _sequence_offset(text))
