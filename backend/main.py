"""
Main application entry point for llm-translate.
"""
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, StreamingResponse

from llm_translate import __version__
from llm_translate.api.models import (
    TranslationRequest, TranslationResponse, SpeakRequest, V1TranslationRequest, V1TranslationResponse,
    V1FileReport, V1FileTranslationResponse, V1_TRANSLATE_EXAMPLES,
)
from llm_translate.formats.limits import read_limited
from llm_translate.review import build_report, check_segments as review_segments
from llm_translate.services.document import split_document
from llm_translate.services.llm_translator import AUTO_DETECT, Translation
from llm_translate.services.file_translator import translate_file
from llm_translate.services.llm_translator import get_translation_service
from llm_translate.services.tts_client import get_tts_client
from llm_translate.utils.config import load_config
from llm_translate.utils.exceptions import ErrorType, TranslationError
from llm_translate.utils.logging import setup_logger


# Set up logger
logger = setup_logger("llm_translate.main")

# The API reference page and the vendored Scalar script it loads (see static/SOURCES.md).
STATIC_DIR = Path(__file__).parent / "static"

def _error_response(description: str, error_type: str, message: str) -> dict:
    """A documented `{"error": {...}}` response with one example body."""
    return {
        "description": description,
        "content": {"application/json": {"example": {
            "error": {"type": error_type, "message": message, "details": None}
        }}},
    }


_VALIDATION_ERROR = {"description": "The request body failed validation (FastAPI's `{\"detail\": [...]}` shape)."}

TRANSLATE_ERRORS = {
    400: _error_response(
        "The text is blank (`bad_request_error`), or the model endpoint rejected the request.",
        "bad_request_error", "There is no text to translate."),
    401: _error_response(
        "The model endpoint refused the API key, or needs one and none is set "
        "(its 403 is reported as 401 too).",
        "authentication_error", "Authentication failed with the model endpoint. Please check your API key."),
    413: _error_response(
        "The text is too long for whole-document mode: it needs more than `LLM_MAX_SEGMENTS` segments, "
        "or has a line longer than `LLM_SEGMENT_MAX_CHARS`. No model is called.",
        "payload_too_large_error",
        "The document splits into 3 segments, more than LLM_MAX_SEGMENTS (2) allows."),
    422: _VALIDATION_ERROR,
    429: _error_response(
        "The model endpoint's rate limit was hit.",
        "rate_limit_error", "Model endpoint rate limit exceeded. Please try again later."),
    500: _error_response(
        "Translation failed: an unexpected error, a missing dependency, or an empty model answer "
        "(`unknown_error`, `service_unavailable_error`, `api_error`); any other upstream error status is reported as 500. "
        "When segments of a long document fail, the error takes the first failed segment's status and type, "
        "and `segment_errors` lists every failed segment (`segment`, `type`, `message`); no partial text is returned.",
        "unknown_error", "An unexpected error occurred during translation"),
}

_BROKEN_PLACEHOLDER = (
    "Segment /greeting: the translation did not keep its placeholders (missing {name}; unexpected {nombre})."
)

TRANSLATE_FILE_ERRORS = {
    400: _error_response(
        "The file is unsupported (its extension is not .json, .yaml, .yml, .po, .md, .markdown, .html, .htm "
        "or .srt), empty, not UTF-8 text, or malformed for its format (`bad_request_error`, "
        "`invalid_request_error`), or the model endpoint rejected the request.",
        "bad_request_error",
        "Unsupported file format; the file extension must be one of "
        ".htm, .html, .json, .markdown, .md, .po, .srt, .yaml, .yml."),
    401: TRANSLATE_ERRORS[401],
    413: _error_response(
        "The file is larger than `LLM_MAX_FILE_BYTES` (reading stops there), has more than `LLM_MAX_SEGMENTS` "
        "segments, or has a segment longer than `LLM_SEGMENT_MAX_CHARS`. No model is called.",
        "payload_too_large_error", "The file is larger than LLM_MAX_FILE_BYTES (10 bytes) allows."),
    422: _VALIDATION_ERROR,
    429: TRANSLATE_ERRORS[429],
    500: {
        "description": "Translation failed. When any segment fails (a placeholder or tag the translation lost or "
                       "changed, or a model error), the whole file fails: the error takes the first failed "
                       "segment's status and type, `segment_errors` lists every failed segment (`segment`, from 1, "
                       "`type`, `message`, which names the key for JSON, YAML and PO), and no file is returned. "
                       "Otherwise as for `/v1/translate`.",
        "content": {"application/json": {"example": {"error": {
            "type": "api_error",
            "message": f"1 of 1 segments failed, so the file was not translated (segment 1 of 1: {_BROKEN_PLACEHOLDER})",
            "details": None,
            "segment_errors": [{"segment": 1, "type": "api_error", "message": _BROKEN_PLACEHOLDER}],
        }}}},
    },
}

