"""
Main application entry point for llm-translate.
"""
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from llm_translate.api.models import TranslationRequest, TranslationResponse
from llm_translate.core.service_selector import get_translation_service
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

@app.post("/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """
    Translate text from source language to target language.
    
    Args:
        request (TranslationRequest): Translation request containing text, source language, and target language.
        
    Returns:
        TranslationResponse: Translation response containing translated text and metadata.
        
    Raises:
        HTTPException: If translation fails.
    """
    logger.info(f"Translation request received: {request.from_lang} → {request.to_lang}")
    try:
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
        
        # Check if it's already a TranslationError and preserve its status code
        if isinstance(e, TranslationError):
            raise e
        else:
            raise TranslationError(
                message="An unexpected error occurred during translation",
                error_type=ErrorType.UNKNOWN,
                status_code=500,
                original_exception=e
            )


@app.get("/")
async def root():
    """
    Root endpoint for health checks.
    
    Returns:
        dict: Simple JSON response indicating the service is running.
    """
    return {"message": "llm-translate is running"}