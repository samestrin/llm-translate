"""
Translator on the OpenAI-compatible client.
"""
import asyncio
from typing import List, Optional, Tuple

from pydantic import BaseModel, Field, ValidationError, field_validator

from .cache import TranslationCache, cache_key, get_translation_cache
from .base_translator import BaseTranslator
from .document import Document, split_document
from .style_guide import StyleGuide, style_guide_prompt
from .glossary import GlossaryEntry, GlossaryMiss, applicable, find_misses, glossary_prompt
from .llm_client import ChatResult, LLMClient, Usage, get_llm_client
from llm_translate.utils.exceptions import TranslationError, ErrorType

AUTO_DETECT = "auto-detect"
# Every call runs at 0 so the same input, settings and model give the same output.
TEMPERATURE = 0.0

TRANSLATE_SYSTEM_PROMPT = "You are an expert translator. Translate the given text accurately and naturally. Preserve the meaning, tone, and style of the original text. Only return the translated text without any additional explanations or notes."
DETECT_SYSTEM_PROMPT = "You are a language identification expert. Your task is to identify the language of the given text. Respond with only the language name in English."
SUMMARY_SYSTEM_PROMPT = "You summarize documents for a translator. Respond with only the summary."
SEGMENT_MARKER = "Translate only this segment of the document"


def strip_outer_quotes(text: str) -> str:
    """Strip surrounding whitespace, then one pair of matching outer quotes."""
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ("'", '"'):
        return text[1:-1]
    return text


class Translation(BaseModel):
    """
    A translation: the text, the model that answered, the tokens spent and
    the glossary terms the text missed.

    `model` is None when no model was called (the same-language shortcut).
    """
    text: str = Field(..., description="Translated text; never empty")
    model: Optional[str] = Field(None, min_length=1, description="Model that answered, if one was called")
    usage: Usage = Field(default_factory=Usage, description="Tokens spent, summed over every call")
    glossary_misses: List[GlossaryMiss] = Field(
        default_factory=list, description="Glossary terms in the source whose expected text the translation lacks"
    )

    cached: bool = Field(False, description="True when this result came from the cache and no model was called")
    source_lang: Optional[str] = Field(None, exclude=True, description="Source language, auto-detected if asked")
    pairs: List[Tuple[str, str]] = Field(
        default_factory=list, exclude=True, description="(source, translation) per segment, for the review pass"
    )

    @field_validator("text")
    @classmethod
    def _not_blank(cls, text: str) -> str:
        if not text.strip():
            raise ValueError("text must not be empty")
        return text


