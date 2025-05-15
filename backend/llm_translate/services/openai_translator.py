"""
OpenAI translator implementation.
"""
from openai import AsyncOpenAI
from openai import APIError, APIConnectionError, RateLimitError, AuthenticationError, BadRequestError
from .base_translator import BaseTranslator
from llm_translate.utils.exceptions import TranslationError, ErrorType


class OpenAITranslator(BaseTranslator):
    """
    Translator implementation using OpenAI's API.
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4.1-mini-2025-04-14"):
        """
        Initialize the OpenAI translator.
        
        Args:
            api_key (str): OpenAI API key.
            model (str, optional): OpenAI model to use. Defaults to "gpt-4.1-mini-2025-04-14".
        """
        super().__init__(api_key=api_key, model=model)
        self.client = AsyncOpenAI(api_key=self.api_key)
        
    async def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        """
        Translate text from source language to target language using OpenAI.
        
        Args:
            text (str): Text to translate.
            from_lang (str): Source language or "Auto-detect" to automatically detect the language.
            to_lang (str): Target language.
            
        Returns:
            str: Translated text.
            
        Raises:
            TranslationError: If translation fails, with appropriate error type and status code.
        """
        try:
            # Check if we need to auto-detect the language
            if from_lang.lower() == "auto-detect":
                self.logger.debug("Auto-detecting source language")
                detected_lang = await self._detect_language(text)
                self.logger.info(f"Detected language: {detected_lang}")
                from_lang = detected_lang

            # Short-circuit if languages are the same (case-insensitive)
            if from_lang.strip().lower() == to_lang.strip().lower():
                self.logger.info("Source and target languages are the same; returning original text.")
                return text

            # Create a clear prompt for translation
            prompt = f"Translate the following text from {from_lang} to {to_lang}: \"{text}\""
            self.logger.debug(f"Sending translation request to OpenAI: {from_lang} → {to_lang}")
            
            # System prompt to guide the model
            system_prompt = "You are an expert translator. Translate the given text accurately and naturally. Preserve the meaning, tone, and style of the original text. Only return the translated text without any additional explanations or notes."
            
            # Make API call
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3  # Lower temperature for more deterministic translation
            )
            
            # Extract and return the translated text
            translated_text = response.choices[0].message.content.strip()
            
            # Remove outermost quotes if present
            if (translated_text.startswith("'") and translated_text.endswith("'")) or \
               (translated_text.startswith('"') and translated_text.endswith('"')):
                translated_text = translated_text[1:-1]

            self.logger.debug(f"Received translation response from OpenAI (length: {len(translated_text)})")
            return translated_text
            
        except AuthenticationError as e:
            # Handle authentication errors (invalid API key)
            self.logger.error(f"OpenAI authentication error: {str(e)}")
            raise TranslationError(
                message="Authentication failed with OpenAI API. Please check your API key.",
                error_type=ErrorType.AUTHENTICATION,
                status_code=401,
                original_exception=e
            ) from e
        except RateLimitError as e:
            # Handle rate limit errors
            self.logger.error(f"OpenAI rate limit error: {str(e)}")
            raise TranslationError(
                message="OpenAI API rate limit exceeded. Please try again later.",
                error_type=ErrorType.RATE_LIMIT,
                status_code=429,
                original_exception=e
            ) from e
        except BadRequestError as e:
            # Handle bad request errors (invalid parameters)
            self.logger.error(f"OpenAI bad request error: {str(e)}")
            raise TranslationError(
                message="Invalid request to OpenAI API. Please check your parameters.",
                error_type=ErrorType.BAD_REQUEST,
                status_code=400,
                original_exception=e
            ) from e
        except APIConnectionError as e:
            # Handle connection errors
            self.logger.error(f"OpenAI connection error: {str(e)}")
            raise TranslationError(
                message="Failed to connect to OpenAI API. Please check your internet connection.",
                error_type=ErrorType.CONNECTION,
                status_code=503,
                original_exception=e
            ) from e
        except APIError as e:
            # Handle API errors
            self.logger.error(f"OpenAI API error: {str(e)}")
            raise TranslationError(
                message="OpenAI API error occurred. Please try again later.",
                error_type=ErrorType.API_ERROR,
                status_code=500,
                original_exception=e
            ) from e
        except Exception as e:
            # Handle unexpected errors
            self.logger.error(f"Unexpected error during OpenAI translation: {str(e)}", exc_info=True)
            raise TranslationError(
                message=f"An unexpected error occurred during translation: {str(e)}",
                error_type=ErrorType.UNKNOWN,
                status_code=500,
                original_exception=e
            ) from e
    
    async def _detect_language(self, text: str) -> str:
        """
        Detect the language of the given text using OpenAI.
        
        Args:
            text (str): Text to detect language for.
            
        Returns:
            str: Detected language name.
            
        Raises:
            TranslationError: If language detection fails.
        """
        try:
            # Create a prompt for language detection
            prompt = f"Identify the language of the following text. Respond with only the language name in English (e.g., 'English', 'Spanish', 'French', etc.). Do not include any additional text or explanations.\n\nText: \"{text}\""
            
            # System prompt to guide the model
            system_prompt = "You are a language identification expert. Your task is to identify the language of the given text. Respond with only the language name in English."
            
            # Make API call
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1  # Very low temperature for deterministic response
            )
            
            # Extract and return the detected language
            detected_lang = response.choices[0].message.content.strip()
            return detected_lang
            
        except Exception as e:
            self.logger.error(f"Error during language detection: {str(e)}", exc_info=True)
            raise TranslationError(
                message=f"Failed to detect language: {str(e)}",
                error_type=ErrorType.UNKNOWN,
                status_code=500,
                original_exception=e
            ) from e