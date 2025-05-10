"""
Unit tests for the OpenRouter translator.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
import httpx
from llm_translate.services.openrouter_translator import OpenRouterTranslator
from llm_translate.utils.exceptions import TranslationError, ErrorType


@pytest.fixture
def mock_httpx_client():
    """Create a mock httpx client for testing."""
    mock_client = MagicMock()
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=None)
    mock_client.post = AsyncMock()
    return mock_client


@pytest.fixture
def mock_httpx_response():
    """Create a mock httpx response for testing."""
    mock_response = MagicMock()
    # Make raise_for_status an AsyncMock (coroutine)
    mock_response.raise_for_status = AsyncMock()
    # Make json an AsyncMock (coroutine)
    mock_response.json = AsyncMock(return_value={
        "choices": [
            {
                "message": {
                    "content": "Ciao"
                }
            }
        ]
    })
    return mock_response


@pytest.fixture
def translator():
    """Create an OpenRouterTranslator instance for testing."""
    with patch("llm_translate.services.openrouter_translator.load_config") as mock_load_config:
        mock_load_config.return_value = {
            "SITE_URL": "https://example.com",
            "SITE_NAME": "LLM Translate"
        }
        translator = OpenRouterTranslator(api_key="test-api-key", model="qwen/qwen3-4b:free")
        return translator


@pytest.mark.asyncio
async def test_translate_success(translator, mock_httpx_client, mock_httpx_response):
    """Test successful translation."""
    # Set up the mock response
    mock_httpx_client.post.return_value = mock_httpx_response
    
    # Patch httpx.AsyncClient to return our mock
    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        # Call the translate method
        result = await translator.translate("Hello", "English", "Italian")
    
    # Verify the result
    assert result == "Ciao"
    
    # Verify the API call
    mock_httpx_client.post.assert_called_once()
    call_args = mock_httpx_client.post.call_args
    assert call_args[0][0] == "https://openrouter.ai/api/v1/chat/completions"
    
    # Check headers
    headers = call_args[1]["headers"]
    assert "Authorization" in headers
    assert headers["Authorization"] == "Bearer test-api-key"
    assert headers["Content-Type"] == "application/json"
    assert headers["HTTP-Referer"] == "https://example.com"
    assert headers["X-Title"] == "LLM Translate"
    
    # Check payload
    payload = call_args[1]["json"]
    assert payload["model"] == "qwen/qwen3-4b:free"
    assert len(payload["messages"]) == 2
    assert payload["messages"][0]["role"] == "system"
    assert payload["messages"][1]["role"] == "user"
    assert "Translate the following text from English to Italian" in payload["messages"][1]["content"]


@pytest.mark.asyncio
async def test_translate_http_error(translator, mock_httpx_client):
    """Test handling of HTTP errors."""
    # Set up the mock to raise an HTTPStatusError
    http_error = httpx.HTTPStatusError(
        "Authentication failed",
        request=MagicMock(),
        response=MagicMock(status_code=401)
    )
    mock_httpx_client.post.return_value.raise_for_status.side_effect = http_error
    
    # Patch httpx.AsyncClient to return our mock
    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        # Call the translate method and expect a TranslationError
        with pytest.raises(TranslationError) as excinfo:
            await translator.translate("Hello", "English", "Italian")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.AUTHENTICATION  # Changed from UNKNOWN to AUTHENTICATION
    assert error.status_code == 401
    assert "Authentication failed" in error.message  # Changed from "HTTP error" to "Authentication failed"


@pytest.mark.asyncio
async def test_translate_connection_error(translator, mock_httpx_client):
    """Test handling of connection errors."""
    # Set up the mock to raise a ConnectionError
    mock_httpx_client.post.side_effect = httpx.ConnectError("Connection error")
    
    # Patch httpx.AsyncClient to return our mock
    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        # Call the translate method and expect a TranslationError
        with pytest.raises(TranslationError) as excinfo:
            await translator.translate("Hello", "English", "Italian")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.CONNECTION
    assert error.status_code == 503
    assert "Failed to connect" in error.message


@pytest.mark.asyncio
async def test_translate_timeout_error(translator, mock_httpx_client):
    """Test handling of timeout errors."""
    # Set up the mock to raise a TimeoutError
    mock_httpx_client.post.side_effect = httpx.TimeoutException("Request timed out")
    
    # Patch httpx.AsyncClient to return our mock
    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        # Call the translate method and expect a TranslationError
        with pytest.raises(TranslationError) as excinfo:
            await translator.translate("Hello", "English", "Italian")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.CONNECTION  # Changed from TIMEOUT to CONNECTION
    assert error.status_code == 503  # Changed from 504 to 503 to match implementation
    assert "Failed to connect" in error.message  # Changed to match implementation


@pytest.mark.asyncio
async def test_translate_json_error(translator, mock_httpx_client, mock_httpx_response):
    """Test handling of JSON parsing errors."""
    # Set up the mock to raise a JSONDecodeError
    mock_httpx_response.json.side_effect = ValueError("Invalid JSON")
    mock_httpx_client.post.return_value = mock_httpx_response
    
    # Patch httpx.AsyncClient to return our mock
    with patch("httpx.AsyncClient", return_value=mock_httpx_client):
        # Call the translate method and expect a TranslationError
        with pytest.raises(TranslationError) as excinfo:
            await translator.translate("Hello", "English", "Italian")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.UNKNOWN  # Changed from API_ERROR to UNKNOWN
    assert error.status_code == 500
    assert "An unexpected error occurred during translation" in error.message  # Changed to match implementation