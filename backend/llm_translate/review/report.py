"""
The review report: flags (segment id and reason) and, per step, the model and
the tokens spent. Cost is tokens (prompt, completion, total from `Usage`); there is
no money figure.
"""
from typing import List, Optional, Union

from pydantic import BaseModel, ConfigDict, Field

from llm_translate.services.llm_client import Usage

from .revision import CheckedSegment

STEP_ORDER = ("translation", "back_translation", "review", "revision")


class ReviewFlag(BaseModel):
    """A segment that needs a human, and why."""
    segment: Union[int, str] = Field(..., description="Segment number from 1, or the key for JSON, YAML and PO files")
    reason: str = Field(..., description="Why it needs a human; model-written text")


class StepReport(BaseModel):
    """One step of the run: the model that answered and the tokens it spent over all its calls."""
    model_config = ConfigDict(protected_namespaces=())

    step: str = Field(..., description="translation, back_translation, review or revision")
    model: Optional[str] = Field(..., description="Model that answered (the first one if several did)")
    usage: Usage = Field(..., description="Tokens spent: prompt, completion and total; no money figure")


class ReviewReport(BaseModel):
    """What the review pass found and what it cost. Review is advice for a human, not a gate."""
    flags: List[ReviewFlag] = Field(default_factory=list, description="Segments that need a human")
    steps: List[StepReport] = Field(default_factory=list, description="Model and tokens per step")
    usage: Usage = Field(default_factory=Usage, description="Tokens spent over every step")


def build_report(
    segments: List[CheckedSegment], ids: List[Union[int, str]], translation_model: Optional[str],
    translation_usage: Usage,
) -> ReviewReport:
    """
    Collect flags and per-step models and tokens.

    Args:
        segments: The checked segments.
        ids: One id per checked segment, in the same order.
        translation_model: Model that translated, if one was called.
        translation_usage: Tokens the translation step spent (auto-detect included).
    """
    flags = [ReviewFlag(segment=id_, reason=seg.flag) for id_, seg in zip(ids, segments) if seg.flag]
    totals = {"translation": [translation_model, translation_usage]}
    for seg in segments:
        for step in seg.steps:
            entry = totals.setdefault(step.step, [step.model, Usage()])
            entry[1] = entry[1] + step.usage
    steps = [
        StepReport(step=name, model=totals[name][0], usage=totals[name][1])
        for name in STEP_ORDER if name in totals
    ]
    total = Usage()
    for step in steps:
        total = total + step.usage
    return ReviewReport(flags=flags, steps=steps, usage=total)