SPEAK_ERRORS = {
    400: _error_response(
        "The speech endpoint rejected the request (text, voice or format).",
        "bad_request_error", "Invalid request to the TTS endpoint. Please check your parameters."),
    401: _error_response(
        "The speech endpoint refused the API key (an upstream 403 is reported as 403).",
        "authentication_error", "Authentication failed with the TTS endpoint. Please check your API key."),
    422: _VALIDATION_ERROR,
    429: _error_response(
        "The speech endpoint's rate limit was hit.",
        "rate_limit_error", "TTS endpoint rate limit exceeded. Please try again later."),
    500: _error_response(
        "Speech failed: the TTS configuration is invalid (`configuration_error`), the endpoint failed "
        "(`api_error`), or an unexpected error occurred (`unknown_error`).",
        "unknown_error", "An unexpected error occurred during speech generation."),
}


# Create FastAPI application
app = FastAPI(
    title="LLM Translate API",
    description="A simple REST-based language translation application using LLMs",
    version=__version__,
    docs_url=None,
    redoc_url=None,
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


async def _review_text(translator, text: str, to_lang: str, result: Translation):
    """
    Run the review pass on a translated text's segments.

    Returns the text with each segment's best translation, and the report. A text
    with no translated segments (same language) is not reviewed.
    """
    if not result.pairs:
        return result.text, build_report([], [], [], result.model, result.usage)
    sources = [source for source, _ in result.pairs]
    checked = await review_segments(
        translator.client, sources, [translated for _, translated in result.pairs], result.source_lang, to_lang,
    )
    best = [segment.translation for segment in checked]
    if len(best) == 1:
        text_out = best[0]
    else:
        settings = translator.client.settings
        text_out = split_document(text, settings.segment_max_chars, settings.max_segments).join(best)
    report = build_report(checked, list(range(1, len(checked) + 1)), sources, result.model, result.usage)
    return text_out, report


@app.post(
    "/v1/translate",
    response_model=V1TranslationResponse,
    tags=["v1"],
    summary="Translate text",
    responses={
        200: {"content": {"application/json": {"examples": {
            name: {"summary": example["summary"], "value": example["response"]}
            for name, example in V1_TRANSLATE_EXAMPLES.items()
        }}}},
        **TRANSLATE_ERRORS,
    },
)
async def translate_text_v1(
    request: Annotated[V1TranslationRequest, Body(openapi_examples={
        name: {"summary": example["summary"], "value": example["request"]}
        for name, example in V1_TRANSLATE_EXAMPLES.items()
    })],
):
    """
    Translate text and report the model that answered and the tokens spent.

    `from_lang` may be "Auto-detect"; the detection call counts in `usage` and
    the language it found is reported in `detected_lang` (absent for a named
    `from_lang`). When a named `from_lang` equals `to_lang` no model is called:
    the text comes back unchanged, `model` is null and `usage` is zero. When
    auto-detect finds the target language the text also comes back unchanged,
    but `model` and `usage` report the detection call and `detected_lang` still
    names the language.

    A `glossary` entry applies when its source term occurs in the text
    (case-insensitive substring). The prompt asks for its target term, or for
    the term unchanged when `do_not_translate` is set. Any applicable term the
    output lacks is listed in `glossary_misses`; a miss is never an error.

    A `style_guide` (`tone`, `formality`, `audience`, `notes`, all optional) is
    stated in the prompt ahead of the glossary; blank fields are left out.

    `review` is `off` by default. `on` checks every segment on the `review` tier:
    a back-translation, a scored review and, for a major or critical error, one
    revision that is checked again. The reply then has a `review` report: `flags`
    (segment number, reason, severity, source and translation), and `steps` (model and tokens per step); tokens are
    the only cost, there is no money figure, and `usage` includes them. A flagged
    segment keeps its best translation and never fails the request. Review is advice
    for a human, not a gate.

    Text longer than `LLM_SEGMENT_MAX_CHARS` is translated as a whole document:
    it is split at paragraph (else line) boundaries, one extra call summarizes
    it, and each segment is translated with the summary and its neighbouring
    segments, then the segments are joined. More than `LLM_MAX_SEGMENTS`
    segments, or a line longer than the segment limit, is a 413. If any segment
    fails, the request fails and `segment_errors` lists each failed segment.

    Raises:
        TranslationError: If translation fails; the body is `{"error": {...}}`.
    """
    logger.info(f"v1 translation request received: {request.from_lang} → {request.to_lang}")
    with _translation_errors():
        translator = get_translation_service()
        result = await translator.translate_structured(
            text=request.text,
            from_lang=request.from_lang,
            to_lang=request.to_lang,
            glossary=request.glossary,
            style_guide=request.style_guide
        )
        text_out, usage, report = result.text, result.usage, None
        if request.review == "on":
            text_out, report = await _review_text(translator, request.text, request.to_lang, result)
            usage = report.usage
    logger.info(f"v1 translation completed: model={result.model}, tokens={usage.total_tokens}")
    return V1TranslationResponse(
        translation=text_out,
        from_lang=request.from_lang,
        detected_lang=result.source_lang if request.from_lang.strip().lower() == AUTO_DETECT else None,
        to_lang=request.to_lang,
        model=result.model,
        usage=usage,
        glossary_misses=result.glossary_misses,
        cached=result.cached,
        review=report
    )


@app.post(
    "/v1/translate/file",
    response_model=V1FileTranslationResponse,
    tags=["v1"],
    summary="Translate a file",
    responses=TRANSLATE_FILE_ERRORS,
)
async def translate_file_v1(
    file: Annotated[UploadFile, File(description="JSON, YAML, PO, Markdown, HTML or SRT; the extension names the format")],
    from_lang: Annotated[str, Form(description="Source language, or Auto-detect", examples=["English"])],
    to_lang: Annotated[str, Form(description="Target language", examples=["Spanish"])],
    review: Annotated[Literal["off", "on"], Form(
        description="`on` runs the review pass on every segment and adds flags, models and tokens per step to the report"
    )] = "off",
):
    """
    Translate an uploaded file and return it with the same structure, plus a report.

    JSON, YAML and PO translate values only (keys, order, comments and plural
    forms stay); Markdown and HTML translate text nodes only (code, links, tags
    and attributes stay); SRT keeps cue numbers and timings and re-wraps a cue
    longer than `LLM_SRT_MAX_LINE_CHARS`. Placeholders (`{name}`, `%s`, ICU
    plurals, tags) are masked before the model and checked after.

    The file is read up to `LLM_MAX_FILE_BYTES`; its segments are held to
    `LLM_SEGMENT_MAX_CHARS` and `LLM_MAX_SEGMENTS`. If any segment fails, the
    request fails, `segment_errors` lists each failed segment and no file is
    returned. The file name is never echoed.

    Each segment is translated in its own call. A file of more than one
    segment is summarized first (key terms and names, one extra call counted
    in `report.usage`), and each segment is sent with the summary and the two
    segments on either side as context, so names and terms stay consistent.

    `review` is `off` by default. `on` checks every translated segment as for
    `/v1/translate`; `report.review` lists `flags` (segment key or number,
    reason, severity, source and translation) and the model and tokens per step, and `report.usage` includes them.

    Raises:
        TranslationError: If translation fails; the body is `{"error": {...}}`.
    """
    logger.info(f"v1 file translation request received: {from_lang} → {to_lang}")
    with _translation_errors():
        translator = get_translation_service()
        content = await read_limited(file.read, translator.client.settings.max_file_bytes)
        result = await translate_file(
            translator, file.filename or "", content, from_lang, to_lang, review=review == "on"
        )
    logger.info(
        f"v1 file translation completed: format={result.file_format}, segments={result.segments}, "
        f"model={result.model}, tokens={result.usage.total_tokens}"
    )
    return V1FileTranslationResponse(
        content=result.content,
        format=result.file_format,
        from_lang=from_lang,
        to_lang=to_lang,
        report=V1FileReport(
            segments=result.segments, model=result.model, usage=result.usage, review=result.review
        ),
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
        speaker = get_tts_client()
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


@app.post(
    "/v1/speak",
    tags=["v1"],
    summary="Convert text to speech",
    response_class=StreamingResponse,
    responses={
        200: {
            "description": "Audio in the requested `response_format` (default mp3).",
            "content": {
                "audio/mpeg": {"schema": {"type": "string", "format": "binary"}},
                "audio/wav": {"schema": {"type": "string", "format": "binary"}},
            },
        },
        **SPEAK_ERRORS,
    },
)
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


# The reference is a page, not an endpoint: both routes stay out of the schema, and
# /openapi.json is unchanged. The page names the spec and the script by relative URL
# and derives the server prefix from its own path, so it works at /docs on port 8000
# and at /api/docs behind Traefik, which strips /api before the backend sees it.
@app.get("/docs", include_in_schema=False)
def api_reference() -> HTMLResponse:
    return HTMLResponse((STATIC_DIR / "docs.html").read_text(encoding="utf-8"))


@app.get("/docs/scalar.js", include_in_schema=False)
def scalar_script() -> FileResponse:
    return FileResponse(STATIC_DIR / "scalar.js", media_type="text/javascript")
