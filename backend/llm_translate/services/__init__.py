"""
Services module for llm-translate.
Contains translator service implementations.
"""
from .base_translator import BaseTranslator
from .openai_translator import OpenAITranslator
from .groq_translator import GroqTranslator
from .openrouter_translator import OpenRouterTranslator
from .base_speaker import BaseSpeaker
from .openai_speaker import OpenAISpeaker
from .groq_speaker import GroqSpeaker

__all__ = [
    "BaseTranslator",
    "OpenAITranslator",
    "GroqTranslator",
    "OpenRouterTranslator",
    "BaseSpeaker",
    "OpenAISpeaker",
    "GroqSpeaker",
]