# LLM Translate: Full Stack Application

[![Star on GitHub](https://img.shields.io/github/stars/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/stargazers) [![Fork on GitHub](https://img.shields.io/github/forks/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/network/members) [![Watch on GitHub](https://img.shields.io/github/watchers/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/watchers)

![Version 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg) ](https://opensource.org/licenses/MIT)[![Built with Python](https://img.shields.io/badge/Built%20with-Python-green)](https://www.python.org/) [![Built with Node.js](https://img.shields.io/badge/Built%20with-Node.js-green)](https://nodejs.org/)

LLM Translate is an open-source translation tool that uses Large Language Models (LLMs) to deliver high-quality, nuanced translations across numerous languages. This full-stack project features a robust Python-based backend (FastAPI) and an intuitive Node/React-based frontend, working together to provide a seamless translation experience. It aims to offer advanced translation capabilities with a focus on accuracy, contextual understanding, and user accessibility.

## Table of Contents
- [LLM Translate: Full Stack Application](#llm-translate-full-stack-application)
  - [Brief Description](#brief-description)
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
  - [Related Documentation](#related-documentation)
  - [Contributing Guidelines](#contributing-guidelines)
  - [License](#license)
  - [Acknowledgments](#acknowledgments)
  - [Share](#share)

## Brief Description

LLM Translate is an open-source tool that leverages Large Language Models (LLMs) to provide high-quality, nuanced translations across a wide range of languages.

## Features

Discover what makes LLM Translate a versatile and user-friendly translation solution:

**Advanced Translation Capabilities:**
* **LLM-Powered Translations:** Experience intelligent, context-aware translations in real-time.
* **Multi-Provider Support:** Choose from leading AI providers like OpenAI, Groq, and OpenRouter for translation tasks, ensuring flexibility and access to diverse models.
* **Extensive Language Support:** Translate between 21 different languages with ease.
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
This is the easiest way to get both the backend and frontend services running together. Ensure Docker and Docker Compose are installed. The `docker-compose.yml` file defines the services.

From the project root directory (`llm-translate/`):
```bash
docker-compose up --build
```
To run in detached mode:
```bash
docker-compose up --build -d
```
* The backend API will typically be available at `http://localhost:8000`.
* The frontend application will typically be available at `http://localhost:3000`.

To stop the services:
```bash
docker-compose down
```

## Usage 

Once the backend and frontend are running (either individually or via Docker Compose), access the frontend URL (e.g., `http://localhost:3000`) in your browser. The frontend application provides the user interface to input text, select languages, and receive translations. It interacts with the backend API for translation and text-to-speech functionality.


## Configuration

* **Backend**: Configured using environment variables in a `.env` file within the `backend` directory. See `backend/.env.example` and `backend/README.md` for details on required variables such as API keys for LLM providers.
* **Frontend**: Configured using environment variables in a `.env` file within the `frontend` directory (e.g., `VITE_API_URL` to point to the backend). See `frontend/.env.example` and `frontend/README.md` for details. User-specific settings like dark/light mode theme preferences are also available in the application UI.

## API Documentation

The backend provides a RESTful API for translation and Text-to-Speech (TTS) services. Key endpoints include:
* `/translate/`: For text translation.
* `/speak/`: For generating speech from text.

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