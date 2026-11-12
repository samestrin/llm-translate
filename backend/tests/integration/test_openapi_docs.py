"""
The OpenAPI schema served at `/openapi.json` and the Scalar reference page at `/docs`.
"""
import base64
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

import pytest
from fastapi.testclient import TestClient

from main import app

REPO = Path(__file__).resolve().parents[3]
STATIC = Path(__file__).resolve().parents[2] / "static"
SOURCES = STATIC / "SOURCES.md"

V1_ROUTES = {("/v1/translate", "post"), ("/v1/translate/file", "post"), ("/v1/speak", "post")}
ERROR_STATUSES = {"400", "401", "422", "429", "500"}

# Hosts the page must never reach: a CDN, Scalar's font host, its request proxy or its own site.
OUTSIDE_HOSTS = [
    "cdn.",
    "unpkg.com",
    "jsdelivr",
    "fonts.googleapis.com",
    "fonts.scalar.com",
    "proxy.scalar.com",
    "scalar.com",
]

client = TestClient(app)


def _schema():
    return client.get("/openapi.json").json()


def test_docs_page_is_served():
    response = client.get("/docs")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/html")
    html = response.text
    assert "docs/scalar.js" in html
    assert "openapi.json" in html
    assert "swagger" not in html.lower()


def test_schema_lists_every_v1_route():
    paths = _schema()["paths"]
    served = {(p, m) for p, ops in paths.items() if p.startswith("/v1") for m in ops}
    assert served == V1_ROUTES
    routes = {(r.path, m.lower()) for r in app.routes if r.path.startswith("/v1") for m in r.methods}
    assert routes == V1_ROUTES


def test_every_v1_route_has_summary_and_described_errors():
    paths = _schema()["paths"]
    for path, method in V1_ROUTES:
        op = paths[path][method]
        assert op["summary"], path
        assert op["tags"] == ["v1"], path
        for status in ERROR_STATUSES:
            assert op["responses"][status]["description"], (path, status)
        for status in ERROR_STATUSES - {"422"}:
            assert "error" in op["responses"][status]["content"]["application/json"]["example"]


def test_v1_request_and_response_examples():
    schema = _schema()
    translate = schema["paths"]["/v1/translate"]["post"]
    ok = translate["responses"]["200"]["content"]["application/json"]["schema"]
    assert ok["$ref"].endswith("V1TranslationResponse")
    assert "examples" in schema["components"]["schemas"]["TranslationRequest"]["properties"]["text"] or \
        "example" in schema["components"]["schemas"]["TranslationRequest"]
    assert "example" in schema["components"]["schemas"]["V1TranslationResponse"]
    audio = schema["paths"]["/v1/speak"]["post"]["responses"]["200"]["content"]
    assert "audio/mpeg" in audio


# The documented examples must be what the routes return.

def _example(path, status):
    op = _schema()["paths"][path]["post"]
    return op["responses"][status]["content"]["application/json"]["example"]


def _documented(response):
    """The body as OpenAPI shows it: the schema generator leaves out null fields."""
    error = {k: v for k, v in response.json()["error"].items() if v is not None}
    return response.status_code, {"error": error}


def _fake_server(monkeypatch):
    from tests.integration.test_v1_api import ENV_VARS
    for var in ENV_VARS:
        monkeypatch.delenv(var, raising=False)
    monkeypatch.setenv("LLM_BASE_URL", "http://llm.local/v1")
    monkeypatch.setenv("LLM_TRANSLATE_MODEL", "translate-model")


