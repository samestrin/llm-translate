# Development

## Requirements

- Git
- Python 3.9+ (backend)
- Node.js 18 or later and npm (frontend)
- Docker and Docker Compose (the easiest way to run both)

## Run from source

Backend (see the [backend README](../backend/README.md) for every setting):

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Frontend (see the [frontend README](../frontend/README.md)):

```bash
cd frontend
npm ci
npm run dev
```

With Docker Compose, add the dev override for hot reload: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build`.

## Tests

| Where | Command | What it runs |
|---|---|---|
| `backend/` | `ruff check .` | Lint |
| `backend/` | `pytest --cov=llm_translate --cov=main --cov-fail-under=99` | Unit and integration tests, with coverage |
| `frontend/` | `npm run lint` | ESLint |
| `frontend/` | `npm run build` | Production build |
| `frontend/` | `npm test` | Vitest and Testing Library component tests |
| `frontend/` | `npm run test:e2e` | Playwright against the built page (`npx playwright install chromium` once) |
| root | `pytest evals/tests` and `python evals/run.py --fake --no-write` | The eval runner, against a fake model |

CI (`.github/workflows/ci.yml`) runs all of these on every pull request.

## README images

`npm run capture:readme` in `frontend/` builds the page, starts the real backend with a fake OpenAI server as its model endpoint (`backend/scripts/serve_fake.py`, so no key is ever on screen), and writes `docs/images/translation-page.png`, `translation-page-dark.png` and `translation-page-phone.png`. It needs the backend's Python dependencies (set `PYTHON` to pick the interpreter) and ports 8000 and 4173 free. Run it again whenever the page changes.

## Contributing

Fork the repository, make a branch, add or update tests with your change, make sure they all pass, and open a pull request. The full guide is [CONTRIBUTING.md](../CONTRIBUTING.md).
