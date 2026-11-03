"""
One client for any OpenAI-compatible chat completions endpoint.

It has two tiers: `translate` (a fast model) and `review` (a reasoning model).
Base URL, key, models, timeout and concurrency come from `LLMSettings`.
"""
import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, List, Optional

import httpx
from pydantic import BaseModel, Field, StrictStr, ValidationError

from llm_translate.utils.config import LLMSettings, load_llm_settings
from llm_translate.utils.exceptions import TranslationError, ErrorType
from llm_translate.utils.logging import setup_logger

TIERS = ("translate", "review")

_shared_client: Optional["LLMClient"] = None


class Usage(BaseModel):
    """Tokens a model call spent, as the endpoint reported them."""
    prompt_tokens: int = Field(0, ge=0)
    completion_tokens: int = Field(0, ge=0)
    total_tokens: int = Field(0, ge=0)

    def __add__(self, other: "Usage") -> "Usage":
        return Usage(
            prompt_tokens=self.prompt_tokens + other.prompt_tokens,
            completion_tokens=self.completion_tokens + other.completion_tokens,
            total_tokens=self.total_tokens + other.total_tokens,
        )


class ChatResult(BaseModel):
    """One model answer: its content, the model that wrote it and the tokens it spent."""
    content: str
    model: str
    usage: Usage


class _Message(BaseModel):
    content: StrictStr


class _Choice(BaseModel):
    message: _Message


class _Completion(BaseModel):
    """The part of an OpenAI chat completion body the client reads."""
    choices: List[_Choice] = Field(min_length=1)
    model: Optional[StrictStr] = None
    usage: Optional[Usage] = None


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

        Same arguments and errors as `complete`.

        Returns:
            str: The message content, as the model sent it.
        """
        return (await self.complete(messages, tier=tier, temperature=temperature)).content

    async def complete(
        self, messages: List[Dict[str, str]], tier: str = "translate", temperature: float = 0.3
    ) -> ChatResult:
        """
        Send a chat completion and return the first choice's content, the model and the usage.

        The model is the one the endpoint names in its answer, else the one asked for.
        Usage is zero when the endpoint reports none.

        Args:
            messages (List[Dict[str, str]]): OpenAI-style chat messages.
            tier (str, optional): `translate` or `review`. Defaults to `translate`.
            temperature (float, optional): Sampling temperature. Defaults to 0.3.

        Returns:
            ChatResult: The answer.

        Raises:
            ValueError: If the tier is unknown.
            TranslationError: If the call fails or the answer does not match the completion schema.
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
        return self._result(response, model)

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

    def _result(self, response: httpx.Response, requested_model: str) -> ChatResult:
        try:
            completion = _Completion.model_validate(response.json())
        except (ValueError, ValidationError) as e:
            self.logger.error(f"Unexpected response format from model endpoint: {response.text[:500]}")
            raise TranslationError(
                message="Unexpected response format from the model endpoint.",
                error_type=ErrorType.API_ERROR,
                status_code=500,
                original_exception=e
            ) from e
        return ChatResult(
            content=completion.choices[0].message.content,
            model=completion.model or requested_model,
            usage=completion.usage or Usage(),
        )

def get_llm_client() -> "LLMClient":
    """
    Return the app-wide client for the current environment.

    The same client is reused while the settings stay the same, so
    `LLM_MAX_CONCURRENCY` caps every request the app makes, not one call.

    Raises:
        ValueError: If the environment holds an invalid setting.
    """
    global _shared_client
    settings = load_llm_settings()
    if _shared_client is None or _shared_client.settings != settings:
        _shared_client = LLMClient(settings)
    return _shared_client
