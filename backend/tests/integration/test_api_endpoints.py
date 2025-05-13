"""
Integration tests for the API endpoints.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from llm_translate.services.base_translator import BaseTranslator
from main import app


class MockTranslator(BaseTranslator):
    """Mock translator for testing."""
    
    def __init__(self, api_key=None, model=None):
        super().__init__(api_key=api_key, model=model)
        self.api_key = api_key
        self.model = model
    
    async def translate(self, text, from_lang, to_lang):
        """Mock translation that returns a predictable result."""
        # Simple mock translation that adds language codes
        return f"[{to_lang}] {text} [{from_lang}]"


@pytest.fixture
def test_client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def mock_get_translation_service():
    """Mock the get_translation_service function to return our MockTranslator."""
    # Patch the function where it's imported in main.py, not where it's defined
    with patch("main.get_translation_service") as mock_get_service:
        mock_get_service.return_value = MockTranslator(api_key="test-key", model="test-model")
        yield mock_get_service


@pytest.fixture
def mock_load_config():
    """Mock the load_config function to return a test configuration."""
    with patch("llm_translate.utils.config.load_config") as mock_config:
        mock_config.return_value = {
            "AI_SOURCE": "test-service",
            "OPENAI_API_KEY": "test-openai-key",
            "OPENAI_MODEL": "test-openai-model",
            "GROQ_API_KEY": "test-groq-key",
            "GROQ_MODEL": "test-groq-model",
            "OPENROUTER_API_KEY": "test-openrouter-key",
            "OPENROUTER_MODEL": "test-openrouter-model"
        }
        yield mock_config


def test_root_endpoint(test_client):
    """Test the root endpoint returns the expected health check response."""
    response = test_client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()
    assert "llm-translate is running" in response.json()["message"]


def test_translate_endpoint_success(test_client, mock_get_translation_service, mock_load_config):
    """Test the /translate endpoint with a successful translation."""
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish",
    }
    
    # Patch the app_config directly
    with patch("main.app_config", {"AI_SOURCE": "test-service"}):
        # Send request to the endpoint
        response = test_client.post("/translate", json=test_data)
        
        # Check response
        assert response.status_code == 200
        response_data = response.json()
        assert response_data["translated_text"] == "[Spanish] Hello, world! [English]"
        assert response_data["from_lang"] == "English"
        assert response_data["to_lang"] == "Spanish"
        assert response_data["service_used"] == "test-service"


def test_translate_endpoint_validation_error(test_client):
    """Test the /translate endpoint with invalid input data."""
    # Missing required fields
    test_data = {
        "text": "Hello, world!"
        # Missing from_lang and to_lang
    }
    
    # Send request to the endpoint
    response = test_client.post("/translate", json=test_data)
    
    # Check response
    assert response.status_code == 422  # Validation error
    response_data = response.json()
    assert "detail" in response_data


@patch("main.get_translation_service")
def test_translate_endpoint_service_error(mock_get_service, test_client, mock_load_config):
    """Test the /translate endpoint when the translation service raises an error."""
    # Configure the mock to raise an exception
    mock_translator = MagicMock()
    mock_translator.translate.side_effect = Exception("Test translation error")
    mock_get_service.return_value = mock_translator
    
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Send request to the endpoint
    response = test_client.post("/translate", json=test_data)
    
    # Check response
    assert response.status_code == 500
    response_data = response.json()
    assert "error" in response_data
    assert "message" in response_data["error"]
    assert "An unexpected error occurred during translation" in response_data["error"]["message"]
    assert response_data["error"]["type"] == "unknown_error"


@patch("main.get_translation_service")
def test_translate_endpoint_value_error(mock_get_service, test_client, mock_load_config):
    """Test the /translate endpoint when the service selector raises a ValueError."""
    # Configure the mock to raise a ValueError
    mock_get_service.side_effect = ValueError("Unsupported AI service provider: invalid")
    
    # Define test data
    test_data = {
        "text": "Hello, world!",
        "from_lang": "English",
        "to_lang": "Spanish"
    }
    
    # Send request to the endpoint
    response = test_client.post("/translate", json=test_data)
    
    # Check response
    assert response.status_code == 400
    response_data = response.json()
    assert "error" in response_data
    assert "message" in response_data["error"]
    assert "Unsupported AI service provider: invalid" in response_data["error"]["message"]
    assert response_data["error"]["type"] == "invalid_request_error"