"""
The eval table (docs/evaluation.md) matches the committed results file, the API guide points to the live
reference without duplicating it, and the root README's quick-start commands name files that exist.
"""
import json
import re
import subprocess
from pathlib import Path

import yaml

REPO = Path(__file__).resolve().parents[3]
README = (REPO / "README.md").read_text()


def _section(title, path="README.md"):
    """The text under the heading `title` (any level) in `path`, up to the next heading."""
    text = "\n" + (REPO / path).read_text()
    body = re.split(rf"\n#{{1,3}} {re.escape(title)}\n", text, maxsplit=1)[1]
    return body.split("\n## ", 1)[0].split("\n### ", 1)[0]


def _pct(value):
    return "n/a" if value is None else f"{value * 100:.0f}%"


def _expected_rows(result):
    return [
        [code, review, f"{r['chrf']:.1f}", _pct(r["placeholder_integrity"]), f"{r['glossary_hits']}/{r['glossary_terms']}",
         _pct(r["flag_rate"]), str(r["tokens"])]
        for code, by_review in result["languages"].items() for review, r in by_review.items()
    ]


def _table_rows(section):
    lines = [line for line in section.splitlines() if line.startswith("|")]
    return [[cell.strip() for cell in line.strip("|").split("|")] for line in lines[2:]]


def test_eval_table_matches_the_committed_results_file():
    committed = sorted((REPO / "evals" / "results").glob("????-??-??.json"))
    assert committed, "no committed results file"
    result = json.loads(committed[-1].read_text())
    section = _section("Evaluation", "docs/evaluation.md")

    assert _table_rows(section) == _expected_rows(result)
    assert committed[-1].name in section
    for model in result["models"]:
        assert f"**{model}**" in section


def test_api_guide_is_a_short_pointer_with_access_details_and_the_ci_example():
    guide = (REPO / "docs/api.md").read_text()
    headings = re.findall(r"^#{1,3} (.+)$", guide, re.M)
    assert headings == ["HTTP API", "Model access for a public demo", "Translate an i18n file in CI"]
    # Host-relative links only resolve on the review host (and 404 on GitHub), so the
    # guide names the backend paths and the demo compose's URLs instead.
    assert not re.search(r"\]\(/", guide)
    for url in ["http://localhost:8000/docs", "http://localhost:8000/openapi.json"]:
        assert url in guide


def test_api_guide_names_each_endpoint_once():
    guide = (REPO / "docs/api.md").read_text()
    endpoints = re.findall(
        r"(?<![\w/])/(?:api/(?:docs|openapi\.json)|v1/(?:translate(?:/file)?|speak)|translate|speak)\b",
        guide,
    )
    assert len(endpoints) == len(set(endpoints))


def test_no_markdown_link_points_to_a_removed_api_guide_anchor():
    tracked_markdown = subprocess.check_output(
        ["git", "ls-files", "*.md"], cwd=REPO, text=True
    ).splitlines()
    for relative_path in tracked_markdown:
        text = (REPO / relative_path).read_text()
        assert not re.search(r"\[[^]]*\]\([^)]*api\.md#[^)]+\)", text), relative_path


def test_ci_example_is_a_workflow_that_posts_the_file_endpoint():
    block = re.search(r"```yaml\n(.*?)```", _section("Translate an i18n file in CI", "docs/api.md"), re.S).group(1)
    workflow = yaml.safe_load(block)
    steps = workflow["jobs"]["translate"]["steps"]
    script = "\n".join(step.get("run", "") for step in steps)

    assert "/v1/translate/file" in script and "jq -r .content" in script


def test_quick_start_is_clone_and_compose_up_with_no_copy_steps():
    quick = _section("Quick start")
    commands = re.search(r"```bash\n(.*?)```", quick, re.S).group(1).splitlines()
    assert commands[-1] == "docker compose up --build"
    assert "http://localhost:3000" in quick and "LLM_API_KEY" in quick
    assert "cp " not in quick
    compose = yaml.safe_load((REPO / "docker-compose.yml").read_text())["services"]
    # backend/.env is optional (EST-5687), so a fresh clone starts without it.
    assert compose["backend"]["env_file"][0] == {"path": "./backend/.env", "required": False}


def test_public_demo_documentation_names_the_complete_access_contract():
    readme = _section("Public demo")
    guide = (REPO / "docs/api.md").read_text()
    backend = (REPO / "backend/README.md").read_text()
    changelog = (REPO / "CHANGELOG.md").read_text()

    assert "PUBLIC_DEMO" in readme
    assert "X-Demo-Code" in readme
    for header in ("X-Model-Preset", "X-Model-Key", "X-Demo-Code"):
        assert header in guide
    for route in ("/v1/translate", "/v1/translate/file", "/v1/speak", "/translate", "/speak", "/v1/presets"):
        assert route in guide
    assert "speech_not_available" in guide
    for message in ("The key was rejected", "This demo code is used up or expired", "rate limiting this key"):
        assert message in guide

    for setting in ("PUBLIC_DEMO", "DEMO_GATEWAY_URL", "DEMO_TRANSLATE_MODEL", "DEMO_REVIEW_MODEL", "DEMO_TTS_MODEL"):
        assert setting in backend
    assert "scripts/check_presets.py" in backend
    for key in ("OPENAI_API_KEY", "OPENROUTER_API_KEY", "SYNTHETIC_API_KEY", "ALIBABA_API_KEY", "DEMO_CODE"):
        assert key in backend
    assert "never runs in CI" in backend
    assert "epic 8" in changelog


def test_screenshot_the_readme_shows_is_committed():
    assert "docs/images/translation-page.png" in README
    for name in ("translation-page.png", "translation-page-dark.png", "translation-page-phone.png"):
        assert f"docs/images/{name}" in README
        assert (REPO / "docs/images" / name).stat().st_size > 10_000
    assert (REPO / "frontend/scripts/screenshot.mjs").exists()
