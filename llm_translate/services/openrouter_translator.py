"""
OpenRouter translator implementation.
"""
import httpx
import os
from .base_translator import BaseTranslator
from llm_translate.utils.config import load_config
from llm_translate.utils.exceptions import TranslationError, ErrorType


class OpenRouterTranslator(BaseTranslator):
    """
    Translator implementation using OpenRouter's API.
    """
    
    API_URL = "https://openrouter.ai/api/v1/chat/completions"
    
    def __init__(self, api_key: str, model: str = "qwen/qwen3-4b:free"):
        """
        Initialize the OpenRouter translator.
        
        Args:
            api_key (str): OpenRouter API key.
            model (str, optional): OpenRouter model to use. Defaults to "qwen/qwen3-4b:free".
        """
        super().__init__(api_key=api_key, model=model)
        self.config = load_config()
        
    async def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        """
        Translate text from source language to target language using OpenRouter.
        
        Args:
            text (str): Text to translate.
            from_lang (str): Source language.
            to_lang (str): Target language.
            
        Returns:
            str: Translated text.
            
        Raises:
            TranslationError: If translation fails, with appropriate error type and status code.
        """
        try:
            # Create a clear prompt for translation
            prompt = f"Translate the following text from {from_lang} to {to_lang}: \"{text}\""
            self.logger.debug(f"Sending translation request to OpenRouter: {from_lang} → {to_lang}")
            
            # System prompt to guide the model
            system_prompt = "You are an expert translator. Translate the given text accurately and naturally. Preserve the meaning, tone, and style of the original text. Only return the translated text without any additional explanations or notes."
            
            # Prepare headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Add optional headers if available
            site_url = self.config.get("SITE_URL")
            site_name = self.config.get("SITE_NAME")
            
            if site_url:
                headers["HTTP-Referer"] = site_url
                self.logger.debug(f"Added HTTP-Referer header: {site_url}")
            if site_name:
                headers["X-Title"] = site_name
                self.logger.debug(f"Added X-Title header: {site_name}")
            
            # Prepare request payload
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.3  # Lower temperature for more deterministic translation
            }
            
            # Make API call
            self.logger.debug(f"Making API call to OpenRouter with model: {self.model}")
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.API_URL,
                    headers=headers,
                    json=payload,
                    timeout=30.0  # 30 second timeout
                )
                
                # Check for HTTP errors - this needs to be awaited when it's a coroutine
                await response.raise_for_status()
                
                # Parse response
                response_data = await response.json()
                
                # Extract and return the translated text
                if "choices" in response_data and len(response_data["choices"]) > 0:
                    translated_text = response_data["choices"][0]["message"]["content"].strip()
                    self.logger.debug(f"Received translation response from OpenRouter (length: {len(translated_text)})")
                    return translated_text
                else:
                    self.logger.error(f"Unexpected response format from OpenRouter: {response_data}")
                    raise TranslationError(
                        message="Unexpected response format from OpenRouter API.",
                        error_type=ErrorType.API_ERROR,
                        status_code=500
                    )
                
        except httpx.HTTPStatusError as e:
            # Handle HTTP errors
            status_code = e.response.status_code
            self.logger.error(f"OpenRouter HTTP error: {status_code} - {str(e)}")
            
            if status_code == 401:
                # Authentication error
                raise TranslationError(
                    message="Authentication failed with OpenRouter API. Please check your API key.",
                    error_type=ErrorType.AUTHENTICATION,
                    status_code=401,
                    original_exception=e
                ) from e
            elif status_code == 429:
                # Rate limit error
                raise TranslationError(
                    message="OpenRouter API rate limit exceeded. Please try again later.",
                    error_type=ErrorType.RATE_LIMIT,
                    status_code=429,
                    original_exception=e
                ) from e
            elif status_code == 400:
                # Bad request error
                raise TranslationError(
                    message="Invalid request to OpenRouter API. Please check your parameters.",
                    error_type=ErrorType.BAD_REQUEST,
                    status_code=400,
                    original_exception=e
                ) from e
            else:
                # Other HTTP errors
                raise TranslationError(
                    message=f"OpenRouter API error: {e.response.text}",
                    error_type=ErrorType.API_ERROR,
                    status_code=status_code,
                    original_exception=e
                ) from e
                
        except httpx.RequestError as e:
            # Handle connection errors
            self.logger.error(f"OpenRouter connection error: {str(e)}")
            raise TranslationError(
                message="Failed to connect to OpenRouter API. Please check your internet connection.",
                error_type=ErrorType.CONNECTION,
                status_code=503,
                original_exception=e
            ) from e
            
        except Exception as e:
            # Handle unexpected errors
            self.logger.error(f"Unexpected error during OpenRouter translation: {str(e)}", exc_info=True)
            raise TranslationError(
                message=f"An unexpected error occurred during translation: {str(e)}",
                error_type=ErrorType.UNKNOWN,
                status_code=500,
                original_exception=e
            ) from e