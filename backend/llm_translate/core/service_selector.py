"""
Service selector module for selecting the appropriate translator service based on configuration.
"""
from typing import Dict, Any

from llm_translate.utils.config import load_config
from llm_translate.utils.logging import setup_logger
from llm_translate.services.base_translator import BaseTranslator


# Set up logger
logger = setup_logger("llm_translate.service_selector")


def get_translation_service() -> BaseTranslator:
    """
    Get the appropriate translation service based on the configuration.
    
    Returns:
        BaseTranslator: An instance of a translator service.
        
    Raises:
        ValueError: If the configured AI service provider is not supported.
        ImportError: If the required translator module is not available.
    """
    config: Dict[str, Any] = load_config()
    provider = config.get("AI_SOURCE", "openai").lower()
    logger.info(f"Selecting translation service for provider: {provider}")
    
    if provider == "openai":
        try:
            from llm_translate.services.openai_translator import OpenAITranslator
            logger.debug(f"Initializing OpenAI translator with model: {config.get('OPENAI_MODEL', 'gpt-4.1-mini-2025-04-14')}")
            return OpenAITranslator(
                api_key=config.get("OPENAI_API_KEY"),
                model=config.get("OPENAI_MODEL", "gpt-4.1-mini-2025-04-14")
            )
        except ImportError:
            logger.error("OpenAI translator module not found")
            raise ImportError("OpenAI translator module not found. Please install the openai package.")
    
    elif provider == "groq":
        try:
            from llm_translate.services.groq_translator import GroqTranslator
            logger.debug(f"Initializing Groq translator with model: {config.get('GROQ_MODEL', 'meta-llama/llama-4-maverick-17b-128e-instruct')}")
            return GroqTranslator(
                api_key=config.get("GROQ_API_KEY"),
                model=config.get("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
            )
        except ImportError:
            logger.error("Groq translator module not found")
            raise ImportError("Groq translator module not found. Please install the groq package.")
    
    elif provider == "openrouter":
        try:
            from llm_translate.services.openrouter_translator import OpenRouterTranslator
            logger.debug(f"Initializing OpenRouter translator with model: {config.get('OPENROUTER_MODEL', 'qwen/qwen3-4b:free')}")
            return OpenRouterTranslator(
                api_key=config.get("OPENROUTER_API_KEY"),
                model=config.get("OPENROUTER_MODEL", "qwen/qwen3-4b:free")
            )
        except ImportError:
            logger.error("OpenRouter translator module not found")
            raise ImportError("OpenRouter translator module not found. Please install the httpx package.")
    
    else:
        logger.error(f"Unsupported AI service provider: {provider}")
        raise ValueError(f"Unsupported AI service provider: {provider}")


