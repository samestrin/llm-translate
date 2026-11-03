"""
Glossary: terms a translation must use, and the check that reports the ones it missed.

An entry applies to a text only when its source term occurs in it, matched
case-insensitively as a substring. A translated term must then appear in the
output (case-insensitively); a do-not-translate term must appear unchanged
(case-sensitively).
"""
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class GlossaryEntry(BaseModel):
    """
    One glossary term: its translation, or a flag to keep it as is.
    """
    source_term: str = Field(..., min_length=1, description="Term as it appears in the source text")
    target_term: Optional[str] = Field(
        None, description="Translation to use; not needed when `do_not_translate` is true"
    )
    note: Optional[str] = Field(None, description="Context for the model, e.g. which sense of the term is meant")
    do_not_translate: bool = Field(False, description="Keep the term exactly as written in the source")

    @model_validator(mode="after")
    def _has_terms(self) -> "GlossaryEntry":
        if not self.source_term.strip():
            raise ValueError("source_term must not be blank")
        if not self.do_not_translate and not (self.target_term or "").strip():
            raise ValueError("target_term is required unless do_not_translate is true")
        return self

    @property
    def expected_target(self) -> str:
        """The text the translation must contain."""
        return self.source_term if self.do_not_translate else self.target_term


class GlossaryMiss(BaseModel):
    """
    A glossary term whose expected text is missing from the translation.
    """
    term: str = Field(..., description="Source term found in the text")
    expected: str = Field(..., description="Text the translation should have contained")


def applicable(glossary: List[GlossaryEntry], text: str) -> List[GlossaryEntry]:
    """The entries whose source term occurs in `text` (case-insensitive substring)."""
    lowered = text.lower()
    return [entry for entry in glossary if entry.source_term.lower() in lowered]


def glossary_prompt(entries: List[GlossaryEntry]) -> str:
    """The prompt block that tells the model which terms to use; empty when there are none."""
    if not entries:
        return ""
    lines = ["Use this glossary for the terms below:"]
    for entry in entries:
        if entry.do_not_translate:
            line = f'- "{entry.source_term}" -> keep unchanged, do not translate'
        else:
            line = f'- "{entry.source_term}" -> "{entry.target_term}"'
        if entry.note:
            line += f" ({entry.note})"
        lines.append(line)
    return "\n".join(lines)


def find_misses(glossary: List[GlossaryEntry], source: str, translation: str) -> List[GlossaryMiss]:
    """
    The applicable entries whose expected text the translation does not contain.

    A do-not-translate term must appear exactly; a translated term may differ in case.
    """
    misses = []
    for entry in applicable(glossary, source):
        if entry.do_not_translate:
            found = entry.source_term in translation
        else:
            found = entry.target_term.lower() in translation.lower()
        if not found:
            misses.append(GlossaryMiss(term=entry.source_term, expected=entry.expected_target))
    return misses
