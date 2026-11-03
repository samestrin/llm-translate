# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## Unreleased

### Changed

- Text-to-speech runs on one client for any OpenAI-compatible `/audio/speech` endpoint, set by `TTS_*` variables (`TTS_BASE_URL`, `TTS_API_KEY`, `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMATS`, `TTS_TIMEOUT`); it shares the `LLM_*` endpoint and key when they are unset, and a set `TTS_SOURCE` still maps to its vendor. An unknown `TTS_SOURCE` is now an error. (epic 1)
- Translation runs on one client for any OpenAI-compatible endpoint, set by `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_TRANSLATE_MODEL`, `LLM_REVIEW_MODEL`, `LLM_TIMEOUT` and `LLM_MAX_CONCURRENCY`. The old `AI_SOURCE`, `OPENAI_*`, `GROQ_*` and `OPENROUTER_*` variables still work through a mapping; see the backend README. An unknown `AI_SOURCE` or an invalid timeout or concurrency is now an error.
