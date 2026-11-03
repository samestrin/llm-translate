"""
JSON: translate string values; keys, order, numbers, booleans and nulls stay.
"""
import json
import re
from typing import Any, Dict, List

from llm_translate.formats.base import FormatDocument, Segment, malformed, needs, translatable


class JsonDocument(FormatDocument):
    def __init__(self, data: Any, indent: Any, trailing_newline: bool):
        self._data = data
        self._indent = indent
        self._trailing_newline = trailing_newline
        self.segments: List[Segment] = []
        self._walk(data, "", lambda path, text: self.segments.append(Segment(path, text)) or text)

    def render(self, translations: Dict[str, str]) -> str:
        lookup = needs(self, translations)
        out = self._walk(self._data, "", lookup)
        text = json.dumps(out, ensure_ascii=False, indent=self._indent)
        return text + "\n" if self._trailing_newline else text

    def _walk(self, node: Any, path: str, visit) -> Any:
        if isinstance(node, str):
            return visit(path, node) if translatable(node) else node
        if isinstance(node, dict):
            return {
                key: self._walk(value, f"{path}.{key}" if path else key, visit)
                for key, value in node.items()
            }
        if isinstance(node, list):
            return [self._walk(value, f"{path}[{i}]", visit) for i, value in enumerate(node)]
        return node


def parse(text: str) -> JsonDocument:
    try:
        data = json.loads(text)
    except ValueError as error:
        raise malformed("JSON", f"line {getattr(error, 'lineno', '?')}, column {getattr(error, 'colno', '?')}", error)
    match = re.search(r"^\n?([ \t]+)\S", text, re.MULTILINE)
    if "\n" not in text.strip():
        indent = None
    elif match:
        indent = "\t" if match.group(1).startswith("\t") else len(match.group(1))
    else:
        indent = 2
    return JsonDocument(data, indent, text.endswith("\n"))
