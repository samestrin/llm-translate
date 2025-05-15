# LLM Translate Backend

A simple REST-based language translation application using Large Language Models (LLMs).

## Features

- Translation between languages using various AI providers (OpenAI, Groq, OpenRouter)
- Text-to-Speech conversion using configurable TTS providers (OpenAI, Groq)
- Provider selection via environment variables
- Detailed error handling and logging
- Asynchronous API for high performance

## Getting Started

### Prerequisites

- Python 3.9+
- pip (Python package manager)

### Installation

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
    # --- AI Service Selection ---
    AI_SOURCE="openai" # Options: "openai", "groq", "openrouter"

    # --- TTS Service Selection ---
    TTS_SOURCE="openai"

    # --- TTS Model Configuration ---
    TTS_MODEL="gpt-4o-mini-tts"

    # --- OpenAI Credentials ---
    OPENAI_API_KEY="YOUR_OPENAI_API_KEY"
    OPENAI_MODEL="gpt-4.1-mini-2025-04-14"

    # --- Groq Credentials ---
    GROQ_API_KEY="YOUR_GROQ_API_KEY"
    # ... other configuration options ...
    ```

### Running the Server

Start the development server:

```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## Configuration

The application is configured using environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_SOURCE` | AI provider for translation (openai, groq, openrouter) | openai |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `GROQ_API_KEY` | Groq API key | - |
| `OPENROUTER_API_KEY` | OpenRouter API key | - |
| `MODEL` | Model to use for translation | gpt-3.5-turbo |
| `TTS_SOURCE` | TTS provider for speech (openai, groq) | openai |
| `TTS_MODEL` | Model to use for text-to-speech | gpt-4o-mini-tts |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, WARNING, ERROR) | INFO |

## API Endpoints

### POST /translate

Translates text from one language to another.

**Request Body:**

```json
{
  "text": "Hello, world!",
  "from_lang": "English",
  "to_lang": "Spanish"
}
```

**Response:**

```json
{
"translated_text" : "¡Hola, mundo!" ,
"from_lang" : "English" ,
"to_lang" : "Spanish" ,
"service_used" : "openai" ,
"model_used" : "gpt-3.5-turbo"
}
```

### POST /speak
Converts text to speech using the configured TTS provider.

**Request Body:**

```json
{
"text" : "Hello, world!" ,
"lang" : "English" ,
"voice" : "alloy" ,
"response_format" : "mp3" ,
"instructions" : "Speak in a cheerful tone."
}
```

**Response:**
- Audio stream with appropriate Content-Type (e.g., audio/mpeg , audio/wav )
- The audio format is determined by the response_format parameter

**Example Using Curl:**

```bash
curl -X POST " http://localhost:8000/speak " \
-H "Content-Type: application/json" \
-d '{"text": "Hello, world!", "lang": "English", "response_format": "wav"}' \
--output speech.wav
```

### GET /

Health check endpoint.

**Response:**

```json
{
"message" : "llm-translate is running"
}
```

## Project Structure
```plaintext
backend/
├── llm_translate/
│   ├── api/
│   │   └── models.py           # Pydantic models for API requests/responses
│   ├── core/
│   │   └── service_selector.py # Service provider selection logic
│   ├── services/
│   │   ├── base_translator.py  # Abstract base class for translators
│   │   ├── base_speaker.py     # Abstract base class for TTS speakers
│   │   ├── openai_translator.py # OpenAI translation implementation
│   │   ├── openai_speaker.py   # OpenAI TTS implementation
│   │   ├── groq_translator.py  # Groq translation implementation
│   │   ├── groq_speaker.py     # Groq TTS implementation
│   │   └── openrouter_translator.py # OpenRouter translation implementation
│   └── utils/
│       ├── config.py           # Configuration loading
│       ├── exceptions.py       # Custom exception classes
│       └── logging.py          # Logging setup
├── tests/
│   ├── unit/                   # Unit tests
│   └── integration/            # Integration tests
├── .env.example                # Example environment variables
├── main.py                     # FastAPI application entry point
└── requirements.txt            # Python dependencies
```

## Error Handling
The API returns appropriate HTTP status codes and error messages:

- 400: Invalid request (missing parameters, etc.)
- 401: Authentication error (invalid API key)
- 403: Authorization error (insufficient permissions)
- 404: Resource not found
- 500: Server error (unexpected exceptions)
- 503: Service unavailable (provider API unavailable)
- 504: Gateway timeout (provider API timeout)

## Development
### Running Tests
```bash
pytest
```

### Adding New Providers

To add a new translation provider:

1. Create a new class that inherits from BaseTranslator
2. Implement the required methods
3. Update service_selector.py to include the new provider

To add a new TTS provider:

1. Create a new class that inherits from BaseSpeaker
2. Implement the required methods
3. Update service_selector.py to include the new provider

## License

This project is licensed under the MIT License - see the LICENSE file for details.