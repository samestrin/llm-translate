"""
Base translator abstract class that defines the interface for all translator implementations.
"""
from abc import ABC, abstractmethod
from llm_translate.utils.exceptions import TranslationError
from llm_translate.utils.logging import setup_logger


class BaseTranslator(ABC):
    """
    Abstract base class for translator services.
    All translator implementations must inherit from this class and implement the translate method.
    """
    def __init__(self, api_key: str = None, model: str = None):
        """
        Initialize the translator with API key and model name.
        
        Args:
            api_key (str, optional): API key for the service. Defaults to None.
            model (str, optional): Model name to use for translation. Defaults to None.
        """
        self.api_key = api_key
        self.model = model
        self.logger = setup_logger(f"llm_translate.{self.__class__.__name__}")
        self.logger.debug(f"Initialized {self.__class__.__name__} with model: {model}")

    @abstractmethod
    async def translate(self, text: str, from_lang: str, to_lang: str) -> str:
        """
        Translate text from source language to target language.
        
        Args:
            text (str): Text to translate.
            from_lang (str): Source language.
            to_lang (str): Target language.
            
        Returns:
            str: Translated text.
            
        Raises:
            TranslationError: If translation fails, with appropriate error type and status code.
        """
        pass