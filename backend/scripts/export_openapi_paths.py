"""
Export the API's OpenAPI paths for the frontend's contract test.

Run from backend/: `python -m scripts.export_openapi_paths`. A backend test fails
when the committed fixture no longer matches `app.openapi()`.
"""
import json
from pathlib import Path

FIXTURE = Path(__file__).resolve().parents[2] / "frontend" / "src" / "test" / "fixtures" / "openapi-paths.json"


def openapi_paths(app) -> dict:
    """
    Map each path in `app.openapi()` to its sorted HTTP methods, paths sorted.
    """
    paths = app.openapi()["paths"]
    return {path: sorted(paths[path]) for path in sorted(paths)}


if __name__ == "__main__":
    from main import app

    FIXTURE.write_text(json.dumps(openapi_paths(app), indent=2) + "\n")
    print(f"Wrote {FIXTURE}")
