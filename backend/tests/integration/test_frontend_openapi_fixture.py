"""
The frontend's OpenAPI paths fixture, which its contract test checks the page's calls against.
"""
import json

from main import app
from scripts.export_openapi_paths import FIXTURE, openapi_paths


def test_fixture_matches_the_served_schema():
    # On failure, re-export: `python -m scripts.export_openapi_paths` from backend/.
    assert json.loads(FIXTURE.read_text()) == openapi_paths(app)


def test_export_lists_each_path_with_its_methods():
    paths = openapi_paths(app)

    assert paths["/v1/translate"] == ["post"]
    assert paths["/v1/translate/file"] == ["post"]
    assert paths["/v1/speak"] == ["post"]
    assert list(paths) == sorted(paths)
