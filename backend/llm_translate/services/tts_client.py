"""
One client for any OpenAI-compatible text-to-speech endpoint.

Base URL, key, model, voice and the formats the endpoint returns natively come
from `TTSSettings`. A format outside that list is converted from the first one.
"""
import io
from contextlib import asynccontextmanager
from typing import AsyncIterator, Dict, Optional

import httpx

from llm_translate.utils.config import TTSSettings, load_tts_settings
from llm_translate.utils.exceptions import TranslationError, ErrorType
from llm_translate.utils.logging import setup_logger

_shared_client: Optional["TTSClient"] = None


class TTSClient:
    """
    Async client for `POST {base_url}/audio/speech`.
    """

    def __init__(self, settings: TTSSettings, http_client: Optional[httpx.AsyncClient] = None):
        """
        Initialize the client.

        Args:
            settings (TTSSettings): Endpoint, key, model, voice, formats and timeout.
            http_client (httpx.AsyncClient, optional): Client to send requests with.
                The caller owns it. Defaults to a new client per request.
        """
        self.settings = settings
        self._http_client = http_client
        self.logger = setup_logger("llm_translate.TTSClient")

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

    async def speak(self, text: str, lang: str, voice: Optional[str] = None,
                    response_format: str = "mp3", instructions: Optional[str] = None) -> bytes:
        """
        Convert text to speech.

        Args:
            text (str): Text to convert to speech.
            lang (str): Language of the text (logged; the endpoint infers it from the text).
            voice (str, optional): Voice name. Defaults to `TTS_VOICE`.
            response_format (str, optional): Wanted audio format. Defaults to "mp3". If the
                endpoint does not return it natively (`TTS_FORMATS`), audio is converted.
            instructions (str, optional): Extra delivery instructions, sent when given.

        Returns:
            bytes: Audio content in `response_format`.

        Raises:
            TranslationError: If the call fails or the conversion fails.
        """
        wanted = response_format.lower()
        native = wanted if wanted in self.settings.formats else self.settings.formats[0]
        payload = {
            "model": self.settings.model,
            "input": text,
            "voice": voice or self.settings.voice,
            "response_format": native,
        }
        if instructions:
            payload["instructions"] = instructions
        url = f"{self.settings.base_url.rstrip('/')}/audio/speech"

        self.logger.debug(f"TTS request: lang={lang}, voice={payload['voice']}, format={native}")
        try:
            async with self._client() as client:
                response = await client.post(
                    url, headers=self._headers(), json=payload, timeout=self.settings.timeout
                )
        except httpx.TimeoutException as e:
            self.logger.error(f"TTS endpoint timed out after {self.settings.timeout}s: {e}")
            raise TranslationError(
                message=f"The TTS endpoint did not answer within {self.settings.timeout:g} seconds.",
                error_type=ErrorType.TIMEOUT,
                status_code=504,
                original_exception=e
            ) from e
        except httpx.RequestError as e:
            self.logger.error(f"TTS endpoint connection error: {e}")
            raise TranslationError(
                message="Failed to connect to the TTS endpoint. Please check TTS_BASE_URL.",
                error_type=ErrorType.CONNECTION,
                status_code=503,
                original_exception=e
            ) from e

        if response.status_code != 200:
            raise self._status_error(response)

        audio = response.content
        if native != wanted:
            self.logger.debug(f"Converting audio from {native} to {wanted}")
            audio = self.convert_audio_format(audio, native, wanted)
        return audio

    def convert_audio_format(self, audio_bytes: bytes, from_format: str, to_format: str) -> bytes:
        """
        Convert audio between formats with pydub (needs ffmpeg for most formats).

        Raises:
            TranslationError: If the audio cannot be converted.
        """
        if from_format == to_format:
            return audio_bytes
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=from_format)
            output = io.BytesIO()
            audio.export(output, format=to_format)
            return output.getvalue()
        except Exception as e:
            self.logger.error(f"Error converting audio from {from_format} to {to_format}: {e}")
            raise TranslationError(
                message=f"Failed to convert audio from {from_format} to {to_format}.",
                error_type=ErrorType.API_ERROR,
                status_code=500,
                original_exception=e
            ) from e

    def _status_error(self, response: httpx.Response) -> TranslationError:
        status = response.status_code
        self.logger.error(f"TTS endpoint returned HTTP {status}: {response.text[:500]}")
        if status in (401, 403):
            return TranslationError(
                message="Authentication failed with the TTS endpoint. Please check your API key.",
                error_type=ErrorType.AUTHENTICATION,
                status_code=status
            )
        if status == 429:
            return TranslationError(
                message="TTS endpoint rate limit exceeded. Please try again later.",
                error_type=ErrorType.RATE_LIMIT,
                status_code=429
            )
        if status == 400:
            return TranslationError(
                message="Invalid request to the TTS endpoint. Please check your parameters.",
                error_type=ErrorType.BAD_REQUEST,
                status_code=400
            )
        return TranslationError(
            message=f"TTS endpoint error (HTTP {status}). Please try again later.",
            error_type=ErrorType.API_ERROR,
            status_code=500
        )


def get_tts_client() -> "TTSClient":
    """
    Return the app-wide client for the current environment, reused while the settings stay the same.

    Raises:
        ValueError: If the environment holds an invalid setting.
    """
    global _shared_client
    settings = load_tts_settings()
    if _shared_client is None or _shared_client.settings != settings:
        _shared_client = TTSClient(settings)
    return _shared_client