def test_documented_translate_errors_match_real_bodies(monkeypatch):
    from unittest.mock import patch
    _fake_server(monkeypatch)
    # The documented 401 is a key the endpoint refuses; with no key at all it says so instead.
    monkeypatch.setenv("LLM_API_KEY", "sk-refused")
    body = {"text": " ", "from_lang": "English", "to_lang": "Spanish"}
    from tests.fake_openai_server import FakeOpenAIServer
    import httpx
    fake = FakeOpenAIServer(translation="x", detected_language="English")
    real = httpx.AsyncClient
    monkeypatch.setattr("llm_translate.services.llm_client.httpx.AsyncClient",
                        lambda **kw: real(transport=httpx.ASGITransport(app=fake.app), **kw))
    ok = {**body, "text": "Hello"}
    with patch("llm_translate.utils.config.load_dotenv"):
        blank = client.post("/v1/translate", json=body)
        fake.status = 401
        auth = client.post("/v1/translate", json=ok)
        fake.status = 429
        limited = client.post("/v1/translate", json=ok)
        with patch("main.get_translation_service", side_effect=RuntimeError("boom")):
            unexpected = client.post("/v1/translate", json={**body, "text": "Hello"})
    assert _documented(blank) == (400, _example("/v1/translate", "400"))
    assert _documented(unexpected) == (500, _example("/v1/translate", "500"))
    assert _documented(auth) == (401, _example("/v1/translate", "401"))
    assert _documented(limited) == (429, _example("/v1/translate", "429"))


def test_documented_speak_errors_match_real_bodies(monkeypatch):
    from unittest.mock import patch
    from tests.fake_openai_server import FakeOpenAIServer
    import httpx
    _fake_server(monkeypatch)
    fake = FakeOpenAIServer(translation="x", detected_language="English")
    real = httpx.AsyncClient
    monkeypatch.setattr("llm_translate.services.tts_client.httpx.AsyncClient",
                        lambda **kw: real(transport=httpx.ASGITransport(app=fake.app), **kw))
    body = {"text": "Hola", "lang": "Spanish"}
    with patch("llm_translate.utils.config.load_dotenv"):
        fake.status = 400
        bad = client.post("/v1/speak", json=body)
        fake.status = 401
        auth = client.post("/v1/speak", json=body)
        fake.status = 429
        limited = client.post("/v1/speak", json=body)
        with patch("main.get_tts_client", side_effect=RuntimeError("boom")):
            unexpected = client.post("/v1/speak", json=body)
    for status, response in (("400", bad), ("401", auth), ("429", limited), ("500", unexpected)):
        assert _documented(response) == (int(status), _example("/v1/speak", status)), status


def test_documented_translate_413_matches_a_real_body(monkeypatch):
    from unittest.mock import patch
    _fake_server(monkeypatch)
    monkeypatch.setenv("LLM_SEGMENT_MAX_CHARS", "12")
    monkeypatch.setenv("LLM_MAX_SEGMENTS", "2")
    text = "\n\n".join(f"Paragraph {n}" for n in range(1, 4))
    with patch("llm_translate.utils.config.load_dotenv"):
        response = client.post("/v1/translate", json={"text": text, "from_lang": "English", "to_lang": "Spanish"})
    assert _schema()["paths"]["/v1/translate"]["post"]["responses"]["413"]["description"]
    assert _documented(response) == (413, _example("/v1/translate", "413"))


def test_v1_translate_file_documents_its_upload_and_report():
    schema = _schema()
    op = schema["paths"]["/v1/translate/file"]["post"]
    upload = op["requestBody"]["content"]["multipart/form-data"]["schema"]
    if "$ref" in upload:
        upload = schema["components"]["schemas"][upload["$ref"].rsplit("/", 1)[1]]
    assert {"file", "from_lang", "to_lang"} <= set(upload["required"])
    ok = op["responses"]["200"]["content"]["application/json"]
    assert ok["schema"]["$ref"].endswith("V1FileTranslationResponse")
    assert "example" in schema["components"]["schemas"]["V1FileTranslationResponse"]
    assert "413" in op["responses"]
    assert "segment_errors" in op["responses"]["500"]["content"]["application/json"]["example"]["error"]


