"""
Service selector module for selecting the appropriate translator service based on configuration.
"""
from llm_translate.utils.logging import setup_logger
from llm_translate.services.base_translator import BaseTranslator
from llm_translate.services.tts_client import TTSClient, get_tts_client
from llm_translate.services.llm_client import get_llm_client
from llm_translate.services.llm_translator import LLMTranslator


# Set up logger
logger = setup_logger("llm_translate.service_selector")


def get_translation_service() -> BaseTranslator:
    """
    Get the translator for the configured OpenAI-compatible endpoint.

    `LLM_*` variables set the endpoint; the legacy `AI_SOURCE` vendor variables
    still work through the mapping in `llm_translate.utils.config`.

    Returns:
        BaseTranslator: A translator on the shared model client.

    Raises:
        ValueError: If the configuration is invalid (e.g. an unknown AI_SOURCE).
    """
    client = get_llm_client()
    settings = client.settings
    logger.info(
        f"Selecting translation service: {settings.provider} at {settings.base_url} "
        f"(translate model: {settings.translate_model})"
    )
    return LLMTranslator(client)


def get_speaker_service() -> TTSClient:
    """
    Get the text-to-speech client for the configured OpenAI-compatible endpoint.

    Raises:
        ValueError: If the TTS configuration is invalid (e.g. an unknown TTS_SOURCE).
    """
    client = get_tts_client()
    logger.info(f"Selecting TTS service at {client.settings.base_url} (model: {client.settings.model})")
    return client
