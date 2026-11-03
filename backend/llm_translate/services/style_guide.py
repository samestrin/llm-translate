"""
Style guide: tone, formality, audience and free notes that shape how a translation reads.
"""
from typing import Optional

from pydantic import BaseModel, Field


class StyleGuide(BaseModel):
    """
    How the translation should read. Every field is optional; blank ones are left out of the prompt.
    """
    tone: Optional[str] = Field(None, description="Tone of voice, e.g. friendly, neutral, authoritative")
    formality: Optional[str] = Field(None, description="Level of formality, e.g. formal, informal")
    audience: Optional[str] = Field(None, description="Who will read the translation, e.g. enterprise IT admins")
    notes: Optional[str] = Field(None, description="Free-form instructions for the translator")


def style_guide_prompt(style_guide: Optional[StyleGuide]) -> str:
    """The prompt block that states the style guide; empty when no field has text."""
    if style_guide is None:
        return ""
    fields = [
        ("Tone", style_guide.tone),
        ("Formality", style_guide.formality),
        ("Audience", style_guide.audience),
        ("Notes", style_guide.notes),
    ]
    lines = [f"- {label}: {value.strip()}" for label, value in fields if value and value.strip()]
    if not lines:
        return ""
    return "\n".join(["Follow this style guide:", *lines])
