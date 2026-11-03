"""Tests for the file limits: size while reading, format detection, decoding, segments."""
import asyncio

import pytest

from llm_translate.formats.limits import check_segments, decode_text, detect_format, read_limited
from llm_translate.utils.config import DEFAULT_MAX_FILE_BYTES, load_llm_settings
from llm_translate.utils.exceptions import ErrorType, TranslationError


class Upload:
    """A stand-in upload that counts the bytes handed out."""

    def __init__(self, size):
        self.remaining = size
        self.served = 0

    async def read(self, n):
        n = min(n, self.remaining)
        self.remaining -= n
        self.served += n
        return b"a" * n


def run(coro):
    return asyncio.run(coro)


def test_file_size_setting():
    assert load_llm_settings({}).max_file_bytes == DEFAULT_MAX_FILE_BYTES == 10 * 1024 * 1024
    assert load_llm_settings({"LLM_MAX_FILE_BYTES": "100"}).max_file_bytes == 100
    for bad in ("0", "-1", "big"):
        with pytest.raises(ValueError, match="LLM_MAX_FILE_BYTES"):
            load_llm_settings({"LLM_MAX_FILE_BYTES": bad})


def test_file_at_limit_is_read_whole():
    assert len(run(read_limited(Upload(1000).read, 1000, chunk_bytes=64))) == 1000


def test_file_over_limit_is_rejected_without_reading_it_whole():
    upload = Upload(50 * 1024 * 1024)
    with pytest.raises(TranslationError) as info:
        run(read_limited(upload.read, 1000, chunk_bytes=64))
    assert info.value.status_code == 413
    assert info.value.error_type == ErrorType.PAYLOAD_TOO_LARGE
    assert "LLM_MAX_FILE_BYTES" in info.value.message
    assert upload.served == 1001


def test_sync_reader_is_accepted():
    import io

    assert run(read_limited(io.BytesIO(b"abc").read, 10)) == b"abc"


@pytest.mark.parametrize("name,expected", [
    ("a.json", "json"), ("a.YAML", "yaml"), ("a.yml", "yaml"), ("a.po", "po"),
    ("a.md", "markdown"), ("a.markdown", "markdown"), ("a.html", "html"), ("a.htm", "html"),
    ("a.srt", "srt"), ("dir\\sub.b.SRT", "srt"),
])
def test_detect_format(name, expected):
    assert detect_format(name) == expected


@pytest.mark.parametrize("name", ["a.exe", "noext", "", ".json.bak", "../etc/passwd"])
def test_unsupported_format_is_400(name):
    with pytest.raises(TranslationError) as info:
        detect_format(name)
    assert info.value.status_code == 400
    assert info.value.error_type == ErrorType.BAD_REQUEST
    assert name not in info.value.message or name == ""


def test_decode_text():
    assert decode_text("héllo".encode("utf-8")) == "héllo"
    assert decode_text(b"\xef\xbb\xbfhi") == "hi"


@pytest.mark.parametrize("content", [b"", b"  \n", b"\x00\x01binary", b"\xff\xfe\xfa"])
def test_malformed_file_is_400(content):
    with pytest.raises(TranslationError) as info:
        decode_text(content)
    assert info.value.status_code == 400


def test_segments_within_limits_pass():
    check_segments(["a", "bb"], max_chars=2, max_segments=2)


def test_too_many_segments_is_413():
    with pytest.raises(TranslationError) as info:
        check_segments(["a", "b", "c"], max_chars=10, max_segments=2)
    assert info.value.status_code == 413
    assert "LLM_MAX_SEGMENTS" in info.value.message


def test_long_segment_is_413_and_named():
    with pytest.raises(TranslationError) as info:
        check_segments(["a", "bbbb"], max_chars=3, max_segments=5)
    assert info.value.status_code == 413
    assert "Segment 2" in info.value.message and "LLM_SEGMENT_MAX_CHARS" in info.value.message
