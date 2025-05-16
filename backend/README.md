# LLM Translate: Backend

[![Star on GitHub](https://img.shields.io/github/stars/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/stargazers) [![Fork on GitHub](https://img.shields.io/github/forks/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/network/members) [![Watch on GitHub](https://img.shields.io/github/watchers/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/watchers)

![Version<version>](https://img.shields.io/badge/Version-<version>-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Built with Python](https://img.shields.io/badge/Built%20with-Python-green)](https://www.python.org/)

LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages. This is the backend, a simple, REST-based language translation and text-to-speech (TTS) application using Large Language Models (LLMs). It supports multiple AI providers for flexibility and performance. Built with Python, FastAPI, and Pydantic. FFmpeg is also required for full audio functionality.

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
* **Multi-Provider Translation**: Translate text between various languages using different AI providers:
 * OpenAI
 * Groq
 * OpenRouter
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

Key configuration variables:

| Variable | Description | Default (if not set in `.env`) | Example in `.env.example` |
|----------------------|-----------------------------------------------------------------------------|---------------------------------------|---------------------------------------|
| `AI_SOURCE` | AI provider for translation ("openai", "groq", "openrouter") | `openai` | `"openai"` |
| `OPENAI_API_KEY` | Your OpenAI API key. | - | `"YOUR_OPENAI_API_KEY"` |
| `OPENAI_MODEL` | OpenAI model for translation. | `gpt-4.1-mini-2025-04-14` | `"gpt-4.1-mini-2025-04-14"` |
| `GROQ_API_KEY` | Your Groq API key. | - | `"YOUR_GROQ_API_KEY"` |
| `GROQ_MODEL` | Groq model for translation. | `meta-llama/llama-4-maverick-17b-128e-instruct` | `"meta-llama/llama-4-maverick-17b-128e-instruct"` |
| `OPENROUTER_API_KEY` | Your OpenRouter API key. | - | `"YOUR_OPENROUTER_API_KEY"` |
| `OPENROUTER_MODEL` | OpenRouter model for translation. | `qwen/qwen3-4b:free` | `"qwen/qwen3-4b:free"` |
| `SITE_URL` | Your website URL (for OpenRouter `HTTP-Referer` header). | - | `"YOUR_WEBSITE_URL"` |
| `SITE_NAME` | Your app name (for OpenRouter `X-Title` header). | - | `"YOUR_APP_NAME"` |
| `TTS_SOURCE` | TTS provider for speech ("openai", "groq"). | `openai` | `"openai"` |
| `TTS_MODEL` | Model for TTS (e.g., OpenAI's `gpt-4o-mini-tts`, Groq's `gemma-2b-it-tts`). | `gpt-4o-mini-tts` | `"gpt-4o-mini-tts"` |
| `LOG_LEVEL` | Logging level ("DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"). | `INFO` | `"INFO"` |

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

(Detailed contributing guidelines can be found here: [`CONTRIBUTING.md`](../CONTRIBUTING.md))

## License
This project is licensed under the MIT License. See the [LICENSE](../LICENSE.md) file for details.

## Acknowledgments
* Thanks to the creators of FastAPI, OpenAI, Groq, and OpenRouter.

## Share
[![Twitter](https://img.shields.io/badge/X-Tweet-blue)](https://twitter.com/intent/tweet?text=Check%20out%20this%20awesome%20project!&url=https://github.com/samestrin/llm-translate) [![Facebook](https://img.shields.io/badge/Facebook-Share-blue)](https://www.facebook.com/sharer/sharer.php?u=https://github.com/samestrin/llm-translate) [![LinkedIn](https://img.shields.io/badge/LinkedIn-Share-blue)](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/samestrin/llm-translate)

