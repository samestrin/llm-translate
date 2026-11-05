"""
The eval runner: translate the committed eval set and score it.

    python evals/run.py --api http://localhost:8000   # a running backend on a real endpoint
    python evals/run.py --fake                        # in-process, against the fake OpenAI server (CI)

For each language it translates the app strings (JSON), the Markdown page and the SRT file with
`review` off and on, and prints one table: chrF against the reference translation, placeholder
integrity, glossary hits and flag rate. It writes `evals/results/<date>.json` with the model names;
the endpoint URL and key are never written.
"""
import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path
from typing import Callable, Dict, List, Optional

EVALS = Path(__file__).parent
BACKEND = EVALS.parent / "backend"
LANGUAGES = {"es": "Spanish", "fr": "French", "ja": "Japanese", "pt-BR": "Brazilian Portuguese"}
FILES = {"strings": "strings.{}.json", "page": "page.{}.md", "subtitles": "subtitles.{}.srt"}
SOURCE_FILES = {"strings": "strings.en.json", "page": "page.en.md", "subtitles": "subtitles.en.srt"}
PLACEHOLDER = re.compile(r"\{[^{}]*\}|%(?:\d+\$)?[sdif]|\$\([^)]*\)|\$\{[^}]*\}")

Post = Callable[..., dict]
_patchers: list = []


def chrf(hypotheses: List[str], references: List[str]) -> float:
    """Corpus chrF (0-100) of the hypotheses against one reference each."""
    from sacrebleu.metrics import CHRF
    return CHRF().corpus_score(hypotheses, [references]).score


def placeholders(text: str) -> List[str]:
    return sorted(PLACEHOLDER.findall(text))


def placeholder_integrity(sources: List[str], translations: List[str]) -> Optional[float]:
    """Share (0-1) of segments carrying a placeholder whose translation keeps exactly the same ones; None if none do."""
    pairs = [(s, t) for s, t in zip(sources, translations) if placeholders(s)]
    if not pairs:
        return None
    return sum(placeholders(s) == placeholders(t) for s, t in pairs) / len(pairs)


def glossary_hits(glossary: List[dict], source: str, misses: List[dict]) -> Optional[tuple]:
    """(hits, applicable) for a source text: applicable terms occur in it, a hit is one the API did not report missed."""
    lowered = source.lower()
    terms = [g for g in glossary if g["source_term"].lower() in lowered]
    missed = {m["term"].lower() for m in misses}
    return sum(g["source_term"].lower() not in missed for g in terms), len(terms)


def _segments(kind: str, text: str) -> List[str]:
    """Comparable units of a file: JSON values in key order, or the whole text."""
    if kind == "strings":
        data = json.loads(text)
        return [data[k] for k in sorted(data)]
    return [text]


def run_language(post: Post, code: str, review: str) -> dict:
    folder = EVALS / code
    lang = LANGUAGES[code]
    hyps: List[str] = []
    refs: List[str] = []
    src_strings: List[str] = []
    out_strings: List[str] = []
    flags = segments = 0
    models = set()
    tokens = 0
    for kind, name in FILES.items():
        source = (folder / SOURCE_FILES[kind]).read_text(encoding="utf-8")
        reference = (folder / name.format(code)).read_text(encoding="utf-8")
        body = post("/v1/translate/file", data={"from_lang": "English", "to_lang": lang, "review": review},
                    files={"file": (SOURCE_FILES[kind], source.encode("utf-8"))})
        out = body["content"]
        if kind == "strings":
            src_strings = _segments(kind, source)
            out_strings = _segments(kind, out)
            hyps += out_strings
            refs += _segments(kind, reference)
        else:
            hyps.append(out)
            refs.append(reference)
        report = body["report"]
        segments += report["segments"]
        tokens += report["usage"]["total_tokens"]
        if report.get("model"):
            models.add(report["model"])
        for step in (report.get("review") or {}).get("steps", []):
            if step.get("model"):
                models.add(step["model"])
        flags += len((report.get("review") or {}).get("flags", []))
    glossary = json.loads((folder / "glossary.json").read_text(encoding="utf-8"))
    page = (folder / SOURCE_FILES["page"]).read_text(encoding="utf-8")
    text = post("/v1/translate", json={"text": page, "from_lang": "English", "to_lang": lang, "glossary": glossary})
    hits, applicable = glossary_hits(glossary, page, text["glossary_misses"])
    return {
        "chrf": chrf(hyps, refs),
        "placeholder_integrity": placeholder_integrity(src_strings, out_strings),
        "glossary_hits": hits,
        "glossary_terms": applicable,
        "flags": flags if review == "on" else None,
        "segments": segments,
        "flag_rate": flags / segments if review == "on" and segments else None,
        "tokens": tokens,
        "models": sorted(models | ({text["model"]} if text.get("model") else set())),
    }


