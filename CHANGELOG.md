# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Fixed

- An empty or malformed model answer is now an error (HTTP 500, `api_error`) instead of an empty translation, and blank text to translate is rejected with HTTP 400 before any model call. Internally a translation now carries the model that answered and the tokens it spent, for the `/v1` API to report.

### Changed

- Translation runs on one client for any OpenAI-compatible endpoint, set by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TRANSLATE_MODEL`, `LLM_REVIEW_MODEL`, `LLM_TIMEOUT` and `LLM_MAX_CONCURRENCY`. The old `AI_SOURCE`, `OPENAI_*`, `GROQ_*` and `OPENROUTER_*` variables still work through a mapping; see the backend README. An unknown `AI_SOURCE` or an invalid timeout or concurrency is now an error.