def test_documented_translate_file_errors_match_real_bodies(monkeypatch):
    from unittest.mock import patch
    import httpx
    from tests.fake_openai_server import FakeOpenAIServer
    _fake_server(monkeypatch)
    monkeypatch.setenv("LLM_MAX_FILE_BYTES", "10")
    fake = FakeOpenAIServer(translation="Hola {nombre}", detected_language="English")
    real = httpx.AsyncClient
    monkeypatch.setattr("llm_translate.services.llm_client.httpx.AsyncClient",
                        lambda **kw: real(transport=httpx.ASGITransport(app=fake.app), **kw))
    form = {"from_lang": "English", "to_lang": "Spanish"}

    def post(name, content):
        return client.post("/v1/translate/file", data=form, files={"file": (name, content, "text/plain")})

    with patch("llm_translate.utils.config.load_dotenv"):
        unsupported = post("notes.txt", b"hello")
        too_large = post("app.json", b'{"greeting": "Hello {name}"}')
        monkeypatch.setenv("LLM_MAX_FILE_BYTES", "1000")
        broken = post("app.json", b'{"greeting": "Hello {name}"}')
    assert _documented(unsupported) == (400, _example("/v1/translate/file", "400"))
    assert _documented(too_large) == (413, _example("/v1/translate/file", "413"))
    assert _documented(broken) == (500, _example("/v1/translate/file", "500"))


# The Scalar reference page: vendored, offline, and right about its server prefix.


