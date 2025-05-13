"""
API models for request and response validation.
"""
from pydantic import BaseModel, Field


class TranslationRequest(BaseModel):
    """
    Model for translation request validation.
    """
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