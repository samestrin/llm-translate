# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `docker-compose.embassy.yml` and `docs/deploy/embassy.md`: the owner's private review stack at `translate.estr.in`, behind Traefik and Authelia on embassy. Both images are built from the production Dockerfiles, with no published host port, no source mount and no model server; the backend reads `.env.embassy` (only on embassy, git-ignored) and calls the fleet litellm with its own key, and speech shares that key. The frontend is built with `VITE_API_URL=/api`, now a build argument of `frontend/Dockerfile` that wins over `frontend/.env`. A CI job runs `docker compose config` on the file and `scripts/check_embassy_compose.py`, which fails on a host port, a mount or a model server. (EST-5625)
- `docs/case-study.md`: a case study draft for the owner's portfolio (problem, approach, results from `evals/results/2026-11-05.json`, and the translation-page screenshot). Reviewed by the owner before publication. (epic 6.1)

### Changed

- The README is rewritten: what it does, a screenshot of the page (`frontend/scripts/screenshot.mjs`, Playwright against the real backend on the fake OpenAI server, so no key is shown), a quick start that copies both `.env.example` files before `docker compose up`, file-translation and CI examples, and the eval table from `evals/results/2026-11-05.json` (deepseek-v4.1-flash). A test compares the table to that file and runs the documented file example. (epic 6.1)
- File translation keeps names and terms consistent across segments: a file with more than one segment to translate gets one extra `translate`-tier call that summarizes it and lists its names and key terms, and each segment (still translated one per call, so cue count, timings and placeholder checks are unchanged) is sent with that summary and the two segments before and after it as read-only context. (EST-5027)

## 1.0.0 - 2026-11-05

### Added

- A release workflow (`.github/workflows/release.yml`) builds the backend and frontend images on every pull request and manual run, and pushes nothing. A pushed `v*` tag that equals `__version__` in `backend/llm_translate/__init__.py` publishes both, after both have built, to `ghcr.io/samestrin/llm-translate-backend` and `ghcr.io/samestrin/llm-translate-frontend` as `<version>` and `latest`; any other tag fails before logging in. The two pushes run one after the other, so a failed second push can leave only the backend published. `.dockerignore` files keep a local `backend/.env` (API keys), tests and caches out of the images; `frontend/.env` stays in, since it sets `VITE_API_URL` at build time, so the published frontend image, built without one, calls `http://127.0.0.1:8000`. (epic 6.1)
- An eval runner, `python evals/run.py --api URL` (or `--fake`), prints one table per language with review off and on: chrF (`sacrebleu`, pinned in `evals/requirements.txt`), placeholder integrity, glossary hits and flag rate. It writes a dated `evals/results/<date>.json` with the model names and never the endpoint URL or key. CI runs it against the fake OpenAI server only. (epic 6)
- An eval set in `evals/` for Spanish, French, Japanese and Brazilian Portuguese: per language, English app strings (JSON), a Markdown page and an SRT file, each with a reference translation by people, and a glossary. Every file's source and license is listed in `evals/SOURCES.md` (MIT, CC-BY-SA 2.5 or CC-BY 3.0; nothing non-commercial, so no German), and a test fails if one is missing. (epic 6)
- Each review flag now carries its `severity` (the highest error its reason names; `null` for a pipeline message), and the segment's `source` and `translation`. The translation page shows them as sent, so the Review section shows the source and translation of a flag in every file format (YAML, PO, Markdown, HTML and SRT too) and for any `LLM_SEGMENT_MAX_CHARS`, instead of reading the severity out of the reason and re-splitting long text itself. (epic 5)
- A "Review the translation" switch on the translation page, off by default, sends `review=on` in text and file mode. The Review section lists each flagged segment with its severity and reason beside its source and translation, and the model and tokens of every step with the total. (epic 5)
- The README's API section documents the review pass: what `review=on` does (back-translation, scored review, one revision), what it costs (per-step models and tokens, no money figure) and how to read a flag, with an example `review` report. (epic 4)
- `review=off|on` on `POST /v1/translate` (JSON field) and `POST /v1/translate/file` (form field), default `off`. With `on`, every segment is back-translated, reviewed and, for a major or critical error, revised once; the reply gains a `review` report (`report.review` for files) with `flags` (segment id and reason), and the model and tokens per step. Cost is tokens only, no money figure, and `usage` includes the review calls. A flagged segment keeps its best translation. (epic 4)
- File mode on the translation page: drop a JSON, YAML, PO, Markdown, HTML or SRT file (or choose one), pick the languages, then download the translated file (`messages.json` to Spanish saves as `messages.spanish.json`) and read the report (format, segments, model, tokens). A failed file shows each failed segment and offers no download. (epic 5)
- The page fits a 375 px phone in both light and dark themes with no horizontal scroll: the layout no longer forces a 500 px minimum width, and the translation form can shrink. A Playwright test checks every page in both themes. (epic 5)
- The translation page has glossary and style guide inputs, saved per browser and sent with every `POST /v1/translate`; the glossary terms a translation missed (`glossary_misses`) are listed under it. (epic 5)
- Frontend test setup: Vitest with Testing Library (jsdom) for component tests (`npm test`) and Playwright for browser checks (`npm run test:e2e`), both run in the CI frontend job. (epic 5)
- `POST /v1/translate` returns the translation with the model that answered and the tokens spent (`translation`, `from_lang`, `to_lang`, `model`, `usage`; auto-detect included in `usage`), and `POST /v1/speak` returns speech; both report errors as `{"error": {...}}`. (epic 1)
- The interactive API docs at `/docs` describe both `/v1` routes with request and response examples and the errors each can return. (epic 1)
- `POST /v1/translate` takes an optional `glossary` (`source_term`, `target_term`, `note`, `do_not_translate`). Entries whose source term occurs in the text (case-insensitive) go into the prompt, and the response lists any the translation missed in `glossary_misses` (`term`, `expected`); a do-not-translate term must appear unchanged. A miss is reported, never an error. (epic 2)
- `POST /v1/translate` takes an optional `style_guide` (`tone`, `formality`, `audience`, `notes`); the filled fields are stated in the prompt ahead of the glossary. (epic 2)
- The README, the backend README and the `/docs` page show a glossary and style guide example for `POST /v1/translate`, including a reported `glossary_misses` entry; a test runs every documented example. (epic 2)
- JSON, YAML and gettext PO files can be read into segments and written back with translated values only: ids are JSON Pointer paths; keys, order, YAML comments, anchors and quoting, and PO comments, flags (including fuzzy), context and plural forms stay; a malformed file is a 400 error. (epic 3)
- Whole-document translation: text longer than `LLM_SEGMENT_MAX_CHARS` (default 4000) is split at paragraph (else line) boundaries, summarized in one extra `translate`-tier call, and each segment is translated with the summary and its neighbouring segments, then joined. A document over `LLM_MAX_SEGMENTS` (default 50) segments, or with a line over the segment limit, is rejected with HTTP 413; if any segment fails, the request fails with every failed segment listed in `segment_errors` and no partial text. (epic 2)
- File limits: `LLM_MAX_FILE_BYTES` (default 10 MiB) caps an upload and is enforced while it is read, so an oversize file is rejected with HTTP 413 without being buffered whole. File segments reuse `LLM_SEGMENT_MAX_CHARS` and `LLM_MAX_SEGMENTS` (413); an unsupported extension or an empty, binary or non-UTF-8 file is a 400. (epic 3)
- Consistent output: every model call runs at temperature 0, and an optional in-process LRU cache (`LLM_CACHE_SIZE`, default 0 = off) keyed by a hash of the text, languages, glossary, style guide, models and temperature returns a repeated request without a model call; `POST /v1/translate` then answers `cached: true` (and `false` otherwise). (epic 2)
- Markdown and HTML file parsers (`formats/markdown_file.py`, `formats/html_file.py`) split a file into text segments and put the translations back; code blocks, link destinations, tags, attributes, comments and `script`/`style`/`pre`/`code` text come back byte for byte. (epic 3)
- `POST /v1/translate/file`: upload a JSON, YAML, PO, Markdown, HTML or SRT file with `from_lang` and `to_lang` and get back the translated file (`content`, `format`) with a report (`segments`, `model`, `usage`). Placeholders are masked and checked per segment; if any segment fails (a lost or changed placeholder, or a model error), the request fails with every failed segment in `segment_errors` and no file. Adds the pinned `python-multipart` dependency. (epic 3)

