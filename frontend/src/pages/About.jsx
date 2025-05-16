import React from 'react';

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">About LLM Translate</h1>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">What is LLM Translate?</h2>
        <p className="mb-4">
          LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages. This frontend application is built with React and Vite, providing a modern user interface for interacting with the translation service.
        </p>
        <p className="mb-4">
          Unlike traditional translation services, LLM Translate can better understand context, idioms, and cultural nuances, resulting in more natural and accurate translations.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Features</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Real-time translation powered by LLMs</li>
          <li>Auto-detect source language</li>
          <li>Support for a wide range of languages</li>
          <li>Multiple AI providers (OpenAI, Groq, OpenRouter)</li>
          <li>Spoken translations (Please note: this is a beta feature and uses an <em>English</em> voice for all audio.)</li>
          <li>Translation history</li>
          <li>Light/Dark Modes</li>
          <li>History Management</li>
          <li>Responsive design for all devices</li>
          <li>Copy to clipboard for source or translated text</li>
          <li>Swap languages and text with one click</li>
          <li>Character limit indicators</li>
          <li>Accessibility features (ARIA, screen reader support)</li>
          <li>Keyboard shortcuts for common actions</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Technology</h2>
        <p className="mb-4">
          LLM Translate is built with modern web technologies:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Frontend: React, Vite, Tailwind CSS, Material UI, Lucide React</li>
          <li>Backend: FastAPI (Python)</li>
          <li>AI Providers: OpenAI, Groq, OpenRouter (configurable)</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Open Source & Contributing</h2>
        <p className="mb-4">
          LLM Translate is an open-source project. Contributions, bug reports, and feature requests are welcome on our GitHub repository.
        </p>
        <p className="mb-4">
          This project is licensed under the MIT License.
        </p>
        <p>
          <a
            href="https://github.com/samestrin/llm-translate"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300"
          >
            View on GitHub →
          </a>
        </p>
      </div>
    </div>
  );
};

export default About;