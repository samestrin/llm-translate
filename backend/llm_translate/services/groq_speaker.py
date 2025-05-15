"""
Groq speaker module for text-to-speech services.
"""
from typing import Optional, Dict, Any
import httpx
import json

from llm_translate.services.base_speaker import BaseSpeaker
from llm_translate.utils.exceptions import ErrorType, TranslationError


class GroqSpeaker(BaseSpeaker):
    """
    Speaker implementation using Groq's API.
    """
    
    def __init__(self, api_key: str, model: str = "playai-tts"):
        """
        Initialize the Groq speaker.
        
        Args:
            api_key (str): Groq API key.
            model (str, optional): Groq TTS model to use. Defaults to "playai-tts".
        """
        super().__init__(api_key=api_key, model=model)
        self.api_url = "https://api.groq.com/openai/v1/audio/speech"
        self.supported_formats = ["wav"]  # Groq currently only supports WAV
        
    async def speak(self, text: str, lang: str, voice: Optional[str] = None, 
                   response_format: str = "mp3", instructions: Optional[str] = None) -> bytes:
        """
        Convert text to speech using Groq's API.
        
        Args:
            text (str): Text to convert to speech.
            lang (str): Language of the text (not directly used by Groq but logged).
            voice (Optional[str], optional): Voice to use (e.g., "Fritz-PlayAI", "Aaliyah-PlayAI").
                                            Defaults to None, which will use Groq's default.
            response_format (str, optional): Format of the audio response. Defaults to "mp3".
                                            Note: Groq only supports "wav", so conversion will be applied if needed.
            instructions (Optional[str], optional): Additional instructions (not used by Groq but logged).
            
        Returns:
            bytes: Audio content.
            
        Raises:
            TranslationError: If text-to-speech conversion fails.
        """
        try:
            # Default voice if not specified
            voice_to_use = voice or "Fritz-PlayAI"
            
            # Groq only supports wav format
            groq_format = "wav"
            
            self.logger.debug(f"Sending TTS request to Groq: lang={lang}, voice={voice_to_use}, format={groq_format}")
            
            # Create the request payload
            payload = {
                "model": self.model,
                "input": text,
                "voice": voice_to_use,
                "response_format": groq_format
            }
            
            # Log instructions if provided (not used by Groq)
            if instructions:
                self.logger.debug(f"Instructions provided but not used by Groq: {instructions}")
                
            # Set up headers
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            # Make API call
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.api_url,
                    headers=headers,
                    json=payload,
                    timeout=60.0  # Longer timeout for TTS
                )
                
                # Check for errors
                if response.status_code != 200:
                    error_message = f"Groq API error: {response.status_code}"
                    try:
                        error_data = response.json()
                        if "error" in error_data and "message" in error_data["error"]:
                            error_message = f"Groq API error: {error_data['error']['message']}"
                    except Exception:
                        pass
                    
                    self.logger.error(error_message)
                    raise TranslationError(
                        message=error_message,
                        error_type=ErrorType.API_ERROR,
                        status_code=response.status_code,
                        original_exception=None
                    )
                
                # Get the audio content
                audio_content = response.content
            
            # If the requested format is different from what Groq provided, convert it
            if response_format.lower() != groq_format:
                self.logger.debug(f"Converting audio from {groq_format} to {response_format}")
                audio_content = self.convert_audio_format(audio_content, groq_format, response_format.lower())
            
            self.logger.debug(f"Received TTS response from Groq (size: {len(audio_content)} bytes)")
            return audio_content
            
        except httpx.RequestError as e:
            # Handle connection errors
            self.logger.error(f"Groq connection error: {str(e)}")
            raise TranslationError(
                message=f"Failed to connect to Groq API: {str(e)}",
                error_type=ErrorType.CONNECTION,
                status_code=503,
                original_exception=e
            ) from e
        except httpx.TimeoutException as e:
            # Handle timeout errors
            self.logger.error(f"Groq request timed out: {str(e)}")
            raise TranslationError(
                message="Request to Groq API timed out. Please try again later.",
                error_type=ErrorType.TIMEOUT,
                status_code=504,
                original_exception=e
            ) from e
        except json.JSONDecodeError as e:
            # Handle JSON parsing errors
            self.logger.error(f"Failed to parse Groq API response: {str(e)}")
            raise TranslationError(
                message="Failed to parse response from Groq API.",
                error_type=ErrorType.API_ERROR,
                status_code=500,
                original_exception=e
            ) from e
        except Exception as e:
            # Handle unexpected errors
            self.logger.error(f"Unexpected error during Groq TTS: {str(e)}", exc_info=True)
            raise TranslationError(
                message=f"An unexpected error occurred during text-to-speech conversion: {str(e)}",
                error_type=ErrorType.UNKNOWN,
                status_code=500,
                original_exception=e
            ) from e