class Tags(HTMLParser):
    """Every start tag with its attributes, plus style text and inline script text."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.styles: list[str] = []
        self.scripts: list[tuple[dict[str, str], str]] = []
        self._collect = None
        self._attrs: dict[str, str] = {}
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        attrs = {k: v or "" for k, v in attrs}
        self.tags.append((tag, attrs))
        if tag == "style":
            self._collect, self._buf = "style", []
        elif tag == "script" and "src" not in attrs:
            self._collect, self._attrs, self._buf = "script", attrs, []

    def handle_data(self, data):
        if self._collect:
            self._buf.append(data)

    def handle_endtag(self, tag):
        if tag == "style" and self._collect == "style":
            self.styles.append("".join(self._buf))
            self._collect = None
        elif tag == "script" and self._collect == "script":
            self.scripts.append((self._attrs, "".join(self._buf)))
            self._collect = None


def parse(html: str) -> Tags:
    parser = Tags()
    parser.feed(html)
    return parser


def page() -> str:
    resp = client.get("/docs")
    assert resp.status_code == 200
    return resp.text


def inline_script(html: str) -> str:
    scripts = parse(html).scripts
    assert len(scripts) == 1, "the page carries exactly one inline script: the configuration"
    return scripts[0][1]


# Runs the page's own inline script with a stubbed browser, so CI tests the real
# prefix computation, not a copy of it. Node.js is preinstalled on CI's ubuntu-latest.
NODE_HARNESS = """
const fs = require("fs");
const script = fs.readFileSync(process.argv[1], "utf8");
let config = null;
globalThis.location = { pathname: process.argv[2] };
globalThis.document = {
  getElementById(id) {
    if (id !== "api-reference") throw new Error("unexpected element: " + id);
    return {
      setAttribute(name, value) {
        if (name !== "data-configuration") throw new Error("unexpected attribute: " + name);
        config = value;
      },
    };
  },
};
(0, eval)(script);
if (config === null) throw new Error("the script set no data-configuration");
process.stdout.write(config);
"""


def run_page_script(html: str, pathname: str, tmp_path) -> dict:
    """The data-configuration the page's script sets when the browser is at `pathname`."""
    script = tmp_path / "page-script.js"
    script.write_text(inline_script(html), encoding="utf-8")
    try:
        result = subprocess.run(
            ["node", "-e", NODE_HARNESS, str(script), pathname],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError:
        pytest.fail("Node.js is needed to run the page's configuration script")
    assert result.returncode == 0, result.stderr
    return json.loads(result.stdout)


def css_rules(css: str) -> list[tuple[str, str]]:
    return [(s.strip(), b.strip()) for s, b in re.findall(r"([^{}]+)\{([^{}]*)\}", css)]


def accent_in(css: str, selector: str) -> str | None:
    for selectors, body in css_rules(css):
        if selector in [s.strip() for s in selectors.split(",")]:
            for declaration in body.split(";"):
                name, _, value = declaration.partition(":")
                if name.strip() == "--scalar-color-accent":
                    return value.strip()
    return None


def theme_accent() -> tuple[str, str]:
    """The light and dark `--color-accent` the frontend declares, read from the source of truth."""
    text = (REPO / "frontend" / "src" / "theme.css").read_text()
    match = re.search(
        r"--color-accent:\s*light-dark\((#[0-9a-fA-F]{6}),\s*(#[0-9a-fA-F]{6})\)", text
    )
    assert match, "frontend/src/theme.css no longer declares --color-accent as light-dark(...)"
    return match.group(1).lower(), match.group(2).lower()


def test_the_page_names_both_by_relative_url():
    tags = parse(page()).tags
    script = next(attrs for tag, attrs in tags if tag == "script" and attrs.get("src"))
    reference = next(attrs for tag, attrs in tags if attrs.get("id") == "api-reference")
    assert script["src"] == "docs/scalar.js"
    assert reference["data-url"] == "openapi.json"
    # Relative, so the same page works behind Traefik at /api/docs and on port 8000 at /docs.
    cases = [
        (
            "https://translate.estr.in/api/docs",
            "https://translate.estr.in/api/docs/scalar.js",
            "https://translate.estr.in/api/openapi.json",
        ),
        (
            "http://localhost:8000/docs",
            "http://localhost:8000/docs/scalar.js",
            "http://localhost:8000/openapi.json",
        ),
    ]
    for base, script_url, spec_url in cases:
        assert urljoin(base, script["src"]) == script_url
        assert urljoin(base, reference["data-url"]) == spec_url


def test_the_configuration_is_set_before_the_bundle_loads():
    scripts = [attrs for tag, attrs in parse(page()).tags if tag == "script"]
    assert scripts[0].get("id") == "api-reference"
    assert "src" not in scripts[1], "the inline configuration must run before the bundle"
    assert scripts[2].get("src") == "docs/scalar.js"


@pytest.mark.parametrize("pathname,prefix", [
    ("/api/docs", "/api"),
    ("/docs", "/"),
    ("/api/docs/", "/api"),
    ("/docs/", "/"),
])
def test_the_page_script_names_the_server_prefix_for_where_it_sits(pathname, prefix, tmp_path):
    config = run_page_script(page(), pathname, tmp_path)
    assert config["servers"] == [{"url": prefix}]


def test_the_defaults_that_fetch_from_outside_are_off(tmp_path):
    config = run_page_script(page(), "/docs", tmp_path)
    assert config["withDefaultFonts"] is False  # the font host
    assert config["proxyUrl"] is None  # the request proxy
    assert config["telemetry"] is False


def test_the_page_fetches_nothing_from_outside():
    html = page()
    fetched = [
        value
        for tag, attrs in parse(html).tags
        for name, value in attrs.items()
        if name in {"src", "href", "data-url"}
    ]
    assert fetched, "the page fetches nothing at all"
    for value in fetched:
        assert urlparse(value).scheme in {"", "data"}, value
        assert not value.startswith("//"), value
    for host in OUTSIDE_HOSTS:
        assert host not in html.lower(), host


def test_the_accent_is_the_frontends_in_both_themes():
    light, dark = theme_accent()
    css = "\n".join(parse(page()).styles)
    assert accent_in(css, ".light-mode") == light
    assert accent_in(css, ".dark-mode") == dark


def test_the_favicon_is_the_frontends_inlined_as_a_data_uri():
    tags = parse(page()).tags
    icon = next(attrs for tag, attrs in tags if tag == "link" and attrs.get("rel") == "icon")
    prefix = "data:image/svg+xml;base64,"
    assert icon["href"].startswith(prefix)
    assert (
        base64.b64decode(icon["href"][len(prefix):])
        == (REPO / "frontend" / "public" / "favicon.svg").read_bytes()
    )


def test_the_vendored_script_is_served_as_javascript():
    resp = client.get("/docs/scalar.js")
    assert resp.status_code == 200
    assert "javascript" in resp.headers["content-type"]
    assert resp.content == (STATIC / "scalar.js").read_bytes()
    assert len(resp.content) > 100_000  # the standalone bundle, not a stub


def test_redoc_is_gone():
    assert client.get("/redoc").status_code == 404


def test_the_spec_declares_no_server():
    # The page derives the prefix from its own path; a fixed server here would
    # break "Test Request" on whichever of the two deployments it did not name.
    assert "servers" not in _schema()


def test_the_reference_routes_are_not_in_the_schema():
    spec = _schema()
    assert "/docs" not in spec["paths"]
    assert "/docs/scalar.js" not in spec["paths"]


SOURCE_FIELDS = ["file", "package", "version", "url", "licence", "retrieved", "sha256"]


def source_rows(path: Path) -> dict[str, dict[str, str]]:
    rows = {}
    for line in path.read_text().splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if not line.strip().startswith("|") or len(cells) != len(SOURCE_FIELDS):
            continue
        if cells[0] == "File" or set(cells[0]) <= set("-: "):
            continue
        rows[cells[0]] = dict(zip(SOURCE_FIELDS, cells))
    return rows


def vendored_problems(static: Path, sources: Path) -> list[str]:
    """What is wrong with the vendored record: a missing file, a changed byte, an empty cell."""
    rows = source_rows(sources)
    problems = []
    if "scalar.js" not in rows:
        problems.append("scalar.js: not listed in SOURCES.md")
    for name, row in rows.items():
        path = static / name
        if not path.is_file():
            problems.append(f"{name}: listed in SOURCES.md but not found")
            continue
        if hashlib.sha256(path.read_bytes()).hexdigest() != row["sha256"]:
            problems.append(f"{name}: sha256 differs from SOURCES.md")
        for field in SOURCE_FIELDS[1:-1]:
            if not row[field]:
                problems.append(f"{name}: {field} is empty")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row["retrieved"]):
            problems.append(f"{name}: retrieval date is not YYYY-MM-DD")
    return problems


