"""
Integration tests for error handling in the API.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from llm_translate.utils.exceptions import TranslationError, ErrorType
from main import app


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_load_config():
    """Mock the load_config function to return a test configuration."""
    with patch("llm_translate.utils.config.load_config") as mock_config:
        mock_config.return_value = {
            "AI_SOURCE": "openai",
            "OPENAI_API_KEY": "test-openai-key",
            "OPENAI_MODEL": "test-openai-model"
        }
        yield mock_config


@patch("main.get_translation_service")
def test_authentication_error(mock_get_service, test_client, mock_load_config):
    """Test handling of authentication errors."""
    # Configure the mock to raise a TranslationError with AUTHENTICATION error type
    mock_translator = mock_get_service.return_value
    mock_translator.translate.side_effect = TranslationError(
        "Authentication failed: Invalid API key",
        error_type=ErrorType.AUTHENTICATION,
        status_code=401
    )
    
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Patch the app_config directly to ensure consistent service provider
    with patch("main.app_config", {"AI_SOURCE": "openai"}):
        # Send request to the endpoint
        response = test_client.post("/translate", json=test_data)
    
        # Check response
        assert response.status_code == 401
        response_data = response.json()
        assert "error" in response_data
        assert "message" in response_data["error"]
        assert "Authentication failed" in response_data["error"]["message"]
        assert response_data["error"]["type"] == "authentication_error"


@patch("main.get_translation_service")
def test_rate_limit_error(mock_get_service, test_client, mock_load_config):
    """Test handling of rate limit errors."""
    # Configure the mock to raise a TranslationError with RATE_LIMIT error type
    mock_translator = mock_get_service.return_value
    mock_translator.translate.side_effect = TranslationError(
        "Rate limit exceeded",
        error_type=ErrorType.RATE_LIMIT,
        status_code=429
    )
    
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Patch the app_config directly to ensure consistent service provider
    with patch("main.app_config", {"AI_SOURCE": "openai"}):
        # Send request to the endpoint
        response = test_client.post("/translate", json=test_data)
    
        # Check response
        assert response.status_code == 429
        response_data = response.json()
        assert "error" in response_data
        assert "message" in response_data["error"]
        assert "Rate limit exceeded" in response_data["error"]["message"]
        assert response_data["error"]["type"] == "rate_limit_error"


@patch("main.get_translation_service")
def test_bad_request_error(mock_get_service, test_client, mock_load_config):
    """Test handling of bad request errors."""
    # Configure the mock to raise a TranslationError with BAD_REQUEST error type
    mock_translator = mock_get_service.return_value
    mock_translator.translate.side_effect = TranslationError(
        "Invalid request: Bad parameters",
        error_type=ErrorType.BAD_REQUEST,
        status_code=400
    )
    
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Patch the app_config directly to ensure consistent service provider
    with patch("main.app_config", {"AI_SOURCE": "openai"}):
        # Send request to the endpoint
        response = test_client.post("/translate", json=test_data)
    
        # Check response
        assert response.status_code == 400
        response_data = response.json()
        assert "error" in response_data
        assert "message" in response_data["error"]
        assert "Invalid request" in response_data["error"]["message"]
        assert response_data["error"]["type"] == "bad_request_error"


@patch("main.get_translation_service")
def test_connection_error(mock_get_service, test_client, mock_load_config):
    """Test handling of connection errors."""
    # Configure the mock to raise a TranslationError with CONNECTION error type
    mock_translator = mock_get_service.return_value
    mock_translator.translate.side_effect = TranslationError(
        "Failed to connect to the API",
        error_type=ErrorType.CONNECTION,
        status_code=503
    )
    
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Patch the app_config directly to ensure consistent service provider
    with patch("main.app_config", {"AI_SOURCE": "openai"}):
        # Send request to the endpoint
        response = test_client.post("/translate", json=test_data)
    
        # Check response
        assert response.status_code == 503
        response_data = response.json()
        assert "error" in response_data
        assert "message" in response_data["error"]
        assert "Failed to connect" in response_data["error"]["message"]
        assert response_data["error"]["type"] == "connection_error"