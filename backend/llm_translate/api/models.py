"""
API models for request and response validation.
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional

from llm_translate.services.llm_client import Usage


class TranslationRequest(BaseModel):
    """
    Model for translation request validation.
    """
    model_config = ConfigDict(json_schema_extra={
        "example": {"text": "Hello, world!", "from_lang": "English", "to_lang": "Spanish"}
    })

    text: str = Field(..., description="Text to translate")
    from_lang: str = Field(..., description="Source language, e.g. English, Spanish, French, etc.")
    to_lang: str = Field(..., description="Target language, e.g. English, Spanish, French, etc.")


class TranslationResponse(BaseModel):
    """
    Model for translation response.
    """
    translated_text: str = Field(..., description="Translated text")
    from_lang: str = Field(..., description="Source language, e.g. English, Spanish, French, etc.")
    to_lang: str = Field(..., description="Target language, e.g. English, Spanish, French, etc.")
    service_used: str = Field(..., description="AI service provider used for translation")
    model_used: str = Field(..., description="Specific model used for translation")


class V1TranslationResponse(BaseModel):
    """
    Model for a `/v1/translate` response.
    """
    model_config = ConfigDict(protected_namespaces=(), json_schema_extra={
        "example": {
            "translation": "¡Hola, mundo!",
            "from_lang": "English",
            "to_lang": "Spanish",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 42, "completion_tokens": 6, "total_tokens": 48},
        }
    })

    translation: str = Field(..., description="Translated text; never empty")
    from_lang: str = Field(..., description="Source language as requested, e.g. English or Auto-detect")
    to_lang: str = Field(..., description="Target language as requested")
    model: Optional[str] = Field(..., description="Model that answered; null when no model was called (same language)")
    usage: Usage = Field(..., description="Tokens spent, summed over every call (auto-detect included)")


class SpeakRequest(BaseModel):
    """
    Model for speak request validation.
    """
    model_config = ConfigDict(json_schema_extra={
        "example": {"text": "Hola, mundo", "lang": "Spanish", "voice": "alloy", "response_format": "mp3"}
    })

    text: str = Field(..., description="Text to convert to speech")
    lang: str = Field(..., description="Language of the text, e.g. English, Spanish, French, etc.")
    voice: Optional[str] = Field(None, description="Provider-specific voice ID")
    response_format: Optional[str] = Field("mp3", description="Desired audio format, e.g., mp3, wav")
    instructions: Optional[str] = Field(None, description="Provider-specific instructions, e.g., speaking style")