class LLMTranslator(BaseTranslator):
    """
    Translator using the `translate` tier of an `LLMClient`.
    """

    def __init__(self, client: LLMClient, cache: Optional[TranslationCache] = None):
        """
        Initialize the translator.

        Args:
            client (LLMClient): Client for the configured endpoint.
            cache (TranslationCache, optional): Cache of finished translations; None is off.
        """
        self.cache = cache
        super().__init__(api_key=client.settings.api_key, model=client.settings.translate_model)
        self.client = client

    async def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        """
        Translate text from source language to target language.

        Same arguments and errors as `translate_structured`.

        Returns:
            str: Translated text, or the original text when both languages are the same.
        """
        return (await self.translate_structured(text, from_lang, to_lang)).text

    async def translate_structured(
        self, text: str, from_lang: str, to_lang: str, glossary: Optional[List[GlossaryEntry]] = None,
        style_guide: Optional[StyleGuide] = None, context: Optional[List[str]] = None
    ) -> Translation:
        """
        Translate text and report the model, usage and glossary misses.

        Args:
            text (str): Text to translate.
            from_lang (str): Source language or "Auto-detect" to automatically detect the language.
            to_lang (str): Target language.
            glossary (List[GlossaryEntry], optional): Terms to enforce; only those found in
                the text reach the prompt and the check.
            style_guide (StyleGuide, optional): Tone, formality, audience and notes for the prompt.
            context (List[str], optional): Read-only blocks put ahead of the text to translate,
                such as a file's summary and neighbouring segments; each says it is context only.

        A text longer than `LLM_SEGMENT_MAX_CHARS` is translated as a document:
        split at paragraph (else line) boundaries, summarized in one extra call,
        and each segment translated with the summary and its neighbours, then joined.

        Returns:
            Translation: The text (the original when both languages are the same),
                the model, the tokens spent (auto-detect included) and the glossary
                terms the text missed. A miss is reported, never raised.

        Raises:
            TranslationError: If the text is blank (400), a document is over the segment
                limits (413), a call fails, or the model's answer is invalid or empty (500).
                An empty answer is never a translation. If any segment of a document fails,
                the error lists every failed segment in `segment_errors`.
        """
        if not text.strip():
            raise TranslationError(
                message="There is no text to translate.",
                error_type=ErrorType.BAD_REQUEST,
                status_code=400
            )

        glossary = glossary or []
        settings = self.client.settings
        key = None
        if self.cache is not None:
            key = cache_key(
                text=text, from_lang=from_lang, to_lang=to_lang,
                glossary=[entry.model_dump() for entry in glossary],
                style_guide=style_guide.model_dump() if style_guide else None, context=context or [],
                translate_model=settings.translate_model, review_model=settings.review_model,
                temperature=TEMPERATURE,
            )
            hit = self.cache.get(key)
            if hit is not None:
                self.logger.info("Translation served from the cache")
                return hit.model_copy(update={"cached": True, "usage": Usage()}, deep=True)
        document = split_document(text, settings.segment_max_chars, settings.max_segments)
        whole = len(document.segments) == 1
        model = None
        usage = Usage()
        if from_lang.strip().lower() == AUTO_DETECT:
            self.logger.debug("Auto-detecting source language")
            from_lang, model, usage = await self.detect_language(text if whole else document.segments[0])
            self.logger.info(f"Detected language: {from_lang}")

        # Short-circuit if languages are the same (case-insensitive)
        if from_lang.strip().lower() == to_lang.strip().lower():
            self.logger.info("Source and target languages are the same; returning original text.")
            return Translation(
                text=text, model=model, usage=usage, glossary_misses=find_misses(glossary, text, text),
                source_lang=from_lang,
            )

        if whole:
            prompt = f"Translate the following text from {from_lang} to {to_lang}: \"{text}\""
            self.logger.debug(f"Sending translation request: {from_lang} → {to_lang}")
            translation = await self._translate(
                self._with_context(prompt, text, glossary, style_guide, context), usage
            )
            translation.pairs = [(text, translation.text)]
        else:
            translation = await self._translate_document(
                text, document, from_lang, to_lang, glossary, style_guide, usage, context or []
            )
        translation.source_lang = from_lang
        translation.glossary_misses = find_misses(glossary, text, translation.text)
        if translation.glossary_misses:
            self.logger.info(f"Translation missed {len(translation.glossary_misses)} glossary term(s)")
        if key is not None:
            self.cache.put(key, translation.model_copy(deep=True))
        return translation

    @staticmethod
    def _with_context(
        prompt: str, text: str, glossary: List[GlossaryEntry], style_guide: Optional[StyleGuide],
        context: Optional[List[str]] = None
    ) -> str:
        """The prompt preceded by the style guide, the glossary terms in `text` and any context blocks."""
        blocks = [style_guide_prompt(style_guide), glossary_prompt(applicable(glossary, text)), *(context or [])]
        return "\n\n".join([*(block for block in blocks if block), prompt])

    async def _translate(self, prompt: str, usage: Usage) -> Translation:
        """
        Send one translation prompt on the `translate` tier.

        Raises:
            TranslationError: If the call fails or the answer is empty (500).
        """
        answer = await self.client.complete(
            [
                {"role": "system", "content": TRANSLATE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            tier="translate",
            temperature=TEMPERATURE
        )
        try:
            return Translation(text=strip_outer_quotes(answer.content), model=answer.model, usage=usage + answer.usage)
        except ValidationError as e:
            self.logger.error(f"Model returned an empty translation: {answer.content[:500]!r}")
            raise TranslationError(
                message="The model returned an empty translation.",
                error_type=ErrorType.API_ERROR,
                status_code=500,
                original_exception=e
            ) from e

    async def _translate_document(
        self, text: str, document: Document, from_lang: str, to_lang: str,
        glossary: List[GlossaryEntry], style_guide: Optional[StyleGuide], usage: Usage, extra: List[str]
    ) -> Translation:
        """
        Translate a document segment by segment and join the segments.

        One summary call comes first; then every segment is sent at once (the
        client caps how many run) with `extra`, the summary and its neighbours as context.

        Raises:
            TranslationError: If the summary fails, or any segment fails; then
                every failed segment is listed and no text is returned.
        """
        segments = document.segments
        self.logger.info(f"Translating a document of {len(segments)} segments: {from_lang} → {to_lang}")
        summary = await self.summarize(text, from_lang, to_lang)
        usage = usage + summary.usage

        def prompt(i: int) -> str:
            context = [*extra, f"Summary of the whole document (context only, do not translate it):\n{summary.content}"]
            if i > 0:
                context.append(f"Previous segment (context only, do not translate it):\n\"{segments[i - 1]}\"")
            if i + 1 < len(segments):
                context.append(f"Next segment (context only, do not translate it):\n\"{segments[i + 1]}\"")
            ask = (f"This is segment {i + 1} of {len(segments)}. "
                   f"{SEGMENT_MARKER} from {from_lang} to {to_lang}: \"{segments[i]}\"")
            return self._with_context(ask, segments[i], glossary, style_guide, context)

        results = await asyncio.gather(
            *(self._translate(prompt(i), Usage()) for i in range(len(segments))), return_exceptions=True
        )
        for result in results:
            if isinstance(result, BaseException) and not isinstance(result, TranslationError):
                raise result
        failed = [(i, result) for i, result in enumerate(results, 1) if isinstance(result, TranslationError)]
        if failed:
            raise self._segments_failed(failed, len(segments))

        for result in results:
            usage = usage + result.usage
        return Translation(
            text=document.join([result.text for result in results]), model=summary.model, usage=usage,
            pairs=[(source, result.text) for source, result in zip(segments, results)],
        )

    def _segments_failed(self, failed: List[Tuple[int, TranslationError]], total: int) -> TranslationError:
        """One error for the whole document that lists every failed segment; it takes the first one's status."""
        listed = "; ".join(f"segment {n} of {total}: {error.message}" for n, error in failed)
        self.logger.error(f"{len(failed)} of {total} document segments failed: {listed}")
        first = failed[0][1]
        return TranslationError(
            message=f"{len(failed)} of {total} segments failed, so the document was not translated ({listed})",
            error_type=first.error_type,
            status_code=first.status_code,
            segment_errors=[
                {"segment": n, "type": error.error_type.value, "message": error.message} for n, error in failed
            ],
        )

    async def summarize(self, text: str, from_lang: str, to_lang: str) -> ChatResult:
        """
        Summarize a document for its segments' prompts: one call on the `translate` tier.

        The summary lists the document's key terms and names with the translation to use for
        each, so segments translated apart from each other agree on them.

        Raises:
            TranslationError: If the call fails or the summary is empty (500).
        """
        prompt = (
            f"Summarize the following {from_lang} document in {to_lang} in at most five sentences: what it is "
            f"about, who it is for and its tone. Then list its key terms and the names it uses, each with "
            f"the {to_lang} translation to use for it throughout.\n\nDocument:\n\"{text}\""
        )
        answer = await self.client.complete(
            [
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            tier="translate",
            temperature=TEMPERATURE
        )
        if not answer.content.strip():
            raise TranslationError(
                message="The model returned an empty document summary.",
                error_type=ErrorType.API_ERROR,
                status_code=500
            )
        return ChatResult(content=answer.content.strip(), model=answer.model, usage=answer.usage)

    async def detect_language(self, text: str) -> Tuple[str, str, Usage]:
        """
        Detect the language of the given text.

        Returns:
            Tuple[str, str, Usage]: The language name, the model and the tokens spent.

        Raises:
            TranslationError: If detection fails or the model names no language.
        """
        prompt = f"Identify the language of the following text. Respond with only the language name in English (e.g., 'English', 'Spanish', 'French', etc.). Do not include any additional text or explanations.\n\nText: \"{text}\""
        answer = await self.client.complete(
            [
                {"role": "system", "content": DETECT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            tier="translate",
            temperature=TEMPERATURE
        )
        detected = answer.content.strip().strip("'\".").strip()
        if not detected:
            raise TranslationError(
                message="The model did not name the source language.",
                error_type=ErrorType.API_ERROR,
                status_code=500
            )
        return detected, answer.model, answer.usage


def get_translation_service() -> LLMTranslator:
    """
    Get the translator for the configured OpenAI-compatible endpoint.

    `LLM_*` variables set the endpoint; the legacy `AI_SOURCE` vendor variables
    still work through the mapping in `llm_translate.utils.config`.

    Raises:
        ValueError: If the configuration is invalid (e.g. an unknown AI_SOURCE).
    """
    client = get_llm_client()
    return LLMTranslator(client, cache=get_translation_cache(client.settings.cache_size))
