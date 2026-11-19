"""scripts/check_page_api_base.py fails on a built page that calls a loopback backend.

The bad case is the real line from the published v1.1.0 frontend image
(`/assets/index-B5Nl65kE.js` on translate.samestrin.com, EST-7533), which sent every
visitor's browser to their own `http://localhost:8000/`.
"""

import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts/check_page_api_base.py"

spec = importlib.util.spec_from_file_location("check_page_api_base", SCRIPT)
check = importlib.util.module_from_spec(spec)
spec.loader.exec_module(check)

# Published v1.1.0, built without VITE_API_URL: the Dockerfile's default.
V110 = 'fr=3e5,pr="http://localhost:8000/",mr=Mn.create({baseURL:pr,timeout:15e3})'
# Built with no VITE_API_URL at all: the client's own fallback (frontend/src/services/api.js).
FALLBACK = 'fr=3e5,pr="http://127.0.0.1:8000",mr=Mn.create({baseURL:pr,timeout:15e3})'
# Built with VITE_API_URL=/api (the release build after EST-7533).
SAME_ORIGIN = 'fr=3e5,pr="/api",mr=Mn.create({baseURL:pr,timeout:15e3})'
# axios's URL helpers and the router's base, in every good build: no port, not an API base.
AXIOS = 'return function(e,t=!1){let n="http://localhost";"undefined"'
ROUTER = '_t=At&&window.location.href||"http://localhost",Ft={...O'


def page(tmp_path, index, vendor=AXIOS + ROUTER):
    assets = tmp_path / "assets"
    assets.mkdir()
    (tmp_path / "index.html").write_text('<script type="module" src="/assets/index-x.js"></script>')
    (assets / "index-x.js").write_text(index)
    (assets / "vendor-x.js").write_text(vendor)
    return tmp_path


@pytest.mark.parametrize("bad", [V110, FALLBACK, 'x="http://0.0.0.0:8000/v1"', "x='https://localhost:3000'"])
def test_a_loopback_base_with_a_port_is_reported(tmp_path, bad):
    found = check.problems(page(tmp_path, bad))
    assert len(found) == 1
    assert "assets/index-x.js" in found[0]


def test_the_same_origin_build_passes(tmp_path):
    assert check.problems(page(tmp_path, SAME_ORIGIN)) == []


def test_a_page_with_no_script_is_refused(tmp_path):
    (tmp_path / "index.html").write_text("<p>empty</p>")
    assert check.problems(tmp_path) == [f"{tmp_path}: no .js file, not a built page"]


@pytest.mark.parametrize("index, code", [(V110, 1), (SAME_ORIGIN, 0)])
def test_the_command_exits_on_the_result(tmp_path, index, code):
    result = subprocess.run([sys.executable, str(SCRIPT), str(page(tmp_path, index))], capture_output=True, text=True)
    assert result.returncode == code, result.stdout + result.stderr
    assert ("http://localhost:8000/" in result.stdout) == bool(code)


def test_the_command_needs_one_folder():
    result = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True)
    assert result.returncode == 2
    assert "usage" in result.stderr