### Fixed

- The translation page's stylesheet loads Tailwind v4 the v4 way (`@import "tailwindcss"` with `tailwind.config.js` through `@config`), so responsive classes (`sm:`, `md:`), the theme colors and `dark:` styles are built; before, the built CSS had no `@media` rules and none of the configured colors. A Playwright test checks the built CSS for a responsive rule and the rendered layout and colors. (epic 5)

### Removed

- The per-vendor translator classes (OpenAI, Groq, OpenRouter) and the service selector; every vendor runs on the one OpenAI-compatible client, and `AI_SOURCE` still maps to it. (epic 1)

### Deprecated

- `POST /translate` and `POST /speak`: use the `/v1` routes. Both still answer with their original response and error shapes. (epic 1)

### Fixed

- A failed text translation on the translation page shows its error once, under the text boxes, instead of crashing the page on an unimported component; lint now rejects an undefined JSX component (`react/jsx-no-undef`). (epic 5)
- An unexpected server error on `/translate` no longer echoes the internal exception text in the error's `details`; it is logged instead. (epic 1)
- An empty or malformed model answer is now an error (HTTP 500, `api_error`) instead of an empty translation, and blank text to translate is rejected with HTTP 400 before any model call. Internally a translation now carries the model that answered and the tokens it spent, for the `/v1` API to report.

### Changed

- Text-to-speech runs on one client for any OpenAI-compatible `/audio/speech` endpoint, set by `TTS_*` variables (`TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMATS`, `TTS_TIMEOUT`); it shares the `LLM_*` endpoint and key when they are unset, and a set `TTS_SOURCE` still maps to its vendor. An unknown `TTS_SOURCE` is now an error. (epic 1)
- Translation runs on one client for any OpenAI-compatible endpoint, set by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TRANSLATE_MODEL`, `LLM_REVIEW_MODEL`, `LLM_TIMEOUT` and `LLM_MAX_CONCURRENCY`. The old `AI_SOURCE`, `OPENAI_*`, `GROQ_*` and `OPENROUTER_*` variables still work through a mapping; see the backend README. An unknown `AI_SOURCE` or an invalid timeout or concurrency is now an error.
- The web page calls only the `/v1` routes, through one hand-written client (`frontend/src/services/api.js`); a contract test fails if it calls a path not in the backend's OpenAPI paths (`frontend/src/test/fixtures/openapi-paths.json`, exported by `python -m scripts.export_openapi_paths` and checked by a backend test). The page no longer sends `provider` or checks `GET /` on load, shows the `model` that answered, stores the translation in history, never retries a failed request, and waits up to 5 minutes for whole-document, file and review calls (15 seconds otherwise). (epic 5)
