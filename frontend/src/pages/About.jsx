import React from 'react';

const About = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">About LLM Translate</h1>
      
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">What is LLM Translate?</h2>
        <p className="mb-4">
          LLM Translate is an open-source translation tool that leverages Large Language Models (LLMs) to provide high-quality translations between multiple languages.
        </p>
        <p className="mb-4">
          Unlike traditional translation services, LLM Translate can better understand context, idioms, and cultural nuances, resulting in more natural and accurate translations.
        </p>
      </div>
      
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Features</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Support for multiple languages</li>
          <li>Context-aware translations</li>
          <li>Multiple AI provider options</li>
          <li>Translation history</li>
          <li>Customizable settings</li>
          <li>Dark/light mode</li>
        </ul>
      </div>
      
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Technology</h2>
        <p className="mb-4">
          LLM Translate is built with modern web technologies:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Frontend: React, Vite, Tailwind CSS</li>
          <li>Backend: FastAPI (Python)</li>
          <li>AI Services: OpenAI, Anthropic, Google AI</li>
        </ul>
      </div>
      
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Open Source</h2>
        <p className="mb-4">
          LLM Translate is an open-source project. Contributions, bug reports, and feature requests are welcome on our GitHub repository.
        </p>
        <p>
          <a 
            href="https://github.com/yourusername/llm-translate" 
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