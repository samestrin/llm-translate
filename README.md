# LLM Translate: Full Stack Application

[![Star on GitHub](https://img.shields.io/github/stars/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/stargazers) [![Fork on GitHub](https://img.shields.io/github/forks/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/network/members) [![Watch on GitHub](https://img.shields.io/github/watchers/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/watchers)

![Version 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ](https://opensource.org/licenses/MIT)[![Built with Python](https://img.shields.io/badge/Built%20with-Python-green)](https://www.python.org/) [![Built with Node.js](https://img.shields.io/badge/Built%20with-Node.js-green)](https://nodejs.org/)

LLM Translate is an open-source translation tool that uses Large Language Models (LLMs) to deliver high-quality, nuanced translations across numerous languages. This full-stack project features a robust Python-based backend (FastAPI) and an intuitive Node/React-based frontend, working together to provide a seamless translation experience. It aims to offer advanced translation capabilities with a focus on accuracy, contextual understanding, and user accessibility.

## Table of Contents
- [LLM Translate: Full Stack Application](#llm-translate-full-stack-application)
  - [Brief Description](#brief-description)
  - [Quick Start](#quick-start)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Requirements/Dependencies](#requirementsdependencies)
  - [Installation Instructions](#installation-instructions)
    - [Clone the Repository](#1-clone-the-repository)
    - [Backend Setup](#2-backend-setup)
    - [Frontend Setup](#3-frontend-setup)
    - [Docker Compose (Recommended)](#4-docker-compose-recommended)
  - [Usage](#usage)
  - [Configuration](#configuration)
  - [API Documentation](#api-documentation)
    - [Glossary and style guide](#glossary-and-style-guide)
    - [The review pass](#the-review-pass)
    - [Translate a file](#translate-a-file)
    - [Translate an i18n file in CI](#translate-an-i18n-file-in-ci)
  - [Evaluation](#evaluation)
  - [Related Documentation](#related-documentation)
  - [Contributing Guidelines](#contributing-guidelines)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)
  - [Share](#share)

## Brief Description

LLM Translate is an open-source tool that leverages Large Language Models (LLMs) to provide high-quality, nuanced translations across a wide range of languages. It translates text and whole files (JSON, YAML, PO, Markdown, HTML and SRT) through any OpenAI-compatible endpoint, keeps placeholders and file structure intact, applies a glossary and style guide, and can run an optional review pass that flags the segments a person should read.

![The translation page: English text translated to Spanish](docs/images/translation-page.png)

*The screenshot is captured by `frontend/scripts/screenshot.mjs` (Playwright against the real backend, whose model endpoint is a fake OpenAI server, so no key is shown). A short GIF of the page in use is supplied by the project owner and added by hand; it is not generated.*

## Quick Start

Copy both example environment files (compose reads `backend/.env` and `frontend/.env` and fails without them), put your model endpoint and key in `backend/.env`, then start everything:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```

The page is at `http://localhost:3000` and the API at `http://localhost:8000` (`/docs` lists every route).

## Features

Discover what makes LLM Translate a versatile and user-friendly translation solution:

**Advanced Translation Capabilities:**
* **LLM-Powered Translations:** Experience intelligent, context-aware translations in real-time.
* **Multi-Provider Support:** Choose from leading AI providers like OpenAI, Groq, and OpenRouter for translation tasks, ensuring flexibility and access to diverse models.
* **Extensive Language Support:** Translate between 21 different languages with ease.
* **Glossary and Style Guide:** Keep terms consistent with a glossary (including terms never to translate), set tone, formality and audience, and see which glossary terms a translation missed.
* **Automatic Source Language Detection:** Simply start typing; the tool automatically identifies the input language.
* **Text-to-Speech (TTS) Output:** Listen to translations with our integrated spoken audio feature. (*Please note: This is a beta feature and currently uses an English voice for all languages.*)

**Enhanced User Experience:**
* **Sleek Interface:** Navigate a clean and modern UI with support for both Light and Dark modes.
* **Responsive Design:** Enjoy a consistent experience across desktops, tablets, and mobile devices.
* **Efficient Workflow:**
    * **Copy to Clipboard:** Easily copy source or translated text.
    * **Swap Languages:** Instantly switch between source and target languages and their corresponding text with a single click.
    * **Keyboard Shortcuts:** Speed up common actions using convenient keyboard commands.
* **Character Limit Indicators:** Keep track of text length to stay within provider limits.
* **Accessibility Focused:** Designed with ARIA attributes and screen reader compatibility for an inclusive experience.

**Translation Management:**
* **Translation History:** Access and manage your recent translations. The last 50 translations are automatically saved for quick reference and reuse.

This combination of powerful translation technology and user-centric design makes LLM Translate an ideal tool for a wide range of translation needs.

## Project Structure

A high-level overview of the project:

```plaintext
llm-translate/
├── backend/        # Python FastAPI backend application
│   ├── llm_translate/
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   ├── main.py
│   └── README.md   # Backend specific documentation
├── frontend/       # React Vite frontend application
│   ├── public/
│   ├── src/
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   └── README.md   # Frontend specific documentation
├── docker-compose.yml # Docker Compose configuration
└── README.md          # This file (Project Root README)
```
*(Note: The file tree is a representation and might not include all files or exact current structure. Depth is limited for brevity.)*

## Requirements/Dependencies
* Git
* Python 3.9+ (for backend)
* Node.js (e.g., >=18.x.x) and npm/yarn (for frontend)
* Docker and Docker Compose (recommended for easiest setup)

## Installation Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/samestrin/llm-translate.git
cd llm-translate
```

### 2. Backend Setup
Navigate to the `backend` directory and follow the instructions in its `README.md` file for specific package installations (typically using `pip`).
```bash
cd backend
# Follow instructions in backend/README.md
cd ..
```

### 3. Frontend Setup
Navigate to the `frontend` directory and follow the instructions in its `README.md` file for specific package installations (typically using `npm install` or `yarn install`).
```bash
cd frontend
# Follow instructions in frontend/README.md
cd ..
```

### 4. Docker Compose (Recommended)
This is the easiest way to get both the backend and frontend services running together. Ensure Docker and Docker Compose are installed. The `docker-compose.yml` file defines the services and reads `backend/.env` and `frontend/.env`, so copy the examples first.

From the project root directory (`llm-translate/`):
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose up --build
```
To run in detached mode:
```bash
docker compose up --build -d
```
* The backend API will typically be available at `http://localhost:8000`.
* The frontend application will typically be available at `http://localhost:3000`.

To stop the services:
```bash
docker compose down
```

## Usage 

Once the backend and frontend are running (either individually or via Docker Compose), access the frontend URL (e.g., `http://localhost:3000`) in your browser. The frontend application provides the user interface to input text, select languages, and receive translations. It interacts with the backend API for translation and text-to-speech functionality.


## Configuration

* **Backend**: Configured using environment variables in a `.env` file within the `backend` directory. See `backend/.env.example` and `backend/README.md` for details on required variables such as API keys for LLM providers.
* **Frontend**: Configured using environment variables in a `.env` file within the `frontend` directory (e.g., `VITE_API_URL` to point to the backend). See `frontend/.env.example` and `frontend/README.md` for details. User-specific settings like dark/light mode theme preferences are also available in the application UI.

## API Documentation

The backend provides a RESTful API for translation and Text-to-Speech (TTS) services. Key endpoints include:
* `POST /v1/translate`: For text translation; reports the model used and the tokens spent.
* `POST /v1/translate/file`: For translating a JSON, YAML, PO, Markdown, HTML or SRT file; returns the file with its structure and placeholders intact, plus a report (segments, model, tokens).
* `POST /v1/speak`: For generating speech from text.

The unversioned `/translate` and `/speak` still work with their original responses but are deprecated.

### Glossary and style guide

`POST /v1/translate` takes two optional inputs that steer the translation:

* `glossary`: terms to keep consistent. Each entry has a `source_term`, the `target_term` to use, an optional `note` for the model, and `do_not_translate` (keep the term exactly as written; then no `target_term` is needed). An entry applies only when its source term occurs in the text, matched case-insensitively.
* `style_guide`: `tone`, `formality`, `audience` and free `notes`, all optional. The filled fields go into the prompt.

The response lists every applicable term the translation missed in `glossary_misses`, with the text it expected. A miss is reported, never an error, so check this list. Here the model wrote "tablero" instead of the glossary's "Panel":

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

The same example is on the `/docs` page. The exact matching rules are in the [backend README](./backend/README.md#glossary-and-style-guide).

### The review pass

`POST /v1/translate` (JSON field) and `POST /v1/translate/file` (form field) take `review=off|on`, default `off`. With `on`, after the fast model has translated every segment:

1. Each segment's translation is **back-translated** into the source language on the fast (`translate`) tier.
2. A reasoning model (the `review` tier, set with `LLM_REVIEW_MODEL`) **reviews** the segment: it compares source, translation and back-translation and reports errors with a category (`meaning`, `terminology`, `fluency`, `style`, `format`) and a severity (`minor`, `major`, `critical`).
3. A segment with a major or critical error is **revised once** on the review tier, then back-translated and reviewed again. A segment still rated major or critical is **flagged** with the reason.

A flagged segment keeps its best translation — the revised text whenever a revision ran and kept its placeholders, even when the second review still flags the segment, as in the example below; the earlier translation only when the revision came back empty or lost or changed a placeholder (the flag says which) — and does not fail the request; if a review model call itself fails (timeout, connection, HTTP error), the request fails as for the translation step. Review is advice for a human, not a gate: read every flag and judge the translation yourself. Reasons from the review model are model-written text, so treat them as a starting hint, not a verdict. Some flags instead start with a fixed prefix the pipeline writes itself — `review could not be read` and `revision lost or changed a placeholder; the earlier translation is kept` (these two are whole fixed messages with no detail), or `revision came back empty` and `still wrong after revision` (these two are prefixes followed by the model's error detail).

The reply gains a `review` report (`report.review` for files). `flags` lists every segment that needs a human: `segment` (number from 1, or the key for JSON, YAML and PO files), `reason`, `severity` (the highest error the reason names, `major` or `critical`; `null` for a fixed pipeline message such as `review could not be read`), and the segment's `source` and `translation` (its best translation, as in the reply), so a client can show the flagged text without re-splitting the document. `steps` gives the model and the tokens spent per step kind — each entry sums every call of that kind, so a revised segment runs back-translation and review twice and those two entries cover both calls; `usage` sums them, and the top-level `usage` includes the review calls. Cost is reported as tokens (prompt, completion, total) with no money figure. Example (`review=on`, one segment flagged):

```json
{
  "translation": "Abra el tablero.",
  "from_lang": "English",
  "to_lang": "Spanish",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 460, "completion_tokens": 210, "total_tokens": 670},
  "glossary_misses": [],
  "cached": false,
  "review": {
    "flags": [
      {
        "segment": 1,
        "reason": "still wrong after revision: major meaning error: \"open\" rendered as \"abrir\" loses the UI-imperative sense",
        "severity": "major",
        "source": "Open the dashboard.",
        "translation": "Abra el tablero."
      }
    ],
    "steps": [
      {"step": "translation", "model": "gpt-4o-mini", "usage": {"prompt_tokens": 118, "completion_tokens": 14, "total_tokens": 132}},
      {"step": "back_translation", "model": "gpt-4o-mini", "usage": {"prompt_tokens": 96, "completion_tokens": 30, "total_tokens": 126}},
      {"step": "review", "model": "o4-mini", "usage": {"prompt_tokens": 180, "completion_tokens": 120, "total_tokens": 300}},
      {"step": "revision", "model": "o4-mini", "usage": {"prompt_tokens": 66, "completion_tokens": 46, "total_tokens": 112}}
    ],
    "usage": {"prompt_tokens": 460, "completion_tokens": 210, "total_tokens": 670}
  }
}
```

Reading this report: review added three step kinds (back-translation, review, revision) and 538 tokens on top of the translation; the flagged segment ran back-translation and review twice, so those two entries each sum two calls; the revision step ran, so a serious error was found, and its flag means the second review still rated the segment major or critical — a human should check segment 1 before shipping it.

Review multiplies the model calls per segment: a back-translation and a review for every segment (roughly 2-3x the translation cost in tokens), plus a revision and a second back-translation and review for each segment with a serious error. Turn it on when a human check matters; leave it off for cheap bulk translation.

### Translate a file

`POST /v1/translate/file` takes the file as a form upload; the extension names the format. The reply holds the translated file in `content` and a `report` (with `review=on` the report also carries the review section described above):

```bash
curl -X POST "http://localhost:8000/v1/translate/file" \
-F "file=@messages.json" \
-F "from_lang=English" \
-F "to_lang=Spanish"
```

With `messages.json` containing `{"greeting": "Hello, {name}!", "save": "Save"}`, the response is:

```json
{
  "content": "{\n  \"greeting\": \"¡Hola, {name}!\",\n  \"save\": \"Guardar\"\n}",
  "format": "json",
  "from_lang": "English",
  "to_lang": "Spanish",
  "report": {
    "segments": 2,
    "model": "gpt-4o-mini",
    "usage": {"prompt_tokens": 120, "completion_tokens": 18, "total_tokens": 138}
  }
}
```

Keys and the `{name}` placeholder are kept; only the values are translated.

### Translate an i18n file in CI

This GitHub Actions job translates `locales/en.json` into Spanish on every push and fails if the API returns an error. It needs a running instance (here the `LLM_TRANSLATE_URL` repository variable) and `jq`, which the runner already has:

```yaml
name: translate-locales
on: push
jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Translate locales/en.json to Spanish
        env:
          LLM_TRANSLATE_URL: ${{ vars.LLM_TRANSLATE_URL }}
        run: |
          curl --fail-with-body -sS -X POST "$LLM_TRANSLATE_URL/v1/translate/file" \
            -F "file=@locales/en.json" -F "from_lang=English" -F "to_lang=Spanish" \
            | jq -r .content > locales/es.json
      - name: Fail on a malformed file
        run: jq empty locales/es.json
```

## Evaluation

The eval set (`evals/`, sources and licenses in `evals/SOURCES.md`) holds app strings, a Markdown page and an SRT file per language, each with a reference translation. `python evals/run.py --api <endpoint>` translates all three with `review` off and on and scores the result; the table below is the committed run, `evals/results/2026-11-05.json`, on **deepseek-v4.1-flash**.

| Language | Review | chrF | Placeholders | Glossary | Flag rate | Tokens |
|---|---|---|---|---|---|---|
| es | off | 81.6 | 100% | 3/3 | n/a | 27875 |
| es | on | 80.8 | 100% | 3/3 | 0% | 133945 |
| fr | off | 79.0 | 100% | 3/3 | n/a | 33374 |
| fr | on | 78.8 | 100% | 2/3 | 0% | 176409 |
| ja | off | 72.1 | 100% | 3/3 | n/a | 32160 |
| ja | on | 70.8 | 100% | 3/3 | 1% | 184343 |
| pt-BR | off | 82.4 | 100% | 3/3 | n/a | 30106 |
| pt-BR | on | 83.0 | 100% | 3/3 | 0% | 133290 |

* **chrF** is `sacrebleu` chrF (0-100) against the reference translation.
* **Placeholders** is the share of app strings whose placeholders (`{name}`, `%d`, `${x}`) survived unchanged.
* **Glossary** is glossary terms the translation kept, out of the terms present.
* **Flag rate** is review flags per segment (`n/a` with review off). **Tokens** is everything spent, so review costs about 4-6x the tokens of the plain run here.

The numbers are for one model on a small set. They show the pipeline keeps placeholders and glossary terms, not that any language is perfect; see `evals/README.md` for how to reproduce them.

For detailed API documentation, including request/response schemas and parameters, please refer to the **[API Documentation section in the backend README.md](./backend/README.md#api-documentation)** or `/docs` on the running backend service, e.g., `http://localhost:8000/docs`). The frontend consumes these APIs.

## Related Documentation

* **[Backend README](./backend/README.md)**: Detailed information about the backend service.
* **[Frontend README](./frontend/README.md)**: Detailed information about the frontend application.
* **[Deployment Guide](./docs/deployment_guide.md)**: Deployment guide for various environments.

## Contributing Guidelines

Contributions are welcome! Please follow these general guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix.
3.  Write clean, well-documented code.
4.  Add or update tests for your changes.
5.  Ensure all tests pass.
6.  Submit a pull request.

(Detailed contributing guidelines can be found here: [`CONTRIBUTING`](CONTRIBUTING.md))

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE.md) file for details.

## Acknowledgments

* Thanks to the creators of FastAPI, OpenAI, Groq, and OpenRouter used by the backend.
* Thanks to the creators of React, Vite, Tailwind CSS, Material UI, and other open-source libraries used in the frontend.

## Share

[![Twitter](https://img.shields.io/badge/X-Tweet-blue)](https://twitter.com/intent/tweet?text=Check%20out%20this%20awesome%20project!&url=https://github.com/samestrin/llm-translate) [![Facebook](https://img.shields.io/badge/Facebook-Share-blue)](https://www.facebook.com/sharer/sharer.php?u=https://github.com/samestrin/llm-translate) [![LinkedIn](https://img.shields.io/badge/LinkedIn-Share-blue)](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/samestrin/llm-translate)