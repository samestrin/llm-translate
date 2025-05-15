"""
Base speaker module for text-to-speech services.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
import io
import logging
from pydub import AudioSegment

from llm_translate.utils.logging import setup_logger


class BaseSpeaker(ABC):
    """
    Abstract base class for text-to-speech services.
    """
    
    def __init__(self, api_key: str, model: str):
        """
        Initialize the base speaker.
        
        Args:
            api_key (str): API key for the service.
            model (str): Model to use for text-to-speech.
        """
        self.api_key = api_key
        self.model = model
        self.logger = setup_logger(f"llm_translate.services.{self.__class__.__name__}")
        
    @abstractmethod
    async def speak(self, text: str, lang: str, voice: Optional[str] = None, 
                   response_format: str = "mp3", instructions: Optional[str] = None) -> bytes:
        """
        Convert text to speech.
        
        Args:
            text (str): Text to convert to speech.
            lang (str): Language of the text (e.g., "English", "Spanish").
            voice (Optional[str], optional): Voice to use. Defaults to None.
            response_format (str, optional): Format of the audio response. Defaults to "mp3".
            instructions (Optional[str], optional): Additional instructions for the TTS service. Defaults to None.
            
        Returns:
            bytes: Audio content.
        """
        pass
    
    def convert_audio_format(self, audio_bytes: bytes, from_format: str, to_format: str) -> bytes:
        """
        Convert audio from one format to another.
        
        Args:
            audio_bytes (bytes): Audio content to convert.
            from_format (str): Source format (e.g., "wav", "mp3").
            to_format (str): Target format (e.g., "wav", "mp3").
            
        Returns:
            bytes: Converted audio content.
            
        Raises:
            ValueError: If conversion between the specified formats is not supported.
        """
        if from_format == to_format:
            return audio_bytes
            
        try:
            # Load the audio using pydub
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=from_format)
            
            # Export to the target format
            output = io.BytesIO()
            audio.export(output, format=to_format)
            return output.getvalue()
        except Exception as e:
            self.logger.error(f"Error converting audio from {from_format} to {to_format}: {str(e)}")
            raise ValueError(f"Failed to convert audio from {from_format} to {to_format}: {str(e)}")