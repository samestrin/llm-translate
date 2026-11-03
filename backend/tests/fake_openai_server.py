"""
A fake OpenAI-compatible server for tests.

It serves `POST .../chat/completions` and `POST .../audio/speech` in-process through `httpx.ASGITransport`,
records every request it receives, and answers with whatever the test scripts.
"""
import asyncio
from typing import Any, Callable, Dict, List, Optional, Union

import httpx
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

DETECT_MARKER = "language identification"
SUMMARY_MARKER = "summarize documents"
BACK_TRANSLATION_MARKER = "back-translate"
REVIEW_MARKER = "review a translation"
REVISION_MARKER = "revise a translation"

# Stand-in audio bodies, one per response_format.
AUDIO_BODIES = {
    "mp3": b"ID3fake-mp3",
    "wav": b"RIFFfake-wav",
    "opus": b"OggSfake-opus",
    "aac": b"\xff\xf1fake-aac",
    "flac": b"fLaCfake-flac",
}
AUDIO_TYPES = {
    "mp3": "audio/mpeg", "wav": "audio/wav", "opus": "audio/opus", "aac": "audio/aac", "flac": "audio/flac",
}


USAGE = {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}


def completion(content: Optional[str], model: str = "fake-model", usage: Optional[Dict[str, int]] = None) -> Dict[str, Any]:
    """Build an OpenAI-style chat completion body."""
    return {
        "id": "chatcmpl-fake",
        "object": "chat.completion",
        "model": model,
        "choices": [
            {"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}
        ],
        "usage": USAGE if usage is None else usage,
    }


class FakeOpenAIServer:
    """
    In-process OpenAI-compatible server.

    By default it answers language-detection prompts with `detected_language`,
    document-summary prompts with `summary`, back-translation prompts with
    `back_translation`, review prompts with `review`, revision prompts with `revision`
    and every other prompt with `translation`. Set `respond` to answer per request instead: it gets the
    request body and returns the content, or a whole response. Set `status` and `body` to
    return an error or a malformed answer instead, or `delay` to hold each
    request open (for concurrency tests). `usage` is the token count sent
    with every answer.
    """

    def __init__(self, translation: str = "Hola", detected_language: str = "English"):
        self.translation = translation
        self.detected_language = detected_language
        self.summary = "A short document."
        self.back_translation = "Hello"
        self.review = '{"errors": []}'
        self.revision = "Hola"
        self.respond: Optional[Callable[[Dict[str, Any]], Union[str, Response]]] = None
        self.status = 200
        self.body: Optional[Any] = None
        self.delay = 0.0
        self.usage: Dict[str, int] = dict(USAGE)
        self.requests: List[Dict[str, Any]] = []
        self.timeouts: List[Dict[str, Any]] = []
        self.in_flight = 0
        self.peak_in_flight = 0
        self.app = Starlette(routes=[Route("/{path:path}", self._handle, methods=["POST"])])

    async def _handle(self, request: Request) -> JSONResponse:
        payload = await request.json()
        self.requests.append({
            "url": str(request.url),
            "headers": dict(request.headers),
            "json": payload,
        })
        self.in_flight += 1
        self.peak_in_flight = max(self.peak_in_flight, self.in_flight)
        try:
            if self.delay:
                await asyncio.sleep(self.delay)
        finally:
            self.in_flight -= 1

        path = str(request.url.path)
        if path.endswith("/audio/speech") and self.status == 200:
            fmt = payload.get("response_format", "mp3")
            return Response(AUDIO_BODIES[fmt], media_type=AUDIO_TYPES[fmt])
        if not path.endswith(("/chat/completions", "/audio/speech")):
            return JSONResponse({"error": {"message": "not found"}}, status_code=404)
        if self.status != 200 or self.body is not None:
            return JSONResponse(self.body if self.body is not None else {"error": {"message": "fake error"}},
                                status_code=self.status)

        if self.respond is not None:
            answer = self.respond(payload)
            if isinstance(answer, Response):
                return answer
            return JSONResponse(completion(answer, model=payload["model"], usage=self.usage))

        system = payload["messages"][0]["content"]
        if DETECT_MARKER in system:
            content = self.detected_language
        elif SUMMARY_MARKER in system:
            content = self.summary
        elif REVISION_MARKER in system:
            content = self.revision
        elif REVIEW_MARKER in system:
            content = self.review
        elif BACK_TRANSLATION_MARKER in system:
            content = self.back_translation
        else:
            content = self.translation
        return JSONResponse(completion(content, model=payload["model"], usage=self.usage))

    def http_client(self) -> httpx.AsyncClient:
        """An httpx client whose every request lands on this server, whatever the host."""
        server = self

        class RecordingTransport(httpx.ASGITransport):
            async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
                server.timeouts.append(request.extensions.get("timeout", {}))
                return await super().handle_async_request(request)

        return httpx.AsyncClient(transport=RecordingTransport(app=self.app))


def raising_client(exc_factory: Callable[[httpx.Request], Exception]) -> httpx.AsyncClient:
    """An httpx client whose transport raises the given exception (timeouts, refused connections)."""
    def handler(request: httpx.Request) -> httpx.Response:
        raise exc_factory(request)

    return httpx.AsyncClient(transport=httpx.MockTransport(handler))
