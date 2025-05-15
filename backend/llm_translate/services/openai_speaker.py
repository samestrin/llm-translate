"""
OpenAI speaker module for text-to-speech services using direct HTTP requests.
"""
from typing import Optional, Dict, Any
import io
import httpx

from llm_translate.services.base_speaker import BaseSpeaker
from llm_translate.utils.exceptions import ErrorType, TranslationError


class OpenAISpeaker(BaseSpeaker):
    """
    Speaker implementation using OpenAI's API via direct HTTP requests.
    """
    
    def __init__(self, api_key: str, model: str = "gpt-4o-mini-tts"):
        """
        Initialize the OpenAI speaker.
        
        Args:
            api_key (str): OpenAI API key.
            model (str, optional): OpenAI TTS model to use. Defaults to "gpt-4o-mini-tts".
        """
        super().__init__(api_key=api_key, model=model)
        self.api_url = "https://api.openai.com/v1/audio/speech"
        self.supported_formats = ["mp3", "opus", "aac", "flac"]
        
    async def speak(self, text: str, lang: str, voice: Optional[str] = None, 
                   response_format: str = "mp3", instructions: Optional[str] = None) -> bytes:
        """
        Convert text to speech using OpenAI's API via direct HTTP request.
        
        Args:
            text (str): Text to convert to speech.
            lang (str): Language of the text (not directly used by OpenAI but logged).
            voice (Optional[str], optional): Voice to use (e.g., "alloy", "echo", "fable", "onyx", "nova", "shimmer").
                                            Defaults to None, which will use OpenAI's default.
            response_format (str, optional): Format of the audio response. Defaults to "mp3".
            instructions (Optional[str], optional): Additional instructions for the TTS service. Defaults to None.
            
        Returns:
            bytes: Audio content.
            
        Raises:
            TranslationError: If text-to-speech conversion fails.
        """
        try:
            # Default voice if not specified
            voice_to_use = voice or "alloy"
            
            # Default format if not in supported formats
            format_to_use = response_format.lower()
            if format_to_use not in self.supported_formats:
                self.logger.warning(f"Format {format_to_use} not supported by OpenAI, using mp3 instead")
                format_to_use = "mp3"
            
            self.logger.debug(f"Sending TTS request to OpenAI: lang={lang}, voice={voice_to_use}, format={format_to_use}")
            
            # Create the request payload
            payload = {
                "model": self.model,
                "input": text,
                "voice": voice_to_use,
                "response_format": format_to_use
            }
            
            # Add instructions if provided
            if instructions:
                payload["instructions"] = instructions
                
            # Set up headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Make HTTP request
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers,
                    timeout=30.0  # 30 second timeout
                )
                
                # Check for errors
                if response.status_code != 200:
                    error_info = response.json() if response.headers.get("content-type") == "application/json" else {"error": response.text}
                    error_message = error_info.get("error", {}).get("message", str(error_info)) if isinstance(error_info, dict) else str(error_info)
                    self.logger.error(f"OpenAI API error: {response.status_code} - {error_message}")
                    
                    if response.status_code == 401:
                        raise TranslationError(
                            message="Authentication failed with OpenAI API. Please check your API key.",
                            error_type=ErrorType.AUTHENTICATION,
                            status_code=401
                        )
                    elif response.status_code == 429:
                        raise TranslationError(
                            message="OpenAI API rate limit exceeded. Please try again later.",
                            error_type=ErrorType.RATE_LIMIT,
                            status_code=429
                        )
                    elif response.status_code == 400:
                        raise TranslationError(
                            message=f"Invalid request to OpenAI API: {error_message}",
                            error_type=ErrorType.BAD_REQUEST,
                            status_code=400
                        )
                    else:
                        raise TranslationError(
                            message=f"OpenAI API error: {response.status_code} - {error_message}",
                            error_type=ErrorType.API_ERROR,
                            status_code=response.status_code
                        )
                
                # Get the audio content
                audio_content = response.content
            
            # If the requested format is different from what OpenAI provided, convert it
            if response_format.lower() != format_to_use:
                self.logger.debug(f"Converting audio from {format_to_use} to {response_format}")
                audio_content = self.convert_audio_format(audio_content, format_to_use, response_format.lower())
            
            self.logger.debug(f"Received TTS response from OpenAI (size: {len(audio_content)} bytes)")
            return audio_content
            
        except httpx.RequestError as e:
            # Handle connection errors
            self.logger.error(f"OpenAI connection error: {str(e)}")
            raise TranslationError(
                message="Failed to connect to OpenAI API. Please check your internet connection.",
                error_type=ErrorType.CONNECTION,
                status_code=503,
                original_exception=e
            ) from e
        except httpx.TimeoutException as e:
            # Handle timeout errors
            self.logger.error(f"OpenAI request timed out: {str(e)}")
            raise TranslationError(
                message="Request to OpenAI API timed out. Please try again later.",
                error_type=ErrorType.TIMEOUT,
                status_code=504,
                original_exception=e
            ) from e
        except Exception as e:
            # Handle unexpected errors
            self.logger.error(f"Unexpected error during OpenAI TTS: {str(e)}", exc_info=True)
            raise TranslationError(
                message=f"An unexpected error occurred during text-to-speech conversion: {str(e)}",
                error_type=ErrorType.UNKNOWN,
                status_code=500,
                original_exception=e
            ) from e