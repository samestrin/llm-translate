"""
Check that a built page does not call a backend on the visitor's own machine.

    python scripts/check_page_api_base.py <folder with the built page>

`VITE_API_URL` is baked into the page when it is built. A build without it keeps a
loopback default (`http://localhost:8000/` from frontend/Dockerfile, or
`http://127.0.0.1:8000` from frontend/src/services/api.js), and a deployed page then
calls each visitor's own machine and says the service is unreachable (EST-7533).

Fails (exit 1, one line per file) if any .js file under the folder holds an http(s)
URL to localhost, 127.0.0.1 or 0.0.0.0 with a port. A bare `http://localhost`, which
axios and the router use to parse relative URLs, has no port and passes.
"""

import re
import sys
from pathlib import Path

LOOPBACK = re.compile(r"https?://(?:localhost|127\.0\.0\.1|0\.0\.0\.0):\d+[^\"'`\s]*")


def problems(folder):
    scripts = sorted(Path(folder).rglob("*.js"))
    if not scripts:
        return [f"{folder}: no .js file, not a built page"]
    found = []
    for script in scripts:
        urls = sorted(set(LOOPBACK.findall(script.read_text(encoding="utf-8", errors="replace"))))
        if urls:
            found.append(f"{script.relative_to(folder)}: calls a loopback backend {', '.join(urls)}")
    return found


def main(argv):
    if len(argv) != 2:
        print(f"usage: {argv[0]} <built page folder>", file=sys.stderr)
        return 2
    found = problems(Path(argv[1]))
    for line in found:
        print(line)
    return 1 if found else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
