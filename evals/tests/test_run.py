"""The eval runner's scoring helpers, and one full run against the fake OpenAI server."""
import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
import run  # noqa: E402


def test_chrf_is_100_for_an_identical_text_and_lower_for_a_different_one():
    assert run.chrf(["Hola mundo"], ["Hola mundo"]) == pytest.approx(100.0)
    assert run.chrf(["Adiós"], ["Hola mundo"]) < 50


def test_placeholder_integrity_counts_segments_that_keep_the_same_placeholders():
    sources = ["Hello {name}, %d new", "Plain", "Open ${path}"]
    translations = ["Hola {name}, %d nuevos", "Llano", "Abrir {path}"]
    assert run.placeholder_integrity(sources, translations) == 0.5


def test_placeholder_integrity_is_none_when_no_segment_has_one():
    assert run.placeholder_integrity(["Plain"], ["Llano"]) is None


def test_glossary_hits_counts_applicable_terms_the_api_did_not_report_missed():
    glossary = [{"source_term": "branch", "target_term": "rama"}, {"source_term": "tag", "target_term": "etiqueta"},
                {"source_term": "stash", "target_term": "alijo"}]
    misses = [{"term": "tag", "expected": "etiqueta"}]
    assert run.glossary_hits(glossary, "A Branch and a tag", misses) == (1, 2)


def test_a_run_against_the_fake_server_prints_the_table_and_writes_a_results_file_without_endpoint_or_key(
        tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("LLM_API_KEY", "sk-secret-key")
    assert run.main(["--fake", "--languages", "es", "ja", "--out", str(tmp_path)]) == 0

    printed = capsys.readouterr().out
    assert "chrF" in printed and "Flag rate" in printed and "fake-translate-model" in printed
    [file] = tmp_path.glob("*.json")
    text = file.read_text(encoding="utf-8")
    data = json.loads(text)
    assert set(data["languages"]) == {"es", "ja"}
    assert set(data["languages"]["es"]) == {"off", "on"}
    assert data["languages"]["es"]["off"]["placeholder_integrity"] == 1.0
    assert data["languages"]["es"]["on"]["flag_rate"] == 0
    assert data["models"] == ["fake-translate-model"]
    assert "fake.invalid" not in text and "sk-secret-key" not in text and "http" not in text


def test_glossary_hits_pins_hits_against_misses_with_unequal_counts():
    glossary = [{"source_term": "branch", "target_term": "rama"}, {"source_term": "tag", "target_term": "etiqueta"},
                {"source_term": "commit", "target_term": "confirmación"}]
    source = "branch tag commit"
    assert run.glossary_hits(glossary, source, [{"term": "tag", "expected": "etiqueta"}]) == (2, 3)
    assert run.glossary_hits(glossary, source, []) == (3, 3)


def test_flag_rate_counts_review_flags_over_segments():
    result = run.run_language(run.fake_post(review="not json"), "es", "on")

    assert result["flags"] > 0
    assert result["flag_rate"] == pytest.approx(result["flags"] / result["segments"])
    off = run.run_language(run.fake_post(review="not json"), "es", "off")
    assert off["flags"] is None and off["flag_rate"] is None
