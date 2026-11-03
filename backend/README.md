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
curl -X POST "http://localhost:8000/translate" \
-H "Content-Type: application/json" \
-d '{
 "text": "Hello, world!",
 "from_lang": "English",
 "to_lang": "Spanish"
}'
```

### Example: Generating Speech using cURL

```bash
curl -X POST "http://localhost:8000/speak" \
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
| `SITE_URL` | Sent as the `HTTP-Referer` header when set (OpenRouter attribution). | - |
| `SITE_NAME` | Sent as the `X-Title` header when set (OpenRouter attribution). | - |

An invalid `LLM_TIMEOUT` or `LLM_MAX_CONCURRENCY`, or an unknown `AI_SOURCE`, is an error, not a silent default.

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
| `TTS_MODEL` | Model for TTS (e.g. `gpt-4o-mini-tts`, `playai-tts`). | `gpt-4o-mini-tts` |
| `TTS_VOICE` | Voice used when a request names none. | `alloy` |
| `TTS_FORMATS` | Comma list of formats the endpoint returns itself, preferred first (Groq: `wav`). Any other requested format is converted from the first one (needs ffmpeg). | `mp3,opus,aac,flac,wav` |
| `TTS_TIMEOUT` | Per-request timeout in seconds. | `60` |
| `TTS_SOURCE` | Legacy: `openai` or `groq` fills the URL, key (`OPENAI_API_KEY` / `GROQ_API_KEY`), voice and formats for that vendor when the `TTS_*` variable is unset. An unknown value is an error. | unset |
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
The API provides the following main endpoints:

### `POST /translate`

Translates text from a source language to a target language.

* **Request Body**:
 ```json
 {
 "text": "Text to translate",
 "from_lang": "Source language (e.g., English) or 'Auto-detect'",
 "to_lang": "Target language (e.g., Spanish)"
 }
 ```
* **Response**:
 ```json
 {
 "translated_text": "Translated text",
 "from_lang": "Actual source language used",
 "to_lang": "Target language",
 "service_used": "Name of the AI service provider used",
 "model_used": "Name of the model used for translation"
 }
 ```

### `POST /speak`

Converts text to speech using the configured TTS provider.

* **Request Body**:
 ```json
 {
 "text": "Text to speak",
 "lang": "Language of the text (e.g., English)",
 "voice": "Optional: voice to use (e.g., 'alloy', specific to provider)",
 "response_format": "Optional: audio format (e.g., 'mp3', 'wav', 'opus'). Defaults to 'mp3'.",
 "instructions": "Optional: additional instructions for the TTS model."
 }
 ```
* **Response**: An audio stream with the appropriate `Content-Type` (e.g., `audio/mpeg`, `audio/wav`).

### `GET /`

A health check endpoint.

* **Response**:
 ```json
 {
 "message": "llm-translate is running"
 }
 ```

For detailed error responses and status codes, the API returns structured JSON objects when errors occur (e.g.,400 for bad requests,401 for authentication issues,500 for server errors).

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

