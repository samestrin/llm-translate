# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

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

### Removed

- The per-vendor translator classes (OpenAI, Groq, OpenRouter) and the service selector; every vendor runs on the one OpenAI-compatible client, and `AI_SOURCE` still maps to it. (epic 1)

### Deprecated

- `POST /translate` and `POST /speak`: use the `/v1` routes. Both still answer with their original response and error shapes. (epic 1)

### Fixed

- An unexpected server error on `/translate` no longer echoes the internal exception text in the error's `details`; it is logged instead. (epic 1)
- An empty or malformed model answer is now an error (HTTP 500, `api_error`) instead of an empty translation, and blank text to translate is rejected with HTTP 400 before any model call. Internally a translation now carries the model that answered and the tokens it spent, for the `/v1` API to report.

### Changed

- Text-to-speech runs on one client for any OpenAI-compatible `/audio/speech` endpoint, set by `TTS_*` variables (`TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMATS`, `TTS_TIMEOUT`); it shares the `LLM_*` endpoint and key when they are unset, and a set `TTS_SOURCE` still maps to its vendor. An unknown `TTS_SOURCE` is now an error. (epic 1)
- Translation runs on one client for any OpenAI-compatible endpoint, set by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TRANSLATE_MODEL`, `LLM_REVIEW_MODEL`, `LLM_TIMEOUT` and `LLM_MAX_CONCURRENCY`. The old `AI_SOURCE`, `OPENAI_*`, `GROQ_*` and `OPENROUTER_*` variables still work through a mapping; see the backend README. An unknown `AI_SOURCE` or an invalid timeout or concurrency is now an error.
