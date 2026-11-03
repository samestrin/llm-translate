"""
gettext PO: fill each entry's `msgstr` from its `msgid`; comments, references,
flags, context, order and plural forms stay. A plural entry gets one translation
per form of the target language (`nplurals` from `Plural-Forms`, else the forms
already in the file, else two).
"""
import re
from typing import Dict, List, Optional

import polib

from llm_translate.formats.base import FormatDocument, Segment, malformed, needs, translatable


class PoDocument(FormatDocument):
    def __init__(self, po: polib.POFile):
        self._po = po
        self.segments: List[Segment] = []
        self._entries = []
        nplurals = self._nplurals()
        for entry in po:
            if entry.obsolete or not entry.msgid:
                continue
            if entry.msgid_plural:
                forms = nplurals or len(entry.msgstr_plural) or 2
                for form in range(forms):
                    source = entry.msgid if form == 0 else entry.msgid_plural
                    if translatable(source):
                        self.segments.append(Segment(self._id(entry, form), source))
                self._entries.append((entry, forms))
            elif translatable(entry.msgid):
                self.segments.append(Segment(self._id(entry, None), entry.msgid))
                self._entries.append((entry, None))

    def render(self, translations: Dict[str, str], language: Optional[str] = None) -> str:
        lookup = needs(self, translations)
        for entry, forms in self._entries:
            if forms is None:
                entry.msgstr = lookup(self._id(entry, None), entry.msgid)
            else:
                entry.msgstr_plural = {
                    form: lookup(self._id(entry, form), entry.msgid if form == 0 else entry.msgid_plural)
                    for form in range(forms)
                }
            if "fuzzy" in entry.flags:
                entry.flags.remove("fuzzy")
        if language:
            self._po.metadata["Language"] = language
        return str(self._po)

    def _nplurals(self) -> Optional[int]:
        match = re.search(r"nplurals\s*=\s*(\d+)", self._po.metadata.get("Plural-Forms", ""))
        return int(match.group(1)) if match else None

    @staticmethod
    def _id(entry: polib.POEntry, form: Optional[int]) -> str:
        context = f"msgctxt {entry.msgctxt!r} " if entry.msgctxt else ""
        suffix = "" if form is None else f"[{form}]"
        return f"{context}msgid {entry.msgid!r}{suffix}"


def parse(text: str) -> PoDocument:
    try:
        po = polib.pofile(text if "\n" in text else text + "\n", encoding="utf-8")
    except (OSError, ValueError, IndexError, UnicodeError) as error:
        raise malformed("PO", str(error).splitlines()[0] if str(error) else "invalid syntax", error)
    return PoDocument(po)
