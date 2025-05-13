"""
Unit tests for the service selector module.
"""
import pytest
from unittest.mock import patch, MagicMock
from llm_translate.core.service_selector import get_translation_service
from llm_translate.services.base_translator import BaseTranslator
from llm_translate.services.openai_translator import OpenAITranslator
from llm_translate.services.groq_translator import GroqTranslator
from llm_translate.services.openrouter_translator import OpenRouterTranslator


@pytest.fixture
def mock_config():
    """Create a mock configuration for testing."""
    return {
        "AI_SOURCE": "openai",
        "OPENAI_API_KEY": "test-openai-key",
        "OPENAI_MODEL": "gpt-4.1-mini-2025-04-14",
        "GROQ_API_KEY": "test-groq-key",
        "GROQ_MODEL": "meta-llama/llama-4-maverick-17b-128e-instruct",
        "OPENROUTER_API_KEY": "test-openrouter-key",
        "OPENROUTER_MODEL": "qwen/qwen3-4b:free"
    }


@patch("llm_translate.core.service_selector.load_config")
def test_get_translation_service_openai(mock_load_config, mock_config):
    """Test that get_translation_service returns OpenAITranslator when AI_SOURCE is 'openai'."""
    mock_config["AI_SOURCE"] = "openai"
    mock_load_config.return_value = mock_config
    
    translator = get_translation_service()
    
    assert isinstance(translator, OpenAITranslator)
    assert translator.api_key == "test-openai-key"
    assert translator.model == "gpt-4.1-mini-2025-04-14"


@patch("llm_translate.core.service_selector.load_config")
def test_get_translation_service_groq(mock_load_config, mock_config):
    """Test that get_translation_service returns GroqTranslator when AI_SOURCE is 'groq'."""
    mock_config["AI_SOURCE"] = "groq"
    mock_load_config.return_value = mock_config
    
    translator = get_translation_service()
    
    assert isinstance(translator, GroqTranslator)
    assert translator.api_key == "test-groq-key"
    assert translator.model == "meta-llama/llama-4-maverick-17b-128e-instruct"


@patch("llm_translate.core.service_selector.load_config")
def test_get_translation_service_openrouter(mock_load_config, mock_config):
    """Test that get_translation_service returns OpenRouterTranslator when AI_SOURCE is 'openrouter'."""
    mock_config["AI_SOURCE"] = "openrouter"
    mock_load_config.return_value = mock_config
    
    translator = get_translation_service()
    
    assert isinstance(translator, OpenRouterTranslator)
    assert translator.api_key == "test-openrouter-key"
    assert translator.model == "qwen/qwen3-4b:free"


@patch("llm_translate.core.service_selector.load_config")
def test_get_translation_service_unsupported(mock_load_config, mock_config):
    """Test that get_translation_service raises ValueError for unsupported AI_SOURCE."""
    mock_config["AI_SOURCE"] = "unsupported_provider"
    mock_load_config.return_value = mock_config
    
    with pytest.raises(ValueError) as excinfo:
        get_translation_service()
    
    assert "Unsupported AI service provider" in str(excinfo.value)


@patch("llm_translate.core.service_selector.load_config")
def test_get_translation_service_import_error(mock_load_config, mock_config):
    """Test that get_translation_service raises ImportError when the translator module is not available."""
    mock_config["AI_SOURCE"] = "openai"
    mock_load_config.return_value = mock_config
    
    # Patch the import mechanism to raise ImportError for the specific module
    with patch("builtins.__import__") as mock_import:
        def import_mock(name, *args):
            if name == "llm_translate.services.openai_translator":
                raise ImportError("Test import error")
            return original_import(name, *args)
            
        original_import = __import__
        mock_import.side_effect = import_mock
        
        with pytest.raises(ImportError) as excinfo:
            get_translation_service()
    
    assert "OpenAI translator module not found" in str(excinfo.value)