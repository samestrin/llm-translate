# llm-translate

[![Star on GitHub](https://img.shields.io/github/stars/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/stargazers) [![Fork on GitHub](https://img.shields.io/github/forks/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/network/members) [![Watch on GitHub](https://img.shields.io/github/watchers/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/watchers)

![Version 0.1](https://img.shields.io/badge/Version-0.1-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Built with Python](https://img.shields.io/badge/Built%20with-Python-green)](https://www.python.org/) [![Framework](https://img.shields.io/badge/Framework-FastAPI-green.svg)](https://fastapi.tiangolo.com/) 
<!-- Add other badges as needed, e.g., build status, coverage -->

`llm-translate` is a simple REST-based language translation application that leverages Large Language Models (LLMs) to perform translations. It supports multiple AI providers like OpenAI, Groq, and OpenRouter, configurable via environment variables.

## Features

*   **Multiple LLM Providers:** Easily switch between OpenAI, Groq, and OpenRouter for translation.
*   **REST API:** Simple POST endpoint (`/translate`) to submit text for translation.
*   **Configurable:** API keys, models, and AI service provider are managed through a `.env` file.
*   **Async Operations:** Built with FastAPI for high-performance asynchronous request handling.
*   **Dockerized:** Comes with a `Dockerfile` for easy containerization and deployment.
*   **Structured Logging:** Comprehensive logging for monitoring and debugging.
*   **Custom Error Handling:** Detailed error responses for easier troubleshooting.

## Requirements

*   Python 3.10+
*   Pip (Python package installer)
*   Docker (Optional, for containerized deployment)

## Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/llm-translate.git
    cd llm-translate
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    Install development dependencies (optional):
    ```bash
    pip install -r requirements-dev.txt
    ```

4.  **Set up environment variables:**
    Copy the example `.env.example` file to `.env`:
    ```bash
    cp .env.example .env
    ```
    Edit the `.env` file and add your API keys and desired configuration:
    ```dotenv
    # --- AI Service Configuration ---
    AI_SOURCE="openai" # Options: "openai", "groq", "openrouter"

    # --- OpenAI Credentials ---
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    OPENAI_MODEL="gpt-4.1-mini-2025-04-14"

    # --- Groq Credentials ---
    GROQ_API_KEY="YOUR_GROQ_API_KEY"
    GROQ_MODEL="meta-llama/llama-4-maverick-17b-128e-instruct"

    # --- OpenRouter Credentials ---
    OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY"
    OPENROUTER_MODEL="qwen/qwen3-4b:free" # Example: "openai/gpt-3.5-turbo", "google/gemini-flash-1.5"

    # --- Logging Configuration ---
    LOG_LEVEL="INFO" # Options: "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"

    # --- OpenRouter Specific (Optional) ---
    # SITE_URL="YOUR_WEBSITE_URL" # For X-Title and HTTP-Referer headers for OpenRouter
    # SITE_NAME="YOUR_APP_NAME"   # For X-Title header for OpenRouter
    ```

## Usage

### Running the Application

Once installed and configured, run the application using Uvicorn:

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### Making a Translation Request

Send a POST request to the `/translate` endpoint with a JSON payload:

**Request:**
```json
{
  "text": "Hello, world!",
  "from_lang": "English",
  "to_lang": "Spanish"
}
```

**Example using `curl`:**
```bash
curl -X POST "http://127.0.0.1:8000/translate" \
-H "Content-Type: application/json" \
-d '{
  "text": "Hello, world!",
  "from_lang": "English",
  "to_lang": "Spanish"
}'
```

**Successful Response (Example):**
```json
{
  "translated_text": "¡Hola, mundo!",
  "from_lang": "English",
  "to_lang": "Spanish",
  "service_used": "openai",
  "model_used": "gpt-4.1-mini-2025-04-14"
}
```

### Health Check

A health check endpoint is available at GET `/`:

```bash
curl http://127.0.0.1:8000/
```

**Response:**
```json
{
  "message": "llm-translate is running"
}
```

## Configuration

The application is configured via environment variables defined in a `.env` file in the project root. See `.env.example` for all available options.

*   `AI_SOURCE`: Specifies the LLM provider to use (`openai`, `groq`, `openrouter`).
*   `*_API_KEY`: API key for the respective service.
*   `*_MODEL`: Specific model to use for the service.
*   `LOG_LEVEL`: Sets the application's logging level.
*   `SITE_URL` / `SITE_NAME` (Optional for OpenRouter): Used for `HTTP-Referer` and `X-Title` headers.

## Project Structure

A high-level overview of the project structure:

```
.
├── Dockerfile                  # Docker configuration for containerization
├── README.md                   # This file
├── .env.example                # Example environment variables
├── main.py                     # FastAPI application entry point
├── requirements.txt            # Python dependencies
├── requirements-dev.txt        # Python development dependencies
├── llm_translate/              # Main application package
│   ├── __init__.py
│   ├── api/                    # API models and potentially endpoint routers
│   │   ├── __init__.py
│   │   └── models.py           # Pydantic models for request/response
│   ├── core/                   # Core logic, e.g., service selection
│   │   ├── __init__.py
│   │   └── service_selector.py
│   ├── services/               # AI translation service integrations
│   │   ├── __init__.py
│   │   ├── base_translator.py  # Abstract base class for translators
│   │   ├── openai_translator.py
│   │   ├── groq_translator.py
│   │   └── openrouter_translator.py
│   └── utils/                  # Utility functions (config, logging, exceptions)
│       ├── __init__.py
│       ├── config.py
│       ├── exceptions.py
│       └── logging.py
└── tests/                      # Automated tests
    ├── __init__.py
    ├── integration/            # Integration tests
    └── unit/                   # Unit tests
```

## API Documentation

The API is self-documenting thanks to FastAPI. Once the application is running, interactive API documentation (Swagger UI) is available at `http://127.0.0.1:8000/docs` and alternative documentation (ReDoc) at `http://127.0.0.1:8000/redoc`.

**Endpoints:**

*   `GET /`: Health check.
*   `POST /translate`: Translates text.
    *   **Request Body:** `TranslationRequest` (see `llm_translate/api/models.py`)
        *   `text: str` (Text to translate)
        *   `from_lang: str` (Source language)
        *   `to_lang: str` (Target language)
    *   **Response Body:** `TranslationResponse` (see `llm_translate/api/models.py`)
        *   `translated_text: str`
        *   `from_lang: str`
        *   `to_lang: str`
        *   `service_used: str`
        *   `model_used: str`

## Docker Deployment

To build and run the application using Docker:

1.  **Build the Docker image:**
    ```bash
    docker build -t llm-translate .
    ```

2.  **Run the Docker container:**
    You can pass environment variables directly or use a `.env` file with Docker.
    To use an env_file (recommended):
    ```bash
    docker run -d -p 8000:8000 --env-file .env --name llm-translate-app llm-translate
    ```
    To pass environment variables directly (example for OpenAI):
    ```bash
    docker run -d -p 8000:8000 \
      -e AI_SOURCE="openai" \
      -e OPENAI_API_KEY="YOUR_OPENAI_API_KEY" \
      -e OPENAI_MODEL="gpt-4.1-mini-2025-04-14" \
      -e LOG_LEVEL="INFO" \
      --name llm-translate-app llm-translate
    ```

The application will be accessible at `http://localhost:8000`.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/your-feature-name`).
3.  Make your changes.
4.  Write tests for your changes.
5.  Ensure all tests pass (`python -m pytest`).
6.  Format your code (e.g., using Black, Flake8, or Ruff).
7.  Commit your changes (`git commit -m 'Add some feature'`).
8.  Push to the branch (`git push origin feature/your-feature-name`).
9.  Open a Pull Request.

Please ensure your code adheres to the project's coding standards and includes appropriate documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details (if one exists, otherwise state "MIT License").

## Acknowledgments

*   FastAPI community for an excellent web framework.
*   OpenAI, Groq, and OpenRouter for their powerful LLM APIs.
