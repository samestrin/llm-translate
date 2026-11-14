"""
API models for request and response validation.
"""
from pydantic import BaseModel, ConfigDict, Field, model_serializer
from typing import List, Literal, Optional

from llm_translate.review import ReviewReport
from llm_translate.services.glossary import GlossaryEntry, GlossaryMiss
from llm_translate.services.style_guide import StyleGuide
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


class V1TranslationRequest(TranslationRequest):
    """
    Model for a `/v1/translate` request: a translation request with an optional glossary and style guide.
    """
    glossary: List[GlossaryEntry] = Field(
        default_factory=list,
        description="Terms to enforce; an entry applies only when its source term occurs in the text "
                    "(case-insensitive substring)",
    )
    style_guide: Optional[StyleGuide] = Field(
        None, description="Tone, formality, audience and free notes passed to the prompt"
    )
    review: Literal["off", "on"] = Field(
        "off",
        description="`on` runs the review pass on every segment: back-translation, a scored review and at most one "
                    "revision. It adds model calls and tokens; the report lists flags, models and tokens per step",
    )


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
            "glossary_misses": [],
            "cached": False,
        }
    })

    translation: str = Field(..., description="Translated text; never empty")
    from_lang: str = Field(..., description="Source language as requested, e.g. English or Auto-detect")
    detected_lang: Optional[str] = Field(
        None,
        description="The language the backend detected; present only when `from_lang` was Auto-detect, "
                    "including when the detected language is the target and the text came back unchanged",
    )
    to_lang: str = Field(..., description="Target language as requested")
    model: Optional[str] = Field(..., description="Model that answered; null when no model was called (same language)")
    usage: Usage = Field(..., description="Tokens spent, summed over every call (auto-detect included)")
    glossary_misses: List[GlossaryMiss] = Field(
        default_factory=list,
        description="Glossary terms in the text whose expected translation (or, for do-not-translate "
                    "terms, the unchanged term) the output lacks; a miss is reported, never an error",
    )
    cached: bool = Field(
        False, description="True when the answer came from the cache (`LLM_CACHE_SIZE`) and no model was called"
    )
    review: Optional[ReviewReport] = Field(
        None, description="Flags, models and tokens per step; present only when `review` is `on`"
    )

    @model_serializer(mode="wrap")
    def _omit_optional_reports(self, handler):
        data = handler(self)
        if data.get("review") is None:
            data.pop("review", None)
        if data.get("detected_lang") is None:
            data.pop("detected_lang", None)
        return data


# Named `/v1/translate` examples for the docs page: each request and the response it gets.
# The READMEs show the glossary one, and a test runs them all.
V1_TRANSLATE_EXAMPLES = {
    "plain": {
        "summary": "Plain translation",
        "request": {"text": "Hello, world!", "from_lang": "English", "to_lang": "Spanish"},
        "response": V1TranslationResponse.model_config["json_schema_extra"]["example"],
    },
    "auto_detect": {
        "summary": "Auto-detect, reporting the detected language",
        "request": {"text": "Hello, world!", "from_lang": "Auto-detect", "to_lang": "Spanish"},
        "response": {
            "translation": "¡Hola, mundo!",
            "from_lang": "Auto-detect",
            "detected_lang": "English",
            "to_lang": "Spanish",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 42, "completion_tokens": 6, "total_tokens": 48},
            "glossary_misses": [],
            "cached": False,
        },
    },
    "glossary_and_style_guide": {
        "summary": "Glossary and style guide, with a reported miss",
        "request": {
            "text": "Open the Dashboard in LLM Translate to see your history.",
            "from_lang": "English",
            "to_lang": "Spanish",
            "glossary": [
                {"source_term": "Dashboard", "target_term": "Panel", "note": "the home screen"},
                {"source_term": "LLM Translate", "do_not_translate": True},
            ],
            "style_guide": {
                "tone": "friendly",
                "formality": "informal",
                "audience": "first-time users",
                "notes": "Address the reader as tú.",
            },
        },
        "response": {
            "translation": "Abre el tablero de LLM Translate para ver tu historial.",
            "from_lang": "English",
            "to_lang": "Spanish",
            "model": "gpt-4o-mini",
            "usage": {"prompt_tokens": 118, "completion_tokens": 14, "total_tokens": 132},
            "glossary_misses": [{"term": "Dashboard", "expected": "Panel"}],
            "cached": False,
        },
    },
}


class V1FileReport(BaseModel):
    """
    What a `/v1/translate/file` translation did.
    """
    model_config = ConfigDict(protected_namespaces=())

    segments: int = Field(..., description="Segments in the file (values, text nodes or cues)")
    model: Optional[str] = Field(..., description="Model that answered; null when no model was called")
    usage: Usage = Field(..., description="Tokens spent, summed over every call (auto-detect and review included)")
    review: Optional[ReviewReport] = Field(
        None, description="Flags, models and tokens per step; present only when `review` is `on`"
    )

    @model_serializer(mode="wrap")
    def _omit_review_when_off(self, handler):
        data = handler(self)
        if data.get("review") is None:
            data.pop("review", None)
        return data


class V1FileTranslationResponse(BaseModel):
    """
    Model for a `/v1/translate/file` response: the translated file and its report.
    """
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "content": "{\n  \"greeting\": \"Hola {name}, tienes %d mensajes\",\n  \"farewell\": \"Adiós\"\n}\n",
            "format": "json",
            "from_lang": "English",
            "to_lang": "Spanish",
            "report": {
                "segments": 2,
                "model": "gpt-4o-mini",
                "usage": {"prompt_tokens": 84, "completion_tokens": 12, "total_tokens": 96},
            },
        }
    })

    content: str = Field(..., description="The translated file, with the structure, keys and placeholders of the upload")
    format: str = Field(..., description="Format read from the file extension: json, yaml, po, markdown, html or srt")
    from_lang: str = Field(..., description="Source language as requested, e.g. English or Auto-detect")
    to_lang: str = Field(..., description="Target language as requested")
    report: V1FileReport = Field(..., description="Segments, model and tokens spent")


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
    response_format: str = Field("mp3", description="Desired audio format, e.g., mp3, wav (default mp3)")
    instructions: Optional[str] = Field(None, description="Provider-specific instructions, e.g., speaking style")