def write_sources(tmp_path: Path, **cells: str) -> tuple[Path, Path]:
    static = tmp_path / "static"
    static.mkdir()
    data = b"// a vendored bundle\n"
    (static / "scalar.js").write_bytes(data)
    row = {
        "file": "scalar.js",
        "package": "@scalar/api-reference",
        "version": "1.78.1",
        "url": "https://registry.npmjs.org/@scalar/api-reference/-/api-reference-1.78.1.tgz",
        "licence": "MIT",
        "retrieved": "2026-11-12",
        "sha256": hashlib.sha256(data).hexdigest(),
    } | cells
    sources = tmp_path / "SOURCES.md"
    sources.write_text(
        "# Vendored sources\n\n"
        "| File | Package | Version | URL | Licence | Retrieved | sha256 |\n"
        "|---|---|---|---|---|---|---|\n"
        "| " + " | ".join(row[f] for f in SOURCE_FIELDS) + " |\n"
    )
    return static, sources


def test_the_vendored_script_is_recorded_with_its_version_and_licence():
    assert vendored_problems(STATIC, SOURCES) == []
    row = source_rows(SOURCES)["scalar.js"]
    assert row["package"] == "@scalar/api-reference"
    # The same pinned version as llm-pdf-chatbot's merged reference.
    assert row["version"] == "1.78.1"
    assert row["licence"] == "MIT"


def test_a_valid_vendored_record_has_no_problems(tmp_path):
    assert vendored_problems(*write_sources(tmp_path)) == []


def test_a_changed_bundle_fails(tmp_path):
    static, sources = write_sources(tmp_path)
    (static / "scalar.js").write_bytes(b"// tampered\n")
    assert vendored_problems(static, sources) == ["scalar.js: sha256 differs from SOURCES.md"]


def test_a_listed_file_that_is_not_there_fails(tmp_path):
    static, sources = write_sources(tmp_path)
    (static / "scalar.js").unlink()
    assert vendored_problems(static, sources) == ["scalar.js: listed in SOURCES.md but not found"]


def test_an_empty_licence_or_version_fails(tmp_path):
    assert vendored_problems(*write_sources(tmp_path, licence=" ", version="")) == [
        "scalar.js: version is empty",
        "scalar.js: licence is empty",
    ]


def test_a_record_without_a_real_date_fails(tmp_path):
    assert vendored_problems(*write_sources(tmp_path, retrieved="today")) == [
        "scalar.js: retrieval date is not YYYY-MM-DD"
    ]


def test_a_bundle_missing_from_the_record_fails(tmp_path):
    static, sources = write_sources(tmp_path)
    sources.write_text("# Vendored sources\n\nno table\n")
    assert vendored_problems(static, sources) == ["scalar.js: not listed in SOURCES.md"]
