"""
End-to-end tests for the LLM-Translate application.
"""
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import json
from main import app


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_env_vars():
    """Set up mock environment variables for testing."""
    # Save original environment variables
    original_env = {}
    for key in ["AI_SOURCE", "OPENAI_API_KEY", "OPENAI_MODEL", "GROQ_API_KEY", 
                "GROQ_MODEL", "OPENROUTER_API_KEY", "OPENROUTER_MODEL"]:
        original_env[key] = os.environ.get(key)
    
    # Set test environment variables
    os.environ["AI_SOURCE"] = "openai"
    os.environ["OPENAI_API_KEY"] = "test-openai-key"
    os.environ["OPENAI_MODEL"] = "gpt-4.1-mini-2025-04-14"
    
    yield
    
    # Restore original environment variables
    for key, value in original_env.items():
        if value is None:
            if key in os.environ:
                del os.environ[key]
        else:
            os.environ[key] = value


@pytest.mark.skipif(not os.environ.get("RUN_E2E_TESTS"), reason="E2E tests are disabled")
def test_e2e_translation(test_client, mock_env_vars):
    """
    End-to-end test for the translation endpoint.
    
    This test is skipped by default. To run it, set the RUN_E2E_TESTS environment variable:
    RUN_E2E_TESTS=1 pytest tests/integration/test_e2e.py
    """
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Mock the OpenAI API response
    mock_openai_response = {
        "choices": [
            {
                "message": {
                    "content": "¡Hola, mundo!"
                }
            }
        ]
    }
    
    # Patch the OpenAI API call
    with patch("openai.AsyncOpenAI.chat.completions.create") as mock_create:
        mock_create.return_value = mock_openai_response
        
        # Send request to the endpoint
        response = test_client.post("/translate", json=test_data)
        
        # Check response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["translated_text"] == "¡Hola, mundo!"
        assert response_data["from_lang"] == "English"
        assert response_data["to_lang"] == "Spanish"
        assert response_data["service_used"] == "openai"


@pytest.mark.skipif(not os.environ.get("RUN_E2E_TESTS"), reason="E2E tests are disabled")
def test_e2e_translation_with_groq(test_client):
    """
    End-to-end test for the translation endpoint using Groq.
    
    This test is skipped by default. To run it, set the RUN_E2E_TESTS environment variable:
    RUN_E2E_TESTS=1 pytest tests/integration/test_e2e.py
    """
    # Save original environment variables
    original_env = {}
    for key in ["AI_SOURCE", "GROQ_API_KEY", "GROQ_MODEL"]:
        original_env[key] = os.environ.get(key)
    
    # Set test environment variables for Groq
    os.environ["AI_SOURCE"] = "groq"
    os.environ["GROQ_API_KEY"] = "test-groq-key"
    os.environ["GROQ_MODEL"] = "meta-llama/llama-4-maverick-17b-128e-instruct"
    
    try:
        # Define test data
        test_data = {
            "text": "Hello, world!",
            "from_lang": "English",
            "to_lang": "French"
        }
        
        # Mock the Groq API response
        mock_groq_response = {
            "choices": [
                {
                    "message": {
                        "content": "Bonjour, monde!"
                    }
                }
            ]
        }
        
        # Patch the Groq API call
        with patch("groq.AsyncGroq.chat.completions.create") as mock_create:
            mock_create.return_value = mock_groq_response
            
            # Send request to the endpoint
            response = test_client.post("/translate", json=test_data)
            
            # Check response
            assert response.status_code == 200
            response_data = response.json()
            assert response_data["translated_text"] == "Bonjour, monde!"
            assert response_data["from_lang"] == "English"
            assert response_data["to_lang"] == "French"
            assert response_data["service_used"] == "groq"
    
    finally:
        # Restore original environment variables
        for key, value in original_env.items():
            if value is None:
                if key in os.environ:
                    del os.environ[key]
            else:
                os.environ[key] = value