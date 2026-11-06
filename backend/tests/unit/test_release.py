"""
The release workflow and the Docker build contexts.

`.github/workflows/release.yml` builds the backend and frontend images on every
run, and pushes both to GHCR only for a `v*` tag that equals `__version__`,
after both have built. A pull request or a manual run is the dry run: it builds
and pushes nothing. The version check runs here as the shell the workflow runs.
"""
import subprocess
from pathlib import Path

import pytest
from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = ROOT / ".github" / "workflows" / "release.yml"
IMAGES = ["backend", "frontend"]


@pytest.fixture(scope="module")
def workflow():
    return YAML(typ="safe").load(WORKFLOW.read_text(encoding="utf-8"))


def _steps(job, uses):
    return [s for s in job["steps"] if s.get("uses", "").startswith(uses)]


def _version_step(workflow):
    (step,) = [s for s in workflow["jobs"]["publish"]["steps"] if s.get("id") == "version"]
    return step


def _ignored(path):
    return [
        line.strip()
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]


def test_runs_on_v_tags_pull_requests_and_by_hand(workflow):
    on = workflow["on"]
    assert on["push"] == {"tags": ["v*"]}
    assert "pull_request" in on
    assert "workflow_dispatch" in on


def test_only_the_publish_job_may_write_packages(workflow):
    assert workflow["permissions"] == {"contents": "read"}
    for name, job in workflow["jobs"].items():
        perms = job.get("permissions", {})
        if name == "publish":
            assert perms == {"contents": "read", "packages": "write"}
        else:
            assert "packages" not in perms, name


def test_build_job_builds_both_images_without_pushing(workflow):
    build = workflow["jobs"]["build"]
    assert build["strategy"]["matrix"]["image"] == IMAGES
    (step,) = _steps(build, "docker/build-push-action@")
    assert step["with"]["context"] == "${{ matrix.image }}"
    assert step["with"]["push"] is False
    assert not _steps(build, "docker/login-action@")
    assert "docker push" not in str(build)


def test_publish_waits_for_both_builds_and_runs_only_for_a_tag(workflow):
    publish = workflow["jobs"]["publish"]
    assert publish["needs"] == "build"
    assert publish["if"] == "github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')"
    (download,) = _steps(publish, "actions/download-artifact@")
    assert download["with"]["pattern"] == "image-*"
    run = "\n".join(s.get("run", "") for s in publish["steps"])
    assert "for image in backend frontend; do" in run
    assert 'docker load --input "$IMAGES/$image.tar"' in run
    assert "docker push" in run


def test_version_is_checked_before_logging_in_or_pushing(workflow):
    steps = workflow["jobs"]["publish"]["steps"]
    check = steps.index(_version_step(workflow))
    later = [i for i, s in enumerate(steps) if s.get("uses", "").startswith("docker/login-action@") or "docker push" in s.get("run", "")]
    assert later and min(later) > check


def _check(tmp_path, workflow, tag, init):
    pkg = tmp_path / "backend" / "llm_translate"
    pkg.mkdir(parents=True)
    (pkg / "__init__.py").write_text(init, encoding="utf-8")
    out = tmp_path / "out"
    out.write_text("")
    result = subprocess.run(
        ["bash", "-e", "-c", _version_step(workflow)["run"]],
        cwd=tmp_path,
        env={"PATH": "/usr/bin:/bin", "GITHUB_REF_NAME": tag, "GITHUB_OUTPUT": str(out)},
        capture_output=True,
        text=True,
    )
    return result, out.read_text()


@pytest.mark.parametrize("init", ['__version__ = "1.0.0"\n', "__version__ = '1.0.0'  # released\n"])
def test_a_tag_equal_to_the_version_passes(tmp_path, workflow, init):
    result, out = _check(tmp_path, workflow, "v1.0.0", '"""Package."""\n' + init)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "version=1.0.0" in out.splitlines()


@pytest.mark.parametrize(
    "tag, init",
    [
        ("v1.0.1", '__version__ = "1.0.0"\n'),
        ("v1.0", '__version__ = "1.0.0"\n'),
        ("1.0.0", '__version__ = "1.0.0"\n'),
        ("v1.0.0-rc1", '__version__ = "1.0.0"\n'),
        ("v", ""),
        ("v1.0.0", ""),
        ("v1.0.0", '# __version__ = "1.0.0"\n'),
    ],
)
def test_any_other_tag_fails_and_writes_no_version(tmp_path, workflow, tag, init):
    result, out = _check(tmp_path, workflow, tag, init)
    assert result.returncode != 0
    assert "version=" not in out
    assert "::error::" in result.stdout


def test_backend_context_leaves_out_secrets_and_local_files():
    ignored = _ignored(ROOT / "backend" / ".dockerignore")
    for pattern in [".env", "**/.env", "venv", "**/__pycache__", "tests"]:
        assert pattern in ignored, pattern


def test_frontend_context_keeps_env_and_leaves_out_local_files():
    # `frontend/.env` sets VITE_API_URL at build time; docker compose builds from it.
    ignored = _ignored(ROOT / "frontend" / ".dockerignore")
    assert not [p for p in ignored if ".env" in p]
    for pattern in ["node_modules", "dist", "e2e", "test-results", "playwright-report"]:
        assert pattern in ignored, pattern
