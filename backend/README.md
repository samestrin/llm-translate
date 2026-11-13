# LLM Translate: Backend

[![Star on GitHub](https://img.shields.io/github/stars/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/stargazers) [![Fork on GitHub](https://img.shields.io/github/forks/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/network/members) [![Watch on GitHub](https://img.shields.io/github/watchers/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/watchers)

![Version 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Built with Python](https://img.shields.io/badge/Built%20with-Python-green)](https://www.python.org/)

LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages. This is the backend, a simple, REST-based language translation and text-to-speech (TTS) application using Large Language Models (LLMs). It works with any OpenAI-compatible model endpoint, local or cloud. Built with Python, FastAPI, and Pydantic. FFmpeg is also required for full audio functionality.

## Table of Contents
- [LLM Translate: Backend](#llm-translate-backend)
 - [Brief Description](#brief-description)
 - [Installation](#installation)
 - [Usage Examples](#usage-examples)
 - [Features](#features)
 - [Requirements/Dependencies](#requirementsdependencies)
 - [Configuration](#configuration)
 - [Project Structure](#project-structure)
 - [API Documentation](#api-documentation)
 - [Related Documentation](#related-documentation) 
 - [Contributing Guidelines](#contributing-guidelines)
 - [License](#license)
 - [Acknowledgments](#acknowledgments)
 - [Share](#share)


## Brief Description
LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages. This is the backend, a simple, REST-based language translation and text-to-speech (TTS) application using Large Language Models (LLMs).

## Installation
1. **Clone the repository:**
 ```bash
git clone https://github.com/your-username/llm-translate.git # Replace with your repo URL
cd llm-translate/backend
```

2. **Create and activate a virtual environment:**
 ```bash
python3 -m venv venv
source venv/bin/activate # On Windows use `venv\Scripts\activate`
```

3. **Install dependencies:**
 ```bash
pip install -r requirements.txt
```
 For development, install development dependencies:
 ```bash
pip install -r requirements-dev.txt
```

4. **Set up environment variables:**
 Copy the example `.env.example` file to `.env`:
 ```bash
cp .env.example .env
```
 Edit the `.env` file and add your API keys and desired configuration (see [Configuration](#configuration) section below).

## Usage Examples
### Running the Development Server

Start the FastAPI development server using Uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will then be available at `http://localhost:8000`.

### Example: Translating Text using cURL

```bash
curl -X POST "http://localhost:8000/v1/translate" \
-H "Content-Type: application/json" \
-d '{
 "text": "Hello, world!",
 "from_lang": "English",
 "to_lang": "Spanish"
}'
```

### Example: Generating Speech using cURL

```bash
curl -X POST "http://localhost:8000/v1/speak" \
-H "Content-Type: application/json" \
-d '{
 "text": "Hello, world!",
 "lang": "English",
 "voice": "alloy",
 "response_format": "mp3"
}' \
--output speech.mp3
```

## Features
* **Any OpenAI-Compatible Model**: Translate with any OpenAI-compatible endpoint, local or cloud (OpenAI, Groq, OpenRouter, Ollama, vLLM and others), with a `translate` model tier and a `review` model tier.
* **Multi-Provider Text-to-Speech (TTS)**: Convert text into natural-sounding speech using:
 * OpenAI TTS
 * Groq TTS 
* **Configurable Services**: Easily switch between AI and TTS providers and models via environment variables.
* **Automatic Language Detection**: Supports "Auto-detect" for the source language in translation requests.
* **Asynchronous API**: Built with FastAPI for high performance and non-blocking I/O.
* **Robust Error Handling**: Detailed error responses and logging.
* **Docker Support**: Ready for containerized deployment with an included `Dockerfile`.

## Requirements/Dependencies
* Python3.9+
* pip (Python package manager)
* FFmpeg (for audio processing, especially if using TTS format conversion features)

## Configuration
The application is configured using environment variables defined in a `.env` file. Refer to `.env.example` for a full list of available options.

### Model endpoint

Translation uses one client for any OpenAI-compatible API (`POST {LLM_BASE_URL}/chat/completions`).

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_BASE_URL` | Base URL of the OpenAI-compatible API, e.g. `https://api.openai.com/v1`, `https://api.groq.com/openai/v1`, `https://openrouter.ai/api/v1`, `http://localhost:11434/v1`. | The legacy vendor's URL (see below), else `https://api.openai.com/v1` |
| `LLM_API_KEY` | Bearer key for the endpoint. Leave empty for endpoints that need none. | The legacy vendor's key, else none |
| `LLM_TRANSLATE_MODEL` | Model for the `translate` tier (the fast model that translates). | The legacy vendor's model, else `gpt-4.1-mini-2025-04-14` |
| `LLM_REVIEW_MODEL` | Model for the `review` tier (the reasoning model that reviews). | Same as `LLM_TRANSLATE_MODEL` |
| `LLM_TIMEOUT` | Seconds each model request may take. | `60` |
| `LLM_MAX_CONCURRENCY` | Most model requests in flight at once. | `4` |
| `LLM_SEGMENT_MAX_CHARS` | Longest segment, in characters, a long text is split into; a longer text is translated as a whole document (see `POST /v1/translate`). | `4000` |
| `LLM_MAX_SEGMENTS` | Most segments one document may have; more is a 413. | `50` |
| `LLM_SRT_MAX_LINE_CHARS` | Longest subtitle line; a longer translated SRT cue is re-wrapped to it. | `42` |
| `LLM_MAX_FILE_BYTES` | Largest file upload, in bytes; reading stops once it is exceeded and the file is rejected with a 413. | `10485760` (10 MiB) |
| `LLM_CACHE_SIZE` | Most translations the in-process LRU cache holds; `0` turns it off. The key is a hash of the text, languages, glossary, style guide, both models, the temperature (always 0) and the segment limits (`LLM_SEGMENT_MAX_CHARS`, `LLM_MAX_SEGMENTS`). A cached answer has `cached: true` and spends no tokens. Lost on restart. | `0` (off) |
| `SITE_URL` | Sent as the `HTTP-Referer` header when set (OpenRouter attribution). | - |
| `SITE_NAME` | Sent as the `X-Title` header when set (OpenRouter attribution). | - |

An invalid `LLM_TIMEOUT`, `LLM_MAX_CONCURRENCY`, `LLM_SEGMENT_MAX_CHARS`, `LLM_MAX_SEGMENTS`, `LLM_SRT_MAX_LINE_CHARS` or `LLM_MAX_FILE_BYTES`, a negative or non-numeric `LLM_CACHE_SIZE`, or an unknown `AI_SOURCE`, is an error, not a silent default.

### Legacy vendor variables

The old per-vendor variables still work. Any `LLM_*` variable you set wins; for each one you leave unset, `AI_SOURCE` (default `openai`) picks a vendor and that vendor's variables fill it in. The mapping is kept as data in `llm_translate/utils/config.py` (`LEGACY_PROVIDERS`).

| Legacy variable | Replaced by | Value it supplies |
|-----------------|-------------|-------------------|
| `AI_SOURCE="openai"` | `LLM_BASE_URL` | `https://api.openai.com/v1` |
| `AI_SOURCE="groq"` | `LLM_BASE_URL` | `https://api.groq.com/openai/v1` |
| `AI_SOURCE="openrouter"` | `LLM_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENAI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` | `LLM_API_KEY` | The key of the vendor `AI_SOURCE` picks |
| `OPENAI_MODEL` | `LLM_TRANSLATE_MODEL` | Default `gpt-4.1-mini-2025-04-14` |
| `GROQ_MODEL` | `LLM_TRANSLATE_MODEL` | Default `meta-llama/llama-4-maverick-17b-128e-instruct` |
| `OPENROUTER_MODEL` | `LLM_TRANSLATE_MODEL` | Default `qwen/qwen3-4b:free` |

### Text-to-speech and logging

| Variable | Description | Default |
|----------|-------------|---------|
| `TTS_BASE_URL` | Base URL of an OpenAI-compatible API; speech is posted to `{TTS_BASE_URL}/audio/speech`. | `LLM_BASE_URL` |
| `TTS_API_KEY` | Bearer key for the speech endpoint. | `LLM_API_KEY` |
| `TTS_MODEL` | Model for TTS (e.g. `gpt-4o-mini-tts`, `playai-tts`). | `gpt-4o-mini-tts` (the legacy vendor's model with `TTS_SOURCE`) |
| `TTS_VOICE` | Voice used when a request names none. Unset with a Kokoro model (a `TTS_MODEL` name containing `kokoro`), each language gets its own Kokoro voice: English `af_heart`, Spanish `ef_dora`, French `ff_siwis`, Italian `if_sara`, Portuguese `pf_dora`, Japanese `jf_alpha`, Chinese `zf_xiaobei`, Hindi `hf_alpha`; other languages use `af_heart`. | `alloy` (the legacy vendor's voice with `TTS_SOURCE`) |
| `TTS_FORMATS` | Comma list of formats the endpoint returns itself, preferred first (Groq: `wav`). Any other requested format is converted from the first one (needs ffmpeg). | `mp3,opus,aac,flac,wav` |
| `TTS_TIMEOUT` | Per-request timeout in seconds. | `60` |
| `TTS_SOURCE` | Legacy: `openai` or `groq` fills the URL, key (`OPENAI_API_KEY` / `GROQ_API_KEY`), model (`gpt-4o-mini-tts` / `playai-tts`), voice and formats for that vendor when the `TTS_*` variable is unset. An unknown value is an error. | unset |
| `LOG_LEVEL` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`). | `INFO` |

## Project Structure
A high-level overview of the backend directory:

```plaintext
backend/
├── llm_translate/ # Main application logic
│ ├── api/ # Pydantic models for API requests/responses
│ ├── core/ # Core components like service selection
│ ├── services/ # Translation and TTS service implementations
│ └── utils/ # Utility modules (config, exceptions, logging)
├── tests/ # Automated tests
│ ├── integration/ # Integration tests
│ └── unit/ # Unit tests
├── .env.example # Example environment variables
├── Dockerfile # Docker configuration for containerization
├── main.py # FastAPI application entry point
├── pytest.ini # Pytest configuration
├── README.md # This file
├── requirements-dev.txt # Development-specific Python dependencies
└── requirements.txt # Python dependencies for the application
```
*(Note: The file tree is a representation and might not include all files or exact current structure. Depth is limited for brevity.)*

## API Documentation
The API is versioned under `/v1`. The unversioned `/translate` and `/speak` still answer, with their original response and error shapes, but are deprecated: new callers should use the `/v1` routes.

### `POST /v1/translate`

Translates text and reports the model that answered and the tokens spent.

* **Request Body**:
 ```json
 {
 "text": "Text to translate",
 "from_lang": "Source language (e.g., English) or 'Auto-detect'",
 "to_lang": "Target language (e.g., Spanish)",
 "glossary": "Optional: terms to enforce (see below)",
 "style_guide": "Optional: tone, formality, audience and notes (see below)"
 }
 ```
* **Response**:
 ```json
 {
 "translation": "Translated text",
 "from_lang": "Source language as requested",
 "detected_lang": "The language the backend detected; present only when from_lang was Auto-detect",
 "to_lang": "Target language as requested",
 "model": "Model that answered, or null when no model was called",
 "usage": {"prompt_tokens": 12, "completion_tokens": 4, "total_tokens": 16},
 "glossary_misses": "Glossary terms the translation missed; empty when none",
 "cached": "true when the answer came from the cache (LLM_CACHE_SIZE) and no model was called"
 }
 ```

`usage` sums every model call, including the detection call when `from_lang` is `Auto-detect`. When a named `from_lang` equals `to_lang`, no model is called: the text comes back unchanged with `model` null and zero usage. When `Auto-detect` finds the target language, the text also comes back unchanged, but the detection call still counts: `model` is the model that detected it and `usage` is that call's tokens.

### Auto-detect

With `from_lang` set to `Auto-detect`, the reply also carries `detected_lang`: the language the detection call found, so a client can name the source afterwards (the web app's swap button uses it to translate back into the detected language). `from_lang` still echoes `Auto-detect`; `detected_lang` is absent when a named `from_lang` was sent. When the detected language is the target, the text comes back unchanged and `detected_lang` still names it.

```bash
curl -X POST "http://localhost:8000/v1/translate" \
-H "Content-Type: application/json" \
-d '{"text": "Hello, world!", "from_lang": "Auto-detect", "to_lang": "Spanish"}'
```

```json
{
  "translation": "¡Hola, mundo!",
  "from_lang": "Auto-detect",
  "detected_lang": "English",
  "to_lang": "Spanish",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 42, "completion_tokens": 6, "total_tokens": 48},
  "glossary_misses": [],
  "cached": false
}
```

### Glossary and style guide

A `glossary` is a list of entries:

| Field | Description |
|-------|-------------|
| `source_term` | The term as it appears in the source text. Required, not blank. |
| `target_term` | The translation to use. Required unless `do_not_translate` is true. |
| `note` | Optional context for the model, e.g. which sense of the term is meant. |
| `do_not_translate` | `true` keeps the term exactly as written. Default `false`. |

An entry applies only when its `source_term` occurs in `text`, matched case-insensitively as a substring; the prompt lists only the entries that apply. After translating, each applicable entry is checked: its `target_term` must appear in the translation (case-insensitive), and a do-not-translate term must appear unchanged (case-sensitive). Each one that does not is listed in `glossary_misses` as `{"term": source_term, "expected": text it looked for}`. A miss is reported in the 200 response, never as an error. A glossary entry without a `target_term` and without `do_not_translate` is a 422.

A `style_guide` has four optional text fields: `tone`, `formality`, `audience` and `notes`. The filled ones are stated in the prompt ahead of the glossary; blank ones are left out.

This request asks for "Panel"; the model wrote "tablero", so the response reports the miss:

```bash
curl -X POST "http://localhost:8000/v1/translate" \
-H "Content-Type: application/json" \
-d '{
  "text": "Open the Dashboard in LLM Translate to see your history.",
  "from_lang": "English",
  "to_lang": "Spanish",
  "glossary": [
    {"source_term": "Dashboard", "target_term": "Panel", "note": "the home screen"},
    {"source_term": "LLM Translate", "do_not_translate": true}
  ],
  "style_guide": {
    "tone": "friendly",
    "formality": "informal",
    "audience": "first-time users",
    "notes": "Address the reader as tú."
  }
}'
```

```json
{
  "translation": "Abre el tablero de LLM Translate para ver tu historial.",
  "from_lang": "English",
  "to_lang": "Spanish",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 118, "completion_tokens": 14, "total_tokens": 132},
  "glossary_misses": [{"term": "Dashboard", "expected": "Panel"}],
  "cached": false
}
```

The `/docs` page shows this example and a plain one for `POST /v1/translate`. `tests/integration/test_documented_examples.py` runs both, and the one above from each README, against a fake model endpoint and checks the responses match.

### Long documents

Text longer than `LLM_SEGMENT_MAX_CHARS` is translated as a whole document. It is split at paragraph boundaries (blank lines); a paragraph that is itself too long is split at its line boundaries. One extra call on the `translate` tier summarizes the document and lists its names and key terms; each segment is then translated with that summary and its previous and next segments as context, and the translated segments are joined with the original spacing between them. `usage` counts the summary and every segment; `glossary_misses` is checked over the whole document. Auto-detect reads only the first segment.

A document that needs more than `LLM_MAX_SEGMENTS` segments, or has a single line longer than `LLM_SEGMENT_MAX_CHARS`, is rejected with HTTP 413 (`payload_too_large_error`) before any model call. If any segment fails, the whole request fails and no partial text is returned: the error takes the first failed segment's status and type, and lists every failed segment in `segment_errors`:

 ```json
 {"error": {"type": "api_error", "message": "1 of 10 segments failed, so the document was not translated (segment 4 of 10: ...)", "details": null,
   "segment_errors": [{"segment": 4, "type": "api_error", "message": "Model endpoint error (HTTP 500). Please try again later."}]}}
 ```

### `POST /v1/translate/file`

Translates an uploaded file and returns it with the same structure, plus a report. The request is `multipart/form-data` with three fields: `file`, `from_lang` (or `Auto-detect`) and `to_lang`. The file extension names the format:

| Format | Extensions | What is translated | What stays |
|--------|------------|--------------------|------------|
| JSON | `.json` | String values | Keys, order, numbers, booleans, nulls |
| YAML | `.yaml`, `.yml` | String values | Keys, order, comments, anchors, quoting |
| gettext PO | `.po` | `msgstr` from each `msgid`, one per plural form | Comments, references, flags, context, obsolete entries |
| Markdown | `.md`, `.markdown` | Text | Code blocks and spans, link destinations, front matter, HTML |
| HTML | `.html`, `.htm` | Text nodes | Tags, attributes, comments, `script`/`style`/`pre`/`code` |
| SRT | `.srt` | Cue text | Cue numbers and timings; a line over `LLM_SRT_MAX_LINE_CHARS` is re-wrapped |

Placeholders and tags (`{name}`, `%s`, `%1$d`, ICU plurals, HTML and Markdown markup) are masked before the model and checked after. A segment that is only placeholders, numbers or punctuation is kept as it is and not sent to the model. With `Auto-detect`, one detection call on the file's first segments names the source language for the whole file.

Each segment (a value, a text node or a cue) is still translated in its own call, so placeholder checks and the cue count hold, but not blind to the rest of the file. When a file has more than one segment to translate, one extra call on the `translate` tier first summarizes its source text and lists its key terms and names with the translation to use for each, as for [long documents](#long-documents). Every segment is then sent with that summary and the two segments before and after it as read-only context, so a name such as "Scales" reads the same in every cue. `report.usage` counts the summary; each segment's prompt is longer by the summary and its neighbours. A one-segment file makes no extra call.

```bash
curl -X POST "http://localhost:8000/v1/translate/file" \
-F "file=@app.json" -F "from_lang=English" -F "to_lang=Spanish"
```

```json
{
  "content": "{\n  \"greeting\": \"Hola {name}, tienes %d mensajes\",\n  \"farewell\": \"Adiós\"\n}\n",
  "format": "json",
  "from_lang": "English",
  "to_lang": "Spanish",
  "report": {"segments": 2, "model": "gpt-4o-mini", "usage": {"prompt_tokens": 84, "completion_tokens": 12, "total_tokens": 96}}
}
```

`content` is the translated file. `report.segments` counts the file's segments; `model` and `usage` are as for `/v1/translate`. The file name is never echoed, in the response or in an error.

The file is read up to `LLM_MAX_FILE_BYTES`; a larger one, more than `LLM_MAX_SEGMENTS` segments, or a segment longer than `LLM_SEGMENT_MAX_CHARS` is a 413 before any model call. An unsupported extension, or an empty, binary, non-UTF-8 or malformed file, is a 400. If any segment fails (a placeholder the translation lost or changed, or a model error), the whole request fails and no file is returned: the error takes the first failed segment's status and type and lists every failed segment in `segment_errors`; for JSON, YAML and PO the message names the key:

 ```json
 {"error": {"type": "api_error", "message": "1 of 2 segments failed, so the file was not translated (segment 1 of 2: ...)", "details": null,
   "segment_errors": [{"segment": 1, "type": "api_error", "message": "Segment /greeting: the translation did not keep its placeholders (missing {name}; unexpected {nombre})."}]}}
 ```

### `POST /v1/speak`

Converts text to speech using the configured TTS endpoint.

* **Request Body**:
 ```json
 {
 "text": "Text to speak",
 "lang": "Language of the text (e.g., English)",
 "voice": "Optional: voice to use (e.g., 'alloy'). Defaults to TTS_VOICE, or with a Kokoro model and no TTS_VOICE, the Kokoro voice for lang.",
 "response_format": "Optional: audio format (e.g., 'mp3', 'wav', 'opus'). Defaults to 'mp3'.",
 "instructions": "Optional: additional instructions for the TTS model."
 }
 ```
* **Response**: An audio stream with the appropriate `Content-Type` (e.g., `audio/mpeg`, `audio/wav`).

### Errors

Every `/v1` route reports an error as `{"error": {"message": "...", "type": "..."}}` with the matching HTTP status (for example 400 for a bad request or invalid configuration on `/v1/translate`, 401 for a rejected key, 413 for a document or file over the segment or size limits, 429 for a rate limit, 500 for a TTS configuration error or a server error).

Neither translation route returns an empty translation. Blank `text` is a 400 and no model is called. A model answer that is empty (also after outer quotes are stripped) or does not match the chat completion format is a 500 with error type `api_error`.

### Deprecated: `POST /translate`

Same request as `/v1/translate`, same errors. The response keeps its original shape:

 ```json
 {
 "translated_text": "Translated text",
 "from_lang": "Source language as requested",
 "to_lang": "Target language",
 "service_used": "Value of AI_SOURCE, or 'unknown'",
 "model_used": "Configured translate model"
 }
 ```

### Deprecated: `POST /speak`

Same request and audio response as `/v1/speak`. Errors keep their original shape, `{"detail": "..."}`.

### `GET /`

A health check endpoint.

* **Response**:
 ```json
 {
 "message": "llm-translate is running"
 }
 ```

## Related Documentation

1. [Frontend Documentation](../../docs/frontend/README.md)
2. [Deployment Guide](../../docs/deployment_guide.md): For deploying this application.

## Contributing Guidelines

Contributions are welcome! Please follow these general guidelines:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Write clean, well-documented code adhering to Google Python Style Guide.
4. Add or update tests for your changes.
5. Ensure all tests pass.
6. Submit a pull request.

(Detailed contributing guidelines can be found here: [`CONTRIBUTING`](../CONTRIBUTING.md))

## License
This project is licensed under the MIT License. See the [LICENSE](../LICENSE.md) file for details.

## Acknowledgments
* Thanks to the creators of FastAPI, OpenAI, Groq, and OpenRouter.

## Share
[![Twitter](https://img.shields.io/badge/X-Tweet-blue)](https://twitter.com/intent/tweet?text=Check%20out%20this%20awesome%20project!&url=https://github.com/samestrin/llm-translate) [![Facebook](https://img.shields.io/badge/Facebook-Share-blue)](https://www.facebook.com/sharer/sharer.php?u=https://github.com/samestrin/llm-translate) [![LinkedIn](https://img.shields.io/badge/LinkedIn-Share-blue)](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/samestrin/llm-translate)

