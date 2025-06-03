# LLM Translate: Frontend

[![Star on GitHub](https://img.shields.io/github/stars/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/stargazers) [![Fork on GitHub](https://img.shields.io/github/forks/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/network/members) [![Watch on GitHub](https://img.shields.io/github/watchers/samestrin/llm-translate?style=social)](https://github.com/samestrin/llm-translate/watchers)

![Version 1.0.0](https://img.shields.io/badge/Version-1.0.0-blue) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Built with Node.js](https://img.shields.io/badge/Built%20with-Node.js-green)](https://nodejs.org/)

LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages. This is the frontend application, built with Node, React, Vite, Material UI, and Tailwind CSS, providing the user interface for interacting with the translation service. This interface supports language translation, text-to-speech, keyboard shortcuts, copy to clipboard, and translation history management. This app is responsive and a11y compliant and follows the Web Content Accessibility Guidelines (WCAG) 2.1.

## Table of Contents
- [LLM Translate: Frontend](#llm-translate-frontend)
 - [Brief Description](#brief-description)
 - [Installation](#installation)
 - [Usage Examples](#usage-examples)
 - [Features](#features)
 - [Requirements/Dependencies](#requirementsdependencies)
 - [Configuration](#configuration)
 - [Project Structure](#project-structure)
 - [API Documentation](#api-documentation)
 - [Related Documentation](#related-documentation)
 - [Contributing](#contributing)
 - [License](#license)
 - [Acknowledgments](#acknowledgments)
 - [Share](#share)

## Brief Description
LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages. This is the frontend application, built with Node, React, Vite, Material UI, and Tailwind CSS, providing the user interface for interacting with the translation service.

## Installation
To get the frontend development environment running:

1. **Clone the repository (if you haven't already):**
 ```bash
 git clone https://github.com/samestrin/llm-translate.git
 cd llm-translate/frontend
 ```

2. **Install dependencies:**
 Using npm:
 ```bash
 npm install
 ```
 Or using yarn (if `yarn.lock` is present and preferred):
 ```bash
 yarn install
 ```

3. **Set up environment variables:**
 Create a `.env` file in the `frontend` directory. You can copy the example file if one is provided (e.g., `.env.example`).
 Example:
 ```
 VITE_API_URL=http://localhost:8000/
 VITE_APP_TITLE="LLM Translate"
 ```

## Usage Examples
1. **Run the development server:**
 ```bash
 npm run dev
 ```
 This will start the Vite development server, typically on `http://localhost:5173`.

2. **Build for production:**
 ```bash
 npm run build
 ```
 This will create a `dist` folder with the optimized production build.

3. **Preview the production build locally:**
 ```bash
 npm run preview
 ```

4. **Lint the code:**
 ```bash
 npm run lint
 ```

5. **Running with Docker (using Docker Compose):**
 If you have Docker and Docker Compose installed, you can build and run the frontend service (along with the backend if configured in `docker-compose.yml` at the root) using:
 ```bash
 # Navigate to the root directory of the project (where docker-compose.yml is)
 cd ../ 
 # Build and start all services defined in docker-compose.yml
 docker-compose up --build
 # To run in detached mode:
 # docker-compose up --build -d
 # To stop the services:
 # docker-compose down
 ```
 The frontend will typically be available at `http://localhost:3000`.

## Features
* **Real-time Translation:** Input text and get translations powered by LLMs.
* **Multiple Language Support:** Select from a wide range of source and target languages, including an "Auto-detect" option for the source language.
* **AI Provider Selection:** Choose from available AI providers (e.g., OpenAI, Groq, OpenRouter) if configured on the backend.
* **Text-to-Speech (TTS):** Listen to translated text (Note: Beta feature, may use a default English voice for all languages).
* **Translation History:** View, reuse, search, and delete past translations (if enabled).
* **Customizable Settings:**
 * Theme (Dark/Light mode)
 * Interface Language
 * AI Provider preference
 * Auto-translate on/off and delay
 * History management (enable/disable, max items)
* **Responsive Design:** User-friendly interface across different devices.
* **Copy to Clipboard:** Easily copy source or translated text.
* **Swap Languages & Text:** Quickly swap source/target languages and their corresponding text.
* **Character Limits:** Visual indicators for text area character limits.
* **Accessibility:** Includes ARIA attributes, keyboard navigation, and considerations for screen readers.
* **Keyboard Shortcuts:** For common actions like translate and toggling help.
* **Informational Pages:** About, Privacy Policy, Terms, and How AI Translation Works.

## Requirements/Dependencies
* **Node.js:** (e.g., >=18.x.x, check [`package.json`](package.json) for specific engine requirements if listed)
* **npm** (or **yarn**)

### Key Frontend Dependencies:
* **React:** For building the user interface.
* **Vite:** As the build tool and development server.
* **React Router DOM:** For client-side routing.
* **Tailwind CSS:** For utility-first styling.
* **Material UI (MUI):** For UI components and theming.
* **Axios:** For making HTTP requests to the backend.
* **Lucide React:** For icons.
* **date-fns:** For date formatting.
* **react-hot-toast:** For notifications.
* **uuid:** For generating unique IDs.
(See [`package.json`](package.json) for a full list)

## Configuration
Frontend configuration is primarily managed through:

* **Environment Variables (`.env`):**
 * `VITE_API_URL`: The base URL for the backend API.
 * Other `VITE_` prefixed variables can be added as needed and accessed via `import.meta.env`.
* **Application Settings (UI):** Users can configure preferences like theme, AI provider, and history settings directly in the application's settings page. These are typically stored in `localStorage`.
* **Vite Configuration (`vite.config.js`):** For build-related settings, aliases, plugins, etc.
* **Tailwind Configuration (`tailwind.config.js`):** For customizing the design system, theme, colors, fonts, etc.

## Project Structure
A high-level overview of the `frontend` directory:

```
frontend/
├── .env.example # Example environment variables
├── .eslintrc.cjs # ESLint configuration (older format if present)
├── eslint.config.js # ESLint configuration (newer flat format)
├── .gitignore # Specifies intentionally untracked files
├── Dockerfile # Instructions to build the Docker image
├── index.html # Main HTML entry point
├── package-lock.json # Records exact versions of dependencies
├── package.json # Project metadata and dependencies
├── postcss.config.js # PostCSS configuration (often for Tailwind)
├── README.md # This file
├── tailwind.config.js # Tailwind CSS configuration
├── vite.config.js # Vite build tool configuration
├── public/ # Static assets (e.g., favicon, images)
│ └── vite.svg # Example static asset
└── src/ # Main application source code
 ├── App.css # Global application styles
 ├── App.jsx # Root React component
 ├── index.css # Base styles and Tailwind imports
 ├── main.jsx # Application entry point
 ├── assets/ # Static assets like images, fonts (if any)
 ├── components/ # Reusable UI components
 │ ├── History/ # Components for the History page
 │ ├── Layout/ # Layout components (Header, Footer, etc.)
 │ ├── Translation/ # Components for the Translation interface
 │ └── UI/ # Generic UI elements (Button, Modal, Spinner, etc.)
 ├── contexts/ # React Context providers (Theme, Settings)
 ├── hooks/ # Custom React Hooks
 ├── pages/ # Page-level components (Home, Settings, About, etc.)
 ├── services/ # API interaction, local storage management
 └── utils/ # Utility functions, constants
```
*(Note: The file tree is a representation and might not include all files or exact current structure. Depth is limited for brevity.)*

## API Documentation
The frontend application interacts with a backend API. For details on the API endpoints, request/response formats, and authentication (if any), please refer to the backend API documentation.

A brief overview of typical interactions:
* **`/translate`**: Submits text for translation, along with source/target languages and AI provider preference.
* **`/speak`**: Submits text for text-to-speech conversion.

(See [Backend Documentation](../backend/README.md) for more details.)

## Related Documentation

1. [Backend Documentation](../../docs/backend/README.md): Including API Documentation for the frontend.
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
* Thanks to the creators of React, Vite, Tailwind CSS, Material UI, and other open-source libraries used in this project.

## Share
[![Twitter](https://img.shields.io/badge/X-Tweet-blue)](https://twitter.com/intent/tweet?text=Check%20out%20this%20awesome%20project!&url=https://github.com/samestrin/llm-translate) [![Facebook](https://img.shields.io/badge/Facebook-Share-blue)](https://www.facebook.com/sharer/sharer.php?u=https://github.com/samestrin/llm-translate) [![LinkedIn](https://img.shields.io/badge/LinkedIn-Share-blue)](https://www.linkedin.com/sharing/share-offsite/?url=https://github.com/samestrin/llm-translate)

