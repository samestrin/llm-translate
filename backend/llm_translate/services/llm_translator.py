"""
Translator on the OpenAI-compatible client.
"""
from .base_translator import BaseTranslator
from .llm_client import LLMClient
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

        Args:
            text (str): Text to translate.
            from_lang (str): Source language or "Auto-detect" to automatically detect the language.
            to_lang (str): Target language.

        Returns:
            str: Translated text, or the original text when both languages are the same.

        Raises:
            TranslationError: If translation fails, with appropriate error type and status code.
        """
        if from_lang.strip().lower() == AUTO_DETECT:
            self.logger.debug("Auto-detecting source language")
            from_lang = await self._detect_language(text)
            self.logger.info(f"Detected language: {from_lang}")

        # Short-circuit if languages are the same (case-insensitive)
        if from_lang.strip().lower() == to_lang.strip().lower():
            self.logger.info("Source and target languages are the same; returning original text.")
            return text

        prompt = f"Translate the following text from {from_lang} to {to_lang}: \"{text}\""
        self.logger.debug(f"Sending translation request: {from_lang} → {to_lang}")
        answer = await self.client.chat(
            [
                {"role": "system", "content": TRANSLATE_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            tier="translate",
            temperature=0.3
        )
        return strip_outer_quotes(answer)

    async def _detect_language(self, text: str) -> str:
        """
        Detect the language of the given text.

        Raises:
            TranslationError: If detection fails or the model names no language.
        """
        prompt = f"Identify the language of the following text. Respond with only the language name in English (e.g., 'English', 'Spanish', 'French', etc.). Do not include any additional text or explanations.\n\nText: \"{text}\""
        answer = await self.client.chat(
            [
                {"role": "system", "content": DETECT_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            tier="translate",
            temperature=0.1
        )
        detected = answer.strip().strip("'\".").strip()
        if not detected:
            raise TranslationError(
                message="The model did not name the source language.",
                error_type=ErrorType.API_ERROR,
                status_code=500
            )
        return detected
