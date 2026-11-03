"""
Back-translation: each translated segment is translated back into the source
language on the fast (`translate`) tier, so a reviewer can compare it with the source.
"""
import asyncio
from typing import List, Tuple

from pydantic import BaseModel, Field

from llm_translate.services.llm_client import LLMClient, Usage
from llm_translate.services.llm_translator import TEMPERATURE, strip_outer_quotes
from llm_translate.utils.exceptions import ErrorType, TranslationError
from llm_translate.utils.logging import setup_logger

BACK_TRANSLATE_SYSTEM_PROMPT = (
    "You back-translate for a translation reviewer. Translate the given text back into the requested "
    "language as literally as reads naturally, so any change of meaning stays visible. Do not correct, "
    "improve or explain it. Only return the back-translation."
)

logger = setup_logger("llm_translate.review.back_translation")


class BackTranslation(BaseModel):
    """A segment's translation put back into the source language: the text, the model and the tokens spent."""
    text: str = Field(..., description="Back-translated text; never empty")
    model: str = Field(..., min_length=1, description="Model that answered")
    usage: Usage = Field(default_factory=Usage, description="Tokens the call spent")


async def back_translate(client: LLMClient, translation: str, source_lang: str, target_lang: str) -> BackTranslation:
    """
    Translate one segment's translation back into the source language: one call on the `translate` tier.

    Args:
        client (LLMClient): Client for the configured endpoint.
        translation (str): The translated segment.
        source_lang (str): Language of the original text; the back-translation is in it.
        target_lang (str): Language of the translation.

    Returns:
        BackTranslation: The back-translated text, the model and the tokens spent.

    Raises:
        TranslationError: If the call fails, or the answer is empty (500).
    """
    prompt = f"Translate the following text from {target_lang} back to {source_lang}: \"{translation}\""
    answer = await client.complete(
        [
            {"role": "system", "content": BACK_TRANSLATE_SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        tier="translate",
        temperature=TEMPERATURE
    )
    text = strip_outer_quotes(answer.content)
    if not text.strip():
        logger.error(f"Model returned an empty back-translation: {answer.content[:500]!r}")
        raise TranslationError(
            message="The model returned an empty back-translation.",
            error_type=ErrorType.API_ERROR,
            status_code=500
        )
    return BackTranslation(text=text, model=answer.model, usage=answer.usage)


async def back_translate_segments(
    client: LLMClient, translations: List[str], source_lang: str, target_lang: str
) -> List[BackTranslation]:
    """
    Back-translate every segment at once (the client caps how many run).

    Args:
        client (LLMClient): Client for the configured endpoint.
        translations (List[str]): The translated segments, in order.
        source_lang (str): Language of the original text.
        target_lang (str): Language of the translations.

    Returns:
        List[BackTranslation]: One per segment, in the same order.

    Raises:
        TranslationError: If any segment fails; then every failed segment is
            listed in `segment_errors` (numbered from 1), with the first one's status.
    """
    results = await asyncio.gather(
        *(back_translate(client, text, source_lang, target_lang) for text in translations), return_exceptions=True
    )
    for result in results:
        if isinstance(result, BaseException) and not isinstance(result, TranslationError):
            raise result
    failed = [(n, result) for n, result in enumerate(results, 1) if isinstance(result, TranslationError)]
    if failed:
        raise _segments_failed(failed, len(translations))
    return results


def _segments_failed(failed: List[Tuple[int, TranslationError]], total: int) -> TranslationError:
    """One error for every failed segment; it takes the first one's status."""
    listed = "; ".join(f"segment {n} of {total}: {error.message}" for n, error in failed)
    logger.error(f"{len(failed)} of {total} segments could not be back-translated: {listed}")
    first = failed[0][1]
    return TranslationError(
        message=f"{len(failed)} of {total} segments could not be back-translated ({listed})",
        error_type=first.error_type,
        status_code=first.status_code,
        segment_errors=[
            {"segment": n, "type": error.error_type.value, "message": error.message} for n, error in failed
        ],
    )
