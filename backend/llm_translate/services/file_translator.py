"""
File mode: translate an uploaded file segment by segment and write it back
with the same structure.

The file is read within `LLM_MAX_FILE_BYTES`, its format is named by its
extension, and its segments (values, text nodes or cues) are checked against
`LLM_SEGMENT_MAX_CHARS` and `LLM_MAX_SEGMENTS` before any model is called.
Each segment's placeholders are masked before the model and checked after; if
any segment fails, the whole file fails and every failed segment is listed.

Segments are translated one per call, never merged, but a file of more than one
segment is summarized first (its key terms and names, with the translation to
use for each), and every segment is sent with that summary and the segments
around it as read-only context, so a name or term reads the same in every cue.
"""
import asyncio
import re
from dataclasses import dataclass
from typing import Callable, List, Optional, Tuple

from llm_translate.formats import html_file, json_format, markdown_file, po_format, srt, yaml_format
from llm_translate.formats.limits import check_segments, decode_text, detect_format
from llm_translate.formats.placeholders import ProtectedText, Segment, protect, restore
from llm_translate.utils.exceptions import TranslationError

from llm_translate.review import ReviewReport, build_report, check_segments as review_segments

from .llm_client import Usage
from .llm_translator import AUTO_DETECT, LLMTranslator, Translation

_MASK = re.compile(r"⟦\d+⟧")
_STRUCTURED = {"json": json_format, "yaml": yaml_format, "po": po_format}
_MARKUP = {"markdown": markdown_file, "html": html_file}
# How many segments before and after the one being translated are sent as context.
NEIGHBOURS = 2


@dataclass
class ParsedFile:
    """
    A file's segments and a way to write it back.

    Attributes:
        labels: What names each segment in an error: its key for JSON, YAML and PO,
            its number (from 1) for Markdown, HTML and SRT.
        texts: Each segment's source text, in file order.
        render: Builds the file from one translation per segment.
    """
    labels: List[Segment]
    texts: List[str]
    render: Callable[[List[str]], str]


@dataclass
class FileTranslation:
    """A translated file and its report: the segment count, the model and the tokens spent."""
    content: str
    file_format: str
    segments: int
    model: Optional[str]
    usage: Usage
    review: Optional[ReviewReport] = None


def parse_file(file_format: str, text: str, srt_max_line_chars: int) -> ParsedFile:
    """
    Split a file of a known format into segments.

    Raises:
        TranslationError: 400 if the file is malformed.
    """
    if file_format in _STRUCTURED:
        document = _STRUCTURED[file_format].parse(text)
        ids = [segment.id for segment in document.segments]
        return ParsedFile(
            labels=list(ids),
            texts=[segment.text for segment in document.segments],
            render=lambda translations: document.render(dict(zip(ids, translations))),
        )
    if file_format in _MARKUP:
        document = _MARKUP[file_format].parse(text)
        return ParsedFile(
            labels=list(range(1, len(document.segments) + 1)), texts=list(document.segments), render=document.render
        )
    cues = srt.parse(text)
    return ParsedFile(
        labels=list(range(1, len(cues) + 1)),
        texts=[cue.text for cue in cues],
        render=lambda translations: srt.render(cues, translations, srt_max_line_chars),
    )


PLACEHOLDERS_LOST = "revision lost or changed a placeholder; the earlier translation is kept"


def _keeps_placeholders(source: ProtectedText, revised: str) -> bool:
    """Whether a revised segment has exactly the source's placeholders (order may differ by language)."""
    return sorted(protect(revised).placeholders) == sorted(source.placeholders)


def _has_words(masked: str) -> bool:
    """A segment that is only placeholders, digits and punctuation has nothing to translate."""
    return any(char.isalpha() for char in _MASK.sub("", masked))


