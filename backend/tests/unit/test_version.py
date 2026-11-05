"""The app's reported version comes from `llm_translate.__version__`."""
import json
from pathlib import Path

import llm_translate
from main import app


def test_version_is_1_0_0():
    assert llm_translate.__version__ == "1.0.0"


def test_app_reports_package_version():
    assert app.version == llm_translate.__version__


def test_frontend_package_matches_backend_version():
    package = Path(__file__).resolve().parents[3] / "frontend" / "package.json"
    assert json.loads(package.read_text())["version"] == llm_translate.__version__
