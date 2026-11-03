"""
Limits on an uploaded file: size while reading, format detection, text
decoding and segment size and count.

Every rejection is a `TranslationError`: 413 for anything over a limit, 400 for
a file that is unsupported or cannot be read. Messages never include the file
name or any server path.
"""
import posixpath
from typing import Awaitable, Callable, List, Union

from llm_translate.utils.exceptions import ErrorType, TranslationError

# Bytes asked of the upload per read; the size check runs after each one.
CHUNK_BYTES = 64 * 1024

# File extension -> format name.
FORMATS = {
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".po": "po",
    ".md": "markdown",
    ".markdown": "markdown",
    ".html": "html",
    ".htm": "html",
    ".srt": "srt",
}


def _bad_request(message: str) -> TranslationError:
    return TranslationError(message=message, error_type=ErrorType.BAD_REQUEST, status_code=400)


def _too_large(message: str) -> TranslationError:
    return TranslationError(message=message, error_type=ErrorType.PAYLOAD_TOO_LARGE, status_code=413)


async def read_limited(
    read: Callable[[int], Union[bytes, Awaitable[bytes]]],
    max_bytes: int,
    chunk_bytes: int = CHUNK_BYTES,
) -> bytes:
    """
    Read an upload in chunks, stopping as soon as it exceeds `max_bytes`.

    The upload is never read whole first: at most `max_bytes` plus one chunk is
    held, and nothing more is read once the limit is passed.

    Args:
        read: The upload's `read(size)`, sync or async (e.g. `UploadFile.read`).
        max_bytes (int): Largest file, in bytes (`LLM_MAX_FILE_BYTES`).
        chunk_bytes (int): Bytes asked per read.

    Returns:
        bytes: The whole file.

    Raises:
        TranslationError: 413 if the file is larger than `max_bytes`.
    """
    chunks: List[bytes] = []
    total = 0
    while True:
        chunk = read(min(chunk_bytes, max_bytes + 1 - total))
        if hasattr(chunk, "__await__"):
            chunk = await chunk
        if not chunk:
            return b"".join(chunks)
        total += len(chunk)
        if total > max_bytes:
            raise _too_large(f"The file is larger than LLM_MAX_FILE_BYTES ({max_bytes} bytes) allows.")
        chunks.append(chunk)


def detect_format(filename: str) -> str:
    """
    Name the format of a file from its extension.

    Args:
        filename (str): The uploaded file's name; only its extension is used.

    Returns:
        str: One of `json`, `yaml`, `po`, `markdown`, `html`, `srt`.

    Raises:
        TranslationError: 400 if the extension is missing or not supported.
    """
    extension = posixpath.splitext((filename or "").replace("\\", "/"))[1].lower()
    if extension not in FORMATS:
        supported = ", ".join(sorted(FORMATS))
        raise _bad_request(f"Unsupported file format; the file extension must be one of {supported}.")
    return FORMATS[extension]


def decode_text(content: bytes) -> str:
    """
    Decode an uploaded file as UTF-8 (a leading BOM is dropped).

    Raises:
        TranslationError: 400 if the file is empty, holds NUL bytes (binary) or is not UTF-8.
    """
    if not content.strip():
        raise _bad_request("The file is empty.")
    if b"\x00" in content:
        raise _bad_request("The file is not a text file.")
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError:
        raise _bad_request("The file is not valid UTF-8 text.") from None


def check_segments(segments: List[str], max_chars: int, max_segments: int) -> None:
    """
    Check a file's segments against `LLM_SEGMENT_MAX_CHARS` and `LLM_MAX_SEGMENTS`.

    Unlike a document, a file's segments are fixed by its format (one per
    value, cue or block) and are never merged or split here.

    Raises:
        TranslationError: 413 if there are more than `max_segments` segments or one is
            longer than `max_chars` characters.
    """
    if len(segments) > max_segments:
        raise _too_large(f"The file has {len(segments)} segments, more than LLM_MAX_SEGMENTS ({max_segments}) allows.")
    for number, segment in enumerate(segments, start=1):
        if len(segment) > max_chars:
            raise _too_large(
                f"Segment {number} has {len(segment)} characters, more than LLM_SEGMENT_MAX_CHARS ({max_chars}) allows."
            )