async def translate_file(
    translator: LLMTranslator, filename: str, content: bytes, from_lang: str, to_lang: str,
    review: bool = False
) -> FileTranslation:
    """
    Translate an uploaded file and keep its structure and placeholders.

    `from_lang` may be "Auto-detect": one detection call on the file's first
    segments names the source language for every segment, and counts in `usage`.
    A file of more than one segment to translate costs one more call, the summary
    every segment gets as context; it counts in `usage` too.

    Args:
        translator (LLMTranslator): The translator; its client's settings give the limits.
        filename (str): The uploaded file's name; only its extension is used, never echoed.
        content (bytes): The file, already read within `LLM_MAX_FILE_BYTES`.
        from_lang (str): Source language, or "Auto-detect".
        to_lang (str): Target language.
        review (bool): Run the review pass on every translated segment; flagged segments
            keep their best translation and are listed in the report.

    Returns:
        FileTranslation: The file and its report.

    Raises:
        TranslationError: 400 if the file is unsupported, unreadable or malformed;
            413 if it has too many or too long segments; if any segment fails
            (a lost placeholder or a model error), one error that lists every
            failed segment in `segment_errors`, with the first one's status;
            if the summary call fails, its error, and no segment is sent.
    """
    settings = translator.client.settings
    file_format = detect_format(filename)
    parsed = parse_file(file_format, decode_text(content), settings.srt_max_line_chars)
    check_segments(parsed.texts, settings.segment_max_chars, settings.max_segments)

    protected = [protect(text) for text in parsed.texts]
    pending = [i for i, masked in enumerate(protected) if _has_words(masked.text)]
    # a mask can be longer than its placeholder, and the masked text is what the model is sent
    sent = [masked.text if i in pending else "" for i, masked in enumerate(protected)]
    check_segments(sent, settings.segment_max_chars, settings.max_segments, masked=True)
    model, usage = None, Usage()
    if pending and from_lang.strip().lower() == AUTO_DETECT:
        sample = "\n\n".join(parsed.texts[i] for i in pending)[:settings.segment_max_chars]
        from_lang, model, usage = await translator.detect_language(sample)
    # a file already in the target language is not translated, so it is not summarized, reviewed or revised
    same = from_lang.strip().lower() == to_lang.strip().lower()
    context = {i: [] for i in pending}
    if len(pending) > 1 and not same:
        summary = await translator.summarize("\n\n".join(parsed.texts[i] for i in pending), from_lang, to_lang)
        model, usage = model or summary.model, usage + summary.usage
        context = {i: _segment_context(summary.content, parsed.texts, pending, at) for at, i in enumerate(pending)}

    async def translate(i: int) -> Tuple[str, Translation]:
        masked = protected[i].text
        # the model's answer loses surrounding whitespace, so the source's is put back
        lead = masked[:len(masked) - len(masked.lstrip())]
        trail = masked[len(masked.rstrip()):]
        result = await translator.translate_structured(masked.strip(), from_lang, to_lang, context=context[i])
        return restore(protected[i], lead + result.text.strip() + trail, parsed.labels[i]), result

    results = await asyncio.gather(*(translate(i) for i in pending), return_exceptions=True)
    for result in results:
        if isinstance(result, BaseException) and not isinstance(result, TranslationError):
            raise result
    failed = [(i + 1, result) for i, result in zip(pending, results) if isinstance(result, TranslationError)]
    if failed:
        raise _segments_failed(failed, len(parsed.texts))

    translations = list(parsed.texts)
    for i, (text, result) in zip(pending, results):
        translations[i] = text
        model = model or result.model
        usage = usage + result.usage
    report = None
    if review:
        todo = [] if same else pending
        checked = await review_segments(
            translator.client, [parsed.texts[i] for i in todo], [translations[i] for i in todo], from_lang, to_lang,
        )
        for i, segment in zip(todo, checked):
            if segment.revised and not _keeps_placeholders(protected[i], segment.translation):
                segment.translation, segment.revised = translations[i], False
                segment.flag = segment.flag or PLACEHOLDERS_LOST
            translations[i] = segment.translation
        report = build_report(
            checked, [parsed.labels[i] for i in todo], [parsed.texts[i] for i in todo], model, usage
        )
        usage = report.usage
    return FileTranslation(
        content=parsed.render(translations), file_format=file_format, segments=len(parsed.texts),
        model=model, usage=usage, review=report,
    )


def _segment_context(summary: str, texts: List[str], pending: List[int], at: int) -> List[str]:
    """
    The read-only context for `pending[at]`: the file's summary, then up to `NEIGHBOURS`
    segments to translate on each side, as the source has them.
    """
    def quoted(indices: List[int]) -> str:
        return "\n".join(f'"{texts[i]}"' for i in indices)

    before, after = pending[max(0, at - NEIGHBOURS):at], pending[at + 1:at + 1 + NEIGHBOURS]
    blocks = [f"Summary of the whole file (context only, do not translate it):\n{summary}"]
    if before:
        blocks.append(f"Earlier segments (context only, do not translate them):\n{quoted(before)}")
    if after:
        blocks.append(f"Later segments (context only, do not translate them):\n{quoted(after)}")
    return blocks


def _segments_failed(failed: List[Tuple[int, TranslationError]], total: int) -> TranslationError:
    """One error for the whole file that lists every failed segment; it takes the first one's status."""
    listed = "; ".join(f"segment {n} of {total}: {error.message}" for n, error in failed)
    first = failed[0][1]
    return TranslationError(
        message=f"{len(failed)} of {total} segments failed, so the file was not translated ({listed})",
        error_type=first.error_type,
        status_code=first.status_code,
        segment_errors=[
            {"segment": n, "type": error.error_type.value, "message": error.message} for n, error in failed
        ],
    )
