"""
Configuration loading module for llm-translate.
Loads environment variables from .env file.
"""
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv


def load_config() -> Dict[str, Any]:
    """
    Load configuration from .env file.
    
    Returns:
        Dict[str, Any]: Dictionary containing configuration values.
    """
    # Load environment variables from .env file
    load_dotenv()
    
    # Create configuration dictionary
    config = {
        "AI_SOURCE": os.getenv("AI_SOURCE", "openai"),
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
        "OPENAI_MODEL": os.getenv("OPENAI_MODEL", "gpt-4.1-mini-2025-04-14"),
        "GROQ_API_KEY": os.getenv("GROQ_API_KEY"),
        "GROQ_MODEL": os.getenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct"),
        "OPENROUTER_API_KEY": os.getenv("OPENROUTER_API_KEY"),
        "OPENROUTER_MODEL": os.getenv("OPENROUTER_MODEL", "qwen/qwen3-4b:free"),
        "TTS_SOURCE": os.getenv("TTS_SOURCE", "openai"),
        "TTS_MODEL": os.getenv("TTS_MODEL", "gpt-4o-mini-tts"),
        "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO"),
    }
    
    return config


def get_config_value(key: str, default: Optional[Any] = None) -> Any:
    """
    Get a specific configuration value.
    
    Args:
        key (str): Configuration key.
        default (Any, optional): Default value if key is not found. Defaults to None.
        
    Returns:
        Any: Configuration value.
    """
    config = load_config()
    return config.get(key, default)