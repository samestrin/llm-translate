"""
The eval set in `evals/`: every file has a source and a license in `evals/SOURCES.md`, and each language has its pairs.

Each language folder holds an English source and its reference translation for
app strings (JSON), a Markdown page and an SRT file, plus a glossary. The
glossary terms must occur in the texts, or a glossary hit could never be scored.
"""
import json
import re
from pathlib import Path

import pytest

from llm_translate.services.glossary import GlossaryEntry

EVALS = Path(__file__).resolve().parents[3] / "evals"
SOURCES = EVALS / "SOURCES.md"
LANGUAGES = ["es", "fr", "ja", "pt-BR"]
KINDS = [("strings", "json"), ("page", "md"), ("subtitles", "srt")]
# Free licenses only: nothing non-commercial (NC) or no-derivatives (ND).
LICENSES = {"MIT", "CC-BY-SA-2.5", "CC-BY-3.0"}
ROW = re.compile(r"^\|\s*`(?P<file>[^`]+)`\s*\|(?P<source>[^|]*)\|(?P<license>[^|]*)\|")


def _rows():
    """{file: (source, license)} from the table rows of SOURCES.md."""
    rows = {}
    for line in SOURCES.read_text(encoding="utf-8").splitlines():
        m = ROW.match(line)
        if m:
            assert m["file"] not in rows, f"{m['file']} is listed twice"
            rows[m["file"]] = (m["source"].strip(), m["license"].strip().strip("`"))
    return rows


def _eval_files():
    return sorted(
        p.relative_to(EVALS).as_posix() for p in EVALS.rglob("*") if p.is_file() and p != SOURCES
    )


def _pair(lang, kind, ext):
    return EVALS / lang / f"{kind}.en.{ext}", EVALS / lang / f"{kind}.{lang}.{ext}"


def test_every_file_has_a_source_and_a_free_license():
    rows = _rows()
    files = _eval_files()
    assert files, "evals/ has no files"
    assert sorted(rows) == files
    for file, (source, license_) in rows.items():
        assert source, f"{file} has no source"
        assert license_ in LICENSES, f"{file}: license {license_!r}"


@pytest.mark.parametrize("lang", LANGUAGES)
def test_each_language_has_its_pairs_and_a_glossary(lang):
    for kind, ext in KINDS:
        for path in _pair(lang, kind, ext):
            assert path.read_text(encoding="utf-8").strip(), path
    assert (EVALS / lang / "glossary.json").is_file()


@pytest.mark.parametrize("lang", LANGUAGES)
def test_string_references_have_the_source_keys_and_placeholders(lang):
    source, reference = (json.loads(p.read_text(encoding="utf-8")) for p in _pair(lang, "strings", "json"))
    assert list(reference) == list(source)
    for key, text in source.items():
        assert sorted(re.findall(r"\{\d+\}", reference[key])) == sorted(re.findall(r"\{\d+\}", text)), key


@pytest.mark.parametrize("lang", LANGUAGES)
def test_subtitle_references_keep_the_source_cues(lang):
    source, reference = (p.read_text(encoding="utf-8") for p in _pair(lang, "subtitles", "srt"))
    timings = re.compile(r"^\d\d:\d\d:\d\d,\d{3} --> \d\d:\d\d:\d\d,\d{3}$", re.M)
    assert timings.findall(reference) == timings.findall(source)
    assert len(timings.findall(source)) > 0
    assert "\r" not in source + reference


@pytest.mark.parametrize("lang", LANGUAGES)
def test_glossary_terms_occur_in_the_sources_and_references(lang):
    entries = [GlossaryEntry(**e) for e in json.loads((EVALS / lang / "glossary.json").read_text(encoding="utf-8"))]
    assert entries
    sources = " ".join(_pair(lang, k, e)[0].read_text(encoding="utf-8") for k, e in KINDS).lower()
    references = " ".join(_pair(lang, k, e)[1].read_text(encoding="utf-8") for k, e in KINDS).lower()
    for entry in entries:
        expected = entry.source_term if entry.do_not_translate else entry.target_term
        assert entry.source_term.lower() in sources, entry.source_term
        assert expected.lower() in references, f"{entry.source_term} -> {expected}"
