"""Each guard in scripts/check_embassy_compose.py reports its mutant; the real file passes."""

import copy
import importlib.util
import io
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[2]
COMPOSE = ROOT / "docker-compose.embassy.yml"

spec = importlib.util.spec_from_file_location("check_embassy_compose", ROOT / "scripts/check_embassy_compose.py")
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)


def resolved_service(context, args=None):
    build = {"context": context, "dockerfile": "Dockerfile"}
    if args:
        build["args"] = args
    return {"build": build, "image": "x:latest", "restart": "unless-stopped", "networks": {"proxy": None}}


# The shape `docker compose config --format json` prints for docker-compose.embassy.yml.
VALID = {
    "name": "llm-translate",
    "services": {
        "backend": resolved_service("/repo/backend"),
        "frontend": resolved_service("/repo/frontend", {"VITE_API_URL": "/api"}),
    },
    "networks": {"proxy": {"name": "proxy", "external": True}},
}
RAW = yaml.safe_load(COMPOSE.read_text())


def mutate(change):
    config, raw = copy.deepcopy(VALID), copy.deepcopy(RAW)
    change(config, raw)
    return check.problems(config, raw)


def test_valid_config_has_no_problems():
    assert check.problems(VALID, RAW) == []


def _set(path, value):
    def change(config, _raw):
        node = config
        for key in path[:-1]:
            node = node[key]
        node[path[-1]] = value
    return change


def _drop(path):
    def change(config, _raw):
        node = config
        for key in path[:-1]:
            node = node[key]
        del node[path[-1]]
    return change


def _raw_env_file(value):
    def change(_config, raw):
        raw["services"]["backend"]["env_file"] = value
    return change


def _add_model_server(config, _raw):
    config["services"]["ollama"] = {
        "image": "ollama/ollama", "restart": "unless-stopped", "networks": {"proxy": None}}


@pytest.mark.parametrize("change, expected", [
    (_set(["services", "backend", "ports"], [{"target": 8000, "published": "8000"}]), "backend: publishes a host port"),
    (_set(["services", "frontend", "ports"], [{"host_ip": "127.0.0.1", "target": 3000}]), "frontend: publishes a host port"),
    (_set(["services", "backend", "volumes"], [{"type": "bind", "source": "/repo/backend"}]), "backend: mounts"),
    (_set(["services", "frontend", "volumes"], [{"type": "volume", "source": "data"}]), "frontend: mounts"),
    (_add_model_server, "ollama: looks like a model server"),
    (_add_model_server, "services are ['backend', 'frontend', 'ollama']"),
    (_set(["services", "backend", "image"], "vllm/vllm-openai"), "backend: looks like a model server"),
    (_set(["services", "backend", "deploy"], {"resources": {"reservations": {"devices": [{"driver": "nvidia"}]}}}),
     "backend: reserves a device"),
    (_drop(["services", "backend", "restart"]), "backend: restart is None"),
    (_set(["services", "frontend", "restart"], "always"), "frontend: restart is 'always'"),
    (_set(["services", "backend", "networks"], {"default": None}), "backend: not on the proxy network"),
    (_drop(["services", "frontend", "networks"]), "frontend: not on the proxy network"),
    (_set(["networks", "proxy"], {"name": "proxy"}), "network proxy is not external"),
    (_raw_env_file("./backend/.env"), "backend: env_file is ['./backend/.env']"),
    (_raw_env_file([".env.embassy", ".env"]), "backend: env_file is"),
    (_raw_env_file([]), "backend: env_file is []"),
    (_set(["services", "frontend", "build", "args", "VITE_API_URL"], "http://127.0.0.1:8000"),
     "frontend: VITE_API_URL build arg is 'http://127.0.0.1:8000'"),
    (_drop(["services", "frontend", "build", "args"]), "frontend: VITE_API_URL build arg is None"),
    (_drop(["services", "backend", "build"]), "backend: not built from this repo's production Dockerfile"),
])
def test_each_guard_reports_its_mutant(change, expected):
    found = mutate(change)
    assert any(line.startswith(expected) for line in found), found


def test_env_file_long_form_is_accepted():
    assert mutate(_raw_env_file([{"path": ".env.embassy", "required": True}])) == []


def test_env_file_string_form_is_accepted():
    assert mutate(_raw_env_file(".env.embassy")) == []


@pytest.mark.skipif(shutil.which("docker") is None, reason="needs docker compose")
def test_real_file_resolves_clean():
    env = ROOT / ".env.embassy"
    created = not env.exists()
    if created:
        env.touch()
    try:
        out = subprocess.run(
            ["docker", "compose", "-f", str(COMPOSE), "config", "--format", "json"],
            check=True, capture_output=True, text=True,
        ).stdout
    finally:
        if created:
            env.unlink()
    assert check.problems(json.loads(out), RAW) == []


def run_cli(compose_file, config):
    """Run the checker as CI does: resolved config on stdin, the compose file as the argument."""
    return subprocess.run(
        [sys.executable, str(ROOT / "scripts/check_embassy_compose.py"), str(compose_file)],
        input=json.dumps(config), capture_output=True, text=True,
    )


def test_cli_exits_0_and_prints_ok_for_a_valid_file():
    result = run_cli(COMPOSE, VALID)
    assert result.returncode == 0, result.stdout
    assert result.stdout == f"{COMPOSE}: ok\n"


def test_cli_exits_1_and_names_each_problem(tmp_path):
    raw = copy.deepcopy(RAW)
    raw["services"]["backend"]["env_file"] = "./backend/.env"
    mutant = tmp_path / "docker-compose.mutant.yml"
    mutant.write_text(yaml.safe_dump(raw))
    config = copy.deepcopy(VALID)
    config["services"]["backend"]["ports"] = [{"target": 8000, "published": "8000"}]

    result = run_cli(mutant, config)

    assert result.returncode == 1, result.stdout
    lines = result.stdout.splitlines()
    assert f"{mutant}: backend: env_file is ['./backend/.env'], expected .env.embassy" in lines
    assert any(line.startswith(f"{mutant}: backend: publishes a host port") for line in lines)
    assert not any(line.endswith(": ok") for line in lines)


@pytest.mark.parametrize("config, code, last", [
    (VALID, 0, "ok"),
    ({**VALID, "networks": {"proxy": {"name": "proxy"}}}, 1, "network proxy is not external"),
])
def test_main_returns_the_exit_code(monkeypatch, capsys, config, code, last):
    monkeypatch.setattr(sys, "argv", ["check_embassy_compose.py", str(COMPOSE)])
    monkeypatch.setattr(sys, "stdin", io.StringIO(json.dumps(config)))
    assert check.main() == code
    assert capsys.readouterr().out.splitlines()[-1] == f"{COMPOSE}: {last}"
