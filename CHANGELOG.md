# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Added

- `POST /v1/translate` returns the translation with the model that answered and the tokens spent (`translation`, `from_lang`, `to_lang`, `model`, `usage`; auto-detect included in `usage`), and `POST /v1/speak` returns speech; both report errors as `{"error": {...}}`. (epic 1)
- The interactive API docs at `/docs` describe both `/v1` routes with request and response examples and the errors each can return. (epic 1)

### Deprecated

- `POST /translate` and `POST /speak`: use the `/v1` routes. Both still answer with their original response and error shapes. (epic 1)

### Fixed

- An unexpected server error on `/translate` no longer echoes the internal exception text in the error's `details`; it is logged instead. (epic 1)
- An empty or malformed model answer is now an error (HTTP 500, `api_error`) instead of an empty translation, and blank text to translate is rejected with HTTP 400 before any model call. Internally a translation now carries the model that answered and the tokens it spent, for the `/v1` API to report.

### Changed

- Text-to-speech runs on one client for any OpenAI-compatible `/audio/speech` endpoint, set by `TTS_*` variables (`TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMATS`, `TTS_TIMEOUT`); it shares the `LLM_*` endpoint and key when they are unset, and a set `TTS_SOURCE` still maps to its vendor. An unknown `TTS_SOURCE` is now an error. (epic 1)
- Translation runs on one client for any OpenAI-compatible endpoint, set by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TRANSLATE_MODEL`, `LLM_REVIEW_MODEL`, `LLM_TIMEOUT` and `LLM_MAX_CONCURRENCY`. The old `AI_SOURCE`, `OPENAI_*`, `GROQ_*` and `OPENROUTER_*` variables still work through a mapping; see the backend README. An unknown `AI_SOURCE` or an invalid timeout or concurrency is now an error.
