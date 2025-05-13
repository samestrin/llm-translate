"""
Unit tests for the configuration loading module.
"""
import os
import pytest
from unittest.mock import patch
from llm_translate.utils.config import load_config


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Set up mock environment variables for testing."""
    monkeypatch.setenv("AI_SOURCE", "openai")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("OPENAI_MODEL", "gpt-4.1-mini-2025-04-14")
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.setenv("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct")
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-openrouter-key")
    monkeypatch.setenv("OPENROUTER_MODEL", "qwen/qwen3-4b:free")
    monkeypatch.setenv("LOG_LEVEL", "DEBUG")


def test_load_config_with_env_vars(mock_env_vars):
    """Test that load_config correctly loads environment variables."""
    config = load_config()
    
    # Check that all expected keys are present
    assert "AI_SOURCE" in config
    assert "OPENAI_API_KEY" in config
    assert "OPENAI_MODEL" in config
    assert "GROQ_API_KEY" in config
    assert "GROQ_MODEL" in config
    assert "OPENROUTER_API_KEY" in config
    assert "OPENROUTER_MODEL" in config
    assert "LOG_LEVEL" in config
    
    # Check values
    assert config["AI_SOURCE"] == "openai"
    assert config["OPENAI_API_KEY"] == "test-openai-key"
    assert config["OPENAI_MODEL"] == "gpt-4.1-mini-2025-04-14"
    assert config["GROQ_API_KEY"] == "test-groq-key"
    assert config["GROQ_MODEL"] == "meta-llama/llama-4-maverick-17b-128e-instruct"
    assert config["OPENROUTER_API_KEY"] == "test-openrouter-key"
    assert config["OPENROUTER_MODEL"] == "qwen/qwen3-4b:free"
    assert config["LOG_LEVEL"] == "DEBUG"


def test_load_config_defaults(monkeypatch):
    """Test that load_config provides defaults for missing values."""
    # Clear relevant environment variables
    for var in ["AI_SOURCE", "OPENAI_MODEL", "GROQ_MODEL", "OPENROUTER_MODEL", "LOG_LEVEL"]:
        monkeypatch.delenv(var, raising=False)
    
    # Mock load_dotenv to prevent reading from .env file
    with patch("llm_translate.utils.config.load_dotenv"):
        config = load_config()
    
    # Check default values (these should match the defaults in your config.py)
    assert config.get("AI_SOURCE", "openai") == "openai"
    assert config.get("OPENAI_MODEL", "gpt-4.1-mini-2025-04-14") == "gpt-4.1-mini-2025-04-14"
    assert config.get("GROQ_MODEL", "meta-llama/llama-4-maverick-17b-128e-instruct") == "meta-llama/llama-4-maverick-17b-128e-instruct"
    assert config.get("OPENROUTER_MODEL", "qwen/qwen3-4b:free") == "qwen/qwen3-4b:free"
    assert config.get("LOG_LEVEL", "INFO") == "INFO"