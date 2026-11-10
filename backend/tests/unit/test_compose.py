"""
The demo `docker-compose.yml` and its dev override.

`docker compose up --build` must work on a fresh clone with no hand-copied
files: no `env_file` may be required, no source folder is mounted over the
built images, and both ports listen on loopback only. The hot-reload mounts
live in `docker-compose.dev.yml`, which compose reads only when asked with `-f`.
"""
import re
from pathlib import Path

import pytest
from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[3]
COMPOSE = ROOT / "docker-compose.yml"
DEV = ROOT / "docker-compose.dev.yml"
MODEL_VARS = ["LLM_BASE_URL", "LLM_API_KEY", "LLM_TRANSLATE_MODEL"]


def _load(path):
    return YAML(typ="safe").load(path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def services():
    return _load(COMPOSE)["services"]


def _volume_source(volume):
    """The host side of a short (`src:dst`) or long (`{source: ...}`) volume, or None."""
    if isinstance(volume, dict):
        return volume.get("source") if volume.get("type", "volume") == "bind" else None
    parts = volume.split(":")
    return parts[0] if len(parts) > 1 else None


def _bind_mounts(service):
    sources = (_volume_source(v) for v in service.get("volumes", []))
    return [s for s in sources if s and s.startswith((".", "/", "~"))]


def _required_env_files(service):
    env_file = service.get("env_file", [])
    if isinstance(env_file, (str, dict)):
        env_file = [env_file]
    # A plain path is required; so is a long entry that leaves `required` unset.
    return [e for e in env_file if isinstance(e, str) or e.get("required", True)]


def test_both_services_are_defined(services):
    assert set(services) == {"backend", "frontend"}


@pytest.mark.parametrize("name", ["backend", "frontend"])
def test_no_source_folder_is_mounted(services, name):
    assert _bind_mounts(services[name]) == []
    assert "volumes" not in services[name], "no anonymous volume either: it would hide the built files"


@pytest.mark.parametrize("name", ["backend", "frontend"])
def test_no_env_file_is_required(services, name):
    assert _required_env_files(services[name]) == []


@pytest.mark.parametrize("name,port", [("backend", "8000"), ("frontend", "3000")])
def test_ports_listen_on_loopback_only(services, name, port):
    assert services[name]["ports"] == [f"127.0.0.1:{port}:{port}"]


def test_model_variables_come_from_the_shell_or_root_env(services):
    # Bare names: compose fills each from the shell or the root .env, and drops it
    # when neither sets it, so an optional backend/.env still supplies it.
    environment = services["backend"]["environment"]
    assert isinstance(environment, list)
    for var in MODEL_VARS:
        assert var in environment


def test_backend_healthcheck_calls_root_which_needs_no_key(services):
    assert services["backend"]["healthcheck"]["test"][-1] == "http://localhost:8000/"


def test_frontend_has_a_healthcheck_and_waits_for_the_backend(services):
    frontend = services["frontend"]
    assert "http://127.0.0.1:3000/" in " ".join(frontend["healthcheck"]["test"])
    assert frontend["depends_on"]["backend"]["condition"] == "service_healthy"


def test_frontend_build_passes_the_api_url_with_a_default(services):
    args = services["frontend"]["build"]["args"]
    assert args["VITE_API_URL"] == "${VITE_API_URL:-http://localhost:8000/}"


def test_frontend_dockerfile_defaults_the_api_url():
    dockerfile = (ROOT / "frontend" / "Dockerfile").read_text(encoding="utf-8")
    assert re.search(r"^ARG VITE_API_URL=http://localhost:8000/$", dockerfile, re.MULTILINE)


def test_root_env_example_lists_the_model_variables():
    lines = (ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
    names = {line.split("=", 1)[0] for line in lines if "=" in line and not line.startswith("#")}
    assert set(MODEL_VARS) <= names


def test_root_env_example_holds_no_key():
    lines = (ROOT / ".env.example").read_text(encoding="utf-8").splitlines()
    (key_line,) = [line for line in lines if line.startswith("LLM_API_KEY=")]
    assert key_line == "LLM_API_KEY="


def test_dev_override_adds_the_hot_reload_mounts():
    dev = _load(DEV)["services"]
    assert "./backend:/app" in dev["backend"]["volumes"]
    assert "./frontend:/app" in dev["frontend"]["volumes"]
    assert "/app/node_modules" in dev["frontend"]["volumes"]


def test_plain_compose_up_does_not_read_the_dev_override(services):
    # `docker compose up` merges these two names automatically; the dev file must not use them.
    assert not (ROOT / "docker-compose.override.yml").exists()
    assert not (ROOT / "compose.override.yml").exists()
    assert "include" not in _load(COMPOSE)
