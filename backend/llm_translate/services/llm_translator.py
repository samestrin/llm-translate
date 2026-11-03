"""
Translator on the OpenAI-compatible client.
"""
from typing import Optional, Tuple

from pydantic import BaseModel, Field, ValidationError, field_validator

from .base_translator import BaseTranslator
from .llm_client import LLMClient, Usage, get_llm_client
from llm_translate.utils.exceptions import TranslationError, ErrorType

AUTO_DETECT = "auto-detect"

TRANSLATE_SYSTEM_PROMPT = "You are an expert translator. Translate the given text accurately and naturally. Preserve the meaning, tone, and style of the original text. Only return the translated text without any additional explanations or notes."
DETECT_SYSTEM_PROMPT = "You are a language identification expert. Your task is to identify the language of the given text. Respond with only the language name in English."


def strip_outer_quotes(text: str) -> str:
    """Strip surrounding whitespace, then one pair of matching outer quotes."""
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ("'", '"'):
        return text[1:-1]
    return text


class Translation(BaseModel):
    """
    A translation: the text, the model that answered and the tokens spent.

    `model` is None when no model was called (the same-language shortcut).
    """
    text: str = Field(..., description="Translated text; never empty")
    model: Optional[str] = Field(None, min_length=1, description="Model that answered, if one was called")
    usage: Usage = Field(default_factory=Usage, description="Tokens spent, summed over every call")

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

    def __init__(self, client: LLMClient):
        """
        Initialize the translator.

        Args:
            client (LLMClient): Client for the configured endpoint.
        """
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

    async def translate_structured(self, text: str, from_lang: str, to_lang: str) -> Translation:
        """
        Translate text and report the model and usage.

        Args:
            text (str): Text to translate.
            from_lang (str): Source language or "Auto-detect" to automatically detect the language.
            to_lang (str): Target language.

        Returns:
            Translation: The text (the original when both languages are the same),
                the model and the tokens spent, auto-detect included.

        Raises:
            TranslationError: If the text is blank (400), the call fails, or the model's
                answer is invalid or empty (500). An empty answer is never a translation.
        """
        if not text.strip():
            raise TranslationError(
                message="There is no text to translate.",
                error_type=ErrorType.BAD_REQUEST,
                status_code=400
            )

        model = None
        usage = Usage()
        if from_lang.strip().lower() == AUTO_DETECT:
            self.logger.debug("Auto-detecting source language")
            from_lang, model, usage = await self._detect_language(text)
            self.logger.info(f"Detected language: {from_lang}")

        # Short-circuit if languages are the same (case-insensitive)
        if from_lang.strip().lower() == to_lang.strip().lower():
            self.logger.info("Source and target languages are the same; returning original text.")
            return Translation(text=text, model=model, usage=usage)

        prompt = f"Translate the following text from {from_lang} to {to_lang}: \"{text}\""
        self.logger.debug(f"Sending translation request: {from_lang} → {to_lang}")
        answer = await self.client.complete(
            [
                {"role": "system", "content": TRANSLATE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            tier="translate",
            temperature=0.3
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

    async def _detect_language(self, text: str) -> Tuple[str, str, Usage]:
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
            temperature=0.1
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
    return LLMTranslator(get_llm_client())