def run(post: Post, languages: List[str]) -> dict:
    results: Dict[str, dict] = {}
    for code in languages:
        results[code] = {review: run_language(post, code, review) for review in ("off", "on")}
    models = sorted({m for lang in results.values() for r in lang.values() for m in r["models"]})
    return {"date": date.today().isoformat(), "models": models, "languages": results}


def _pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value * 100:.0f}%"


def table(result: dict) -> str:
    rows = [("Language", "Review", "chrF", "Placeholders", "Glossary", "Flag rate", "Tokens")]
    for code, by_review in result["languages"].items():
        for review, r in by_review.items():
            glossary = f"{r['glossary_hits']}/{r['glossary_terms']}"
            rows.append((code, review, f"{r['chrf']:.1f}", _pct(r["placeholder_integrity"]), glossary,
                         _pct(r["flag_rate"]), str(r["tokens"])))
    widths = [max(len(row[i]) for row in rows) for i in range(len(rows[0]))]
    lines = ["  ".join(cell.ljust(w) for cell, w in zip(row, widths)).rstrip() for row in rows]
    lines.insert(1, "  ".join("-" * w for w in widths))
    return "\n".join(lines + ["", "Models: " + ", ".join(result["models"])])


def api_post(base_url: str) -> Post:
    import httpx

    def post(path: str, **kwargs) -> dict:
        response = httpx.post(base_url.rstrip("/") + path, timeout=600, **kwargs)
        response.raise_for_status()
        return response.json()
    return post


def fake_post(review: Optional[str] = None) -> Post:
    """
    An in-process backend whose model endpoint is the fake OpenAI server; nothing leaves the process.

    `review` is what the fake reviewer answers (default: no errors).
    """
    import logging
    import os
    from unittest.mock import patch

    import httpx
    os.environ.update({"LLM_BASE_URL": "http://fake.invalid/v1", "LLM_TRANSLATE_MODEL": "fake-translate-model"})
    for var in ("AI_SOURCE", "LLM_API_KEY", "LLM_REVIEW_MODEL", "LLM_CACHE_SIZE"):
        os.environ.pop(var, None)
    sys.path.insert(0, str(BACKEND))
    logging.disable(logging.INFO)
    with patch("dotenv.load_dotenv"):
        from fastapi.testclient import TestClient
        from main import app
        from tests.fake_openai_server import FakeOpenAIServer

    segment = re.compile(r'Translate the following text from .+? to .+?: "(.*)"\Z', re.DOTALL)
    fake = FakeOpenAIServer()
    if review is not None:
        fake.review = review

    def respond(payload):
        system = payload["messages"][0]["content"]
        for marker, answer in (("language identification", fake.detected_language),
                               ("summarize documents", fake.summary), ("review a translation", fake.review),
                               ("back-translate", fake.back_translation), ("revise a translation", fake.revision)):
            if marker in system:
                return answer
        found = segment.search(payload["messages"][-1]["content"])
        return f"ES {found.group(1)}" if found else fake.translation

    fake.respond = respond
    if _patchers:
        _patchers.pop().stop()  # a second fake replaces the first, not wraps it
    real = httpx.AsyncClient
    patcher = patch("llm_translate.services.llm_client.httpx.AsyncClient",
                    lambda **kw: real(transport=httpx.ASGITransport(app=fake.app), **kw))
    patcher.start()
    _patchers.append(patcher)
    client = TestClient(app)

    def post(path: str, **kwargs) -> dict:
        response = client.post(path, **kwargs)
        response.raise_for_status()
        return response.json()
    return post


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    where = parser.add_mutually_exclusive_group(required=True)
    where.add_argument("--api", metavar="URL", help="base URL of a running llm-translate backend")
    where.add_argument("--fake", action="store_true", help="run in-process against the fake OpenAI server")
    parser.add_argument("--languages", nargs="+", choices=list(LANGUAGES), default=list(LANGUAGES))
    parser.add_argument("--out", type=Path, default=EVALS / "results", help="folder for the dated results file")
    parser.add_argument("--no-write", action="store_true", help="print the table only")
    args = parser.parse_args(argv)

    result = run(fake_post() if args.fake else api_post(args.api), args.languages)
    print(table(result))
    if not args.no_write:
        args.out.mkdir(parents=True, exist_ok=True)
        path = args.out / f"{result['date']}{'-fake' if args.fake else ''}.json"
        path.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
