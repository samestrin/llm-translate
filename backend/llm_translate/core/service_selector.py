"""
Service selector module for selecting the appropriate translator service based on configuration.
"""
from typing import Dict, Any

from llm_translate.utils.config import load_config
from llm_translate.utils.logging import setup_logger
from llm_translate.services.base_translator import BaseTranslator
from llm_translate.services.base_speaker import BaseSpeaker
from llm_translate.services.llm_client import get_llm_client
from llm_translate.services.llm_translator import LLMTranslator
from llm_translate.services.openai_speaker import OpenAISpeaker
from llm_translate.services.groq_speaker import GroqSpeaker


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


def get_speaker_service() -> BaseSpeaker:
    """
    Get the appropriate TTS speaker service based on the configuration.

    Returns:
        BaseSpeaker: An instance of a speaker service.

    Raises:
        ValueError: If the configured TTS service provider is not supported.
        ImportError: If the required speaker module is not available.
    """
    config: Dict[str, Any] = load_config()
    tts_provider = config.get("TTS_SOURCE", "openai").lower()
    logger.info(f"Selecting TTS speaker service for provider: {tts_provider}")

    tts_model = config.get("TTS_MODEL") # Get the generic TTS_MODEL

    if tts_provider == "openai":
        openai_api_key = config.get("OPENAI_API_KEY")
        if not openai_api_key:
            logger.error("OpenAI API key not found in configuration for TTS.")
            raise ValueError("OPENAI_API_KEY is not configured.")
        # Use the generic TTS_MODEL, or a default if not set specifically for OpenAI
        openai_model = tts_model or "tts-1" # OpenAI's default model if TTS_MODEL is None
        logger.debug(f"Initializing OpenAISpeaker with model: {openai_model}")
        return OpenAISpeaker(
            api_key=openai_api_key,
            model=openai_model
        )
    elif tts_provider == "groq":
        groq_api_key = config.get("GROQ_API_KEY")
        if not groq_api_key:
            logger.error("Groq API key not found in configuration for TTS.")
            raise ValueError("GROQ_API_KEY is not configured.")
        # Use the generic TTS_MODEL, or a default if not set specifically for Groq
        groq_model = tts_model or "playai-tts" # A common Groq TTS model if TTS_MODEL is None
        logger.debug(f"Initializing GroqSpeaker with model: {groq_model}")
        return GroqSpeaker(
            api_key=groq_api_key,
            model=groq_model
        )
    else:
        logger.error(f"Unsupported TTS service provider: {tts_provider}")
        raise ValueError(f"Unsupported TTS service provider: {tts_provider}")


