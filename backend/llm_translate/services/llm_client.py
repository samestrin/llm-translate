"""
One client for any OpenAI-compatible chat completions endpoint.

It has two tiers: `translate` (a fast model) and `review` (a reasoning model).
Base URL, key, models, timeout and concurrency come from `LLMSettings`.
"""
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, List, Optional

import httpx

from llm_translate.utils.config import LLMSettings
from llm_translate.utils.exceptions import TranslationError, ErrorType
from llm_translate.utils.logging import setup_logger

TIERS = ("translate", "review")


class LLMClient:
    """
    Async client for `POST {base_url}/chat/completions`.
    """

    def __init__(self, settings: LLMSettings, http_client: Optional[httpx.AsyncClient] = None):
        """
        Initialize the client.

        Args:
            settings (LLMSettings): Endpoint, key, models, timeout and concurrency.
            http_client (httpx.AsyncClient, optional): Client to send requests with.
                The caller owns it. Defaults to a new client per request.
        """
        self.settings = settings
        self._http_client = http_client
        self._semaphore = asyncio.Semaphore(settings.max_concurrency)
        self.logger = setup_logger("llm_translate.LLMClient")

    def model_for(self, tier: str) -> str:
        """
        Return the model name for a tier.

        Raises:
            ValueError: If the tier is not `translate` or `review`.
        """
        if tier == "translate":
            return self.settings.translate_model
        if tier == "review":
            return self.settings.review_model
        raise ValueError(f"Unknown model tier {tier!r}; expected one of {', '.join(TIERS)}")

    @asynccontextmanager
    async def _client(self) -> AsyncIterator[httpx.AsyncClient]:
        if self._http_client is not None:
            yield self._http_client
        else:
            async with httpx.AsyncClient() as client:
                yield client

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json", **self.settings.extra_headers}
        if self.settings.api_key:
            headers["Authorization"] = f"Bearer {self.settings.api_key}"
        return headers

    async def chat(self, messages: List[Dict[str, str]], tier: str = "translate", temperature: float = 0.3) -> str:
        """
        Send a chat completion and return the first choice's message content.

        Args:
            messages (List[Dict[str, str]]): OpenAI-style chat messages.
            tier (str, optional): `translate` or `review`. Defaults to `translate`.
            temperature (float, optional): Sampling temperature. Defaults to 0.3.

        Returns:
            str: The message content, as the model sent it.

        Raises:
            ValueError: If the tier is unknown.
            TranslationError: If the call fails or the answer has no message content.
        """
        model = self.model_for(tier)
        url = f"{self.settings.base_url.rstrip('/')}/chat/completions"
        payload = {"model": model, "messages": messages, "temperature": temperature}

        async with self._semaphore:
            self.logger.debug(f"Calling {tier} model {model} at {self.settings.base_url}")
            try:
                async with self._client() as client:
                    response = await client.post(
                        url, headers=self._headers(), json=payload, timeout=self.settings.timeout
                    )
            except httpx.TimeoutException as e:
                self.logger.error(f"Model endpoint timed out after {self.settings.timeout}s: {e}")
                raise TranslationError(
                    message=f"The model endpoint did not answer within {self.settings.timeout:g} seconds.",
                    error_type=ErrorType.TIMEOUT,
                    status_code=504,
                    original_exception=e
                ) from e
            except httpx.RequestError as e:
                self.logger.error(f"Model endpoint connection error: {e}")
                raise TranslationError(
                    message="Failed to connect to the model endpoint. Please check LLM_BASE_URL.",
                    error_type=ErrorType.CONNECTION,
                    status_code=503,
                    original_exception=e
                ) from e

        if response.status_code != 200:
            raise self._status_error(response)
        return self._content(response)

    def _status_error(self, response: httpx.Response) -> TranslationError:
        status = response.status_code
        self.logger.error(f"Model endpoint returned HTTP {status}: {response.text[:500]}")
        if status in (401, 403):
            return TranslationError(
                message="Authentication failed with the model endpoint. Please check your API key.",
                error_type=ErrorType.AUTHENTICATION,
                status_code=401
            )
        if status == 429:
            return TranslationError(
                message="Model endpoint rate limit exceeded. Please try again later.",
                error_type=ErrorType.RATE_LIMIT,
                status_code=429
            )
        if status == 400:
            return TranslationError(
                message="Invalid request to the model endpoint. Please check your parameters.",
                error_type=ErrorType.BAD_REQUEST,
                status_code=400
            )
        return TranslationError(
            message=f"Model endpoint error (HTTP {status}). Please try again later.",
            error_type=ErrorType.API_ERROR,
            status_code=500
        )

    def _content(self, response: httpx.Response) -> str:
        try:
            content = response.json()["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as e:
            content = None
            cause: Optional[Exception] = e
        else:
            cause = None
        if not isinstance(content, str):
            self.logger.error(f"Unexpected response format from model endpoint: {response.text[:500]}")
            raise TranslationError(
                message="Unexpected response format from the model endpoint.",
                error_type=ErrorType.API_ERROR,
                status_code=500,
                original_exception=cause
            )
        return content
