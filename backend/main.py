"""
Main application entry point for llm-translate.
"""
from contextlib import contextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from llm_translate.api.models import TranslationRequest, TranslationResponse, SpeakRequest, V1TranslationResponse
from llm_translate.core.service_selector import get_translation_service, get_speaker_service
from llm_translate.utils.config import load_config
from llm_translate.utils.exceptions import ErrorType, TranslationError
from llm_translate.utils.logging import setup_logger


# Set up logger
logger = setup_logger("llm_translate.main")

# Create FastAPI application
app = FastAPI(
    title="LLM Translate API",
    description="A simple REST-based language translation application using LLMs",
    version="0.1.0"
)

# Load configuration once at startup
app_config = load_config()
logger.info(f"Application started with AI_SOURCE: {app_config.get('AI_SOURCE', 'unknown')}")
logger.info(f"Application started with TTS_SOURCE: {app_config.get('TTS_SOURCE', 'unknown')}")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handler for TranslationError
@app.exception_handler(TranslationError)
async def translation_error_handler(request: Request, exc: TranslationError):
    logger.error(f"Translation error: {exc.message} (Type: {exc.error_type}, Status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict()
    )

@contextmanager
def _translation_errors():
    """
    Report any failure while translating as a `TranslationError`.

    A configuration error (ValueError) is a 400, a missing dependency a 500,
    and anything unexpected a 500 that hides its details.
    """
    try:
        yield
    except TranslationError:
        raise
    except ValueError as e:
        # For unsupported provider
        logger.error(f"Unsupported provider error: {str(e)}")
        raise TranslationError(
            message=str(e),
            error_type=ErrorType.INVALID_REQUEST,
            status_code=400,
            original_exception=e
        )
    except ImportError as e:
        # For missing dependencies
        logger.error(f"Missing dependency error: {str(e)}")
        raise TranslationError(
            message=f"Missing dependency: {str(e)}",
            error_type=ErrorType.SERVICE_UNAVAILABLE,
            status_code=500,
            original_exception=e
        )
    except Exception as e:
        # For unexpected errors
        logger.error(f"Unexpected error during translation: {str(e)}", exc_info=True)
        raise TranslationError(
            message="An unexpected error occurred during translation",
            error_type=ErrorType.UNKNOWN,
            status_code=500
        ) from e  # logged above; kept out of the response body


@app.post("/v1/translate", response_model=V1TranslationResponse)
async def translate_text_v1(request: TranslationRequest):
    """
    Translate text and report the model that answered and the tokens spent.

    `from_lang` may be "Auto-detect"; the detection call counts in `usage`.
    When a named `from_lang` equals `to_lang` no model is called: the text comes
    back unchanged, `model` is null and `usage` is zero. When auto-detect finds
    the target language the text also comes back unchanged, but `model` and
    `usage` report the detection call.

    Raises:
        TranslationError: If translation fails; the body is `{"error": {...}}`.
    """
    logger.info(f"v1 translation request received: {request.from_lang} → {request.to_lang}")
    with _translation_errors():
        translator = get_translation_service()
        result = await translator.translate_structured(
            text=request.text,
            from_lang=request.from_lang,
            to_lang=request.to_lang
        )
    logger.info(f"v1 translation completed: model={result.model}, tokens={result.usage.total_tokens}")
    return V1TranslationResponse(
        translation=result.text,
        from_lang=request.from_lang,
        to_lang=request.to_lang,
        model=result.model,
        usage=result.usage
    )


@app.post("/translate", response_model=TranslationResponse, deprecated=True)
async def translate_text(request: TranslationRequest):
    """
    Translate text from source language to target language.

    Deprecated: use `/v1/translate`. This alias keeps its original response shape.

    Args:
        request (TranslationRequest): Translation request containing text, source language, and target language.

    Returns:
        TranslationResponse: Translation response containing translated text and metadata.

    Raises:
        TranslationError: If translation fails.
    """
    logger.info(f"Translation request received: {request.from_lang} → {request.to_lang}")
    with _translation_errors():
        # Get translator service based on configuration
        translator = get_translation_service()
        logger.debug(f"Using translator service: {translator.__class__.__name__}")

        # Translate text
        translated_text = await translator.translate(
            text=request.text,
            from_lang=request.from_lang,
            to_lang=request.to_lang
        )

    # Return response
    logger.info(f"Translation completed successfully: {request.from_lang} → {request.to_lang}")
    return TranslationResponse(
        translated_text=translated_text,
        from_lang=request.from_lang,
        to_lang=request.to_lang,
        service_used=app_config.get("AI_SOURCE", "unknown"),
        model_used=translator.model or "unknown"
    )


async def _speak(request: SpeakRequest) -> StreamingResponse:
    """
    Convert text to speech using the configured TTS endpoint.

    Raises:
        TranslationError: If the configuration is invalid (500, `configuration_error`),
            the endpoint fails, or anything unexpected happens (500, details hidden).
    """
    logger.info(f"TTS request received: lang={request.lang}, voice={request.voice}, format={request.response_format}")
    try:
        # Get speaker service based on configuration
        speaker = get_speaker_service()
        logger.debug(f"Using speaker service: {speaker.__class__.__name__}")

        # Convert text to speech
        audio_bytes = await speaker.speak(
            text=request.text,
            lang=request.lang,
            voice=request.voice,
            response_format=request.response_format,
            instructions=request.instructions
        )
    except TranslationError as e:
        logger.error(f"TTS service error: {e.message}")
        raise
    except ValueError as e:
        # For unsupported provider or format
        logger.error(f"TTS configuration error: {str(e)}")
        raise TranslationError(
            message=str(e),
            error_type=ErrorType.CONFIGURATION_ERROR,
            status_code=500,
            original_exception=e
        )
    except Exception as e:
        # For unexpected errors
        logger.error(f"Unexpected error during speech generation: {str(e)}", exc_info=True)
        raise TranslationError(
            message="An unexpected error occurred during speech generation.",
            error_type=ErrorType.UNKNOWN,
            status_code=500
        ) from e  # logged above; kept out of the response body

    media_type = "audio/mpeg" if request.response_format == "mp3" else f"audio/{request.response_format}"
    logger.info(f"TTS completed successfully: {len(audio_bytes)} bytes, format={request.response_format}")
    return StreamingResponse(iter([audio_bytes]), media_type=media_type)


@app.post("/v1/speak")
async def speak_text_v1(request: SpeakRequest):
    """
    Convert text to speech using the configured TTS endpoint.

    Returns:
        StreamingResponse: Audio in `response_format` (default mp3).

    Raises:
        TranslationError: If text-to-speech fails; the body is `{"error": {...}}`.
    """
    return await _speak(request)


@app.post("/speak", deprecated=True)
async def speak_text(request: SpeakRequest):
    """
    Convert text to speech using the configured TTS provider.

    Deprecated: use `/v1/speak`. This alias keeps its original error body, `{"detail": "..."}`.

    Args:
        request (SpeakRequest): Speech request containing text, language, and optional voice/format parameters.

    Returns:
        StreamingResponse: Audio stream with the appropriate content type.

    Raises:
        HTTPException: If text-to-speech conversion fails.
    """
    try:
        return await _speak(request)
    except TranslationError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@app.get("/")
async def root():
    """
    Root endpoint for health checks.
    
    Returns:
        dict: Simple JSON response indicating the service is running.
    """
    return {"message": "llm-translate is running"}