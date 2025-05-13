"""
Unit tests for the OpenAI translator.
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from openai import AuthenticationError, RateLimitError, BadRequestError, APIConnectionError
from llm_translate.services.openai_translator import OpenAITranslator
from llm_translate.utils.exceptions import TranslationError, ErrorType


@pytest.fixture
def mock_openai_client():
    """Create a mock OpenAI client for testing."""
    mock_client = MagicMock()
    mock_client.chat.completions.create = AsyncMock()
    return mock_client


@pytest.fixture
def translator(mock_openai_client):
    """Create an OpenAITranslator instance with a mock client."""
    translator = OpenAITranslator(api_key="test-api-key", model="gpt-4.1-mini-2025-04-14")
    translator.client = mock_openai_client
    return translator


@pytest.mark.asyncio
async def test_translate_success(translator, mock_openai_client):
    """Test successful translation."""
    # Set up the mock response
    mock_response = MagicMock()
    mock_response.choices = [MagicMock()]
    mock_response.choices[0].message.content = "Bonjour"
    mock_openai_client.chat.completions.create.return_value = mock_response
    
    # Call the translate method
    result = await translator.translate("Hello", "English", "French")
    
    # Verify the result
    assert result == "Bonjour"
    
    # Verify the API call
    mock_openai_client.chat.completions.create.assert_called_once()
    call_args = mock_openai_client.chat.completions.create.call_args[1]
    assert call_args["model"] == "gpt-4.1-mini-2025-04-14"
    assert len(call_args["messages"]) == 2
    assert call_args["messages"][0]["role"] == "system"
    assert call_args["messages"][1]["role"] == "user"
    assert "Translate the following text from English to French" in call_args["messages"][1]["content"]


@pytest.mark.asyncio
async def test_translate_authentication_error(translator, mock_openai_client):
    """Test handling of authentication errors."""
    # Create a mock response for the error
    mock_response = MagicMock()
    mock_response.status_code = 401
    mock_response.json.return_value = {"error": {"message": "Invalid API key"}}
    
    # Create a properly structured AuthenticationError
    auth_error = AuthenticationError(
        message="Invalid API key",
        response=mock_response,
        body={"error": {"message": "Invalid API key"}}
    )
    
    # Set up the mock to raise the error
    mock_openai_client.chat.completions.create.side_effect = auth_error
    
    # Call the translate method and expect a TranslationError
    with pytest.raises(TranslationError) as excinfo:
        await translator.translate("Hello", "English", "French")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.AUTHENTICATION
    assert error.status_code == 401
    assert "Authentication failed" in error.message


@pytest.mark.asyncio
async def test_translate_rate_limit_error(translator, mock_openai_client):
    """Test handling of rate limit errors."""
    # Create a mock response for the error
    mock_response = MagicMock()
    mock_response.status_code = 429
    mock_response.json.return_value = {"error": {"message": "Rate limit exceeded"}}
    
    # Create a properly structured RateLimitError
    rate_limit_error = RateLimitError(
        message="Rate limit exceeded",
        response=mock_response,
        body={"error": {"message": "Rate limit exceeded"}}
    )
    
    # Set up the mock to raise the error
    mock_openai_client.chat.completions.create.side_effect = rate_limit_error
    
    # Call the translate method and expect a TranslationError
    with pytest.raises(TranslationError) as excinfo:
        await translator.translate("Hello", "English", "French")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.RATE_LIMIT
    assert error.status_code == 429
    assert "rate limit exceeded" in error.message.lower()


@pytest.mark.asyncio
async def test_translate_bad_request_error(translator, mock_openai_client):
    """Test handling of bad request errors."""
    # Create a mock response for the error
    mock_response = MagicMock()
    mock_response.status_code = 400
    mock_response.json.return_value = {"error": {"message": "Invalid request"}}
    
    # Create a properly structured BadRequestError
    bad_request_error = BadRequestError(
        message="Invalid request",
        response=mock_response,
        body={"error": {"message": "Invalid request"}}
    )
    
    # Set up the mock to raise the error
    mock_openai_client.chat.completions.create.side_effect = bad_request_error
    
    # Call the translate method and expect a TranslationError
    with pytest.raises(TranslationError) as excinfo:
        await translator.translate("Hello", "English", "French")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.BAD_REQUEST
    assert error.status_code == 400
    assert "Invalid request" in error.message


@pytest.mark.asyncio
async def test_translate_connection_error(translator, mock_openai_client):
    """Test handling of connection errors."""
    # Create a properly structured APIConnectionError
    # Note: APIConnectionError takes different parameters than the status errors
    connection_error = APIConnectionError(request=MagicMock())
    
    # Set up the mock to raise the error
    mock_openai_client.chat.completions.create.side_effect = connection_error
    
    # Call the translate method and expect a TranslationError
    with pytest.raises(TranslationError) as excinfo:
        await translator.translate("Hello", "English", "French")
    
    # Verify the error details
    error = excinfo.value
    assert error.error_type == ErrorType.CONNECTION
    assert error.status_code == 503
    assert "Failed to connect" in error.message