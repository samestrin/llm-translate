"""
The eval table (docs/evaluation.md) matches the committed results file, the file example (docs/api.md) runs and
returns what it shows, and the root README's quick-start commands name files that exist.
"""
import json
import re
import shlex
from pathlib import Path

import yaml

from tests.integration.test_v1_api import client, server  # noqa: F401  (fixtures)

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


def test_file_example_runs_and_returns_what_it_shows(server, client, monkeypatch):  # noqa: F811
    section = _section("Translate a file", "docs/api.md")
    command = shlex.split(re.search(r"```bash\n(.*?)```", section, re.S).group(1).replace("\\\n", " "))
    fields = dict(arg.split("=", 1) for arg in command if arg.startswith(("file=", "from_lang=", "to_lang=")))
    source = json.loads(re.search(r"containing `(\{.*?\})`", section).group(1))
    documented = json.loads(re.search(r"```json\n(.*?)```", section, re.S).group(1))
    translated = json.loads(documented["content"])
    mask = lambda text: text.replace("{name}", "⟦0⟧")  # noqa: E731  (the model sees placeholders masked)
    by_source = {mask(source[key]): mask(translated[key]) for key in source}

    monkeypatch.setenv("LLM_TRANSLATE_MODEL", documented["report"]["model"])
    server.usage = {"prompt_tokens": 60, "completion_tokens": 9, "total_tokens": 69}
    server.respond = lambda payload: next(
        (text for src, text in by_source.items() if src in payload["messages"][-1]["content"]), "?"
    )
    response = client.post(
        "/v1/translate/file",
        files={"file": (fields["file"].lstrip("@"), json.dumps(source), "application/json")},
        data={"from_lang": fields["from_lang"], "to_lang": fields["to_lang"]},
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert json.loads(body["content"]) == translated
    assert {k: body[k] for k in ("format", "from_lang", "to_lang")} == {k: documented[k] for k in ("format", "from_lang", "to_lang")}
    assert body["report"]["segments"] == documented["report"]["segments"]
    assert body["report"]["model"] == documented["report"]["model"]
    assert set(body["report"]) == set(documented["report"])


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


def test_screenshot_the_readme_shows_is_committed():
    assert "docs/images/translation-page.png" in README
    for name in ("translation-page.png", "translation-page-dark.png", "translation-page-phone.png"):
        assert f"docs/images/{name}" in README
        assert (REPO / "docs/images" / name).stat().st_size > 10_000
    assert (REPO / "frontend/scripts/screenshot.mjs").exists()
