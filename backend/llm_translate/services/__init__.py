"""
Services module for llm-translate.
Contains the OpenAI-compatible translation and text-to-speech clients.
"""
from .base_translator import BaseTranslator
from .llm_translator import LLMTranslator
from .tts_client import TTSClient

__all__ = [
    "BaseTranslator",
    "LLMTranslator",
    "TTSClient",
]
