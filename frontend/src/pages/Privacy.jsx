import React from 'react';

const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">Privacy Policy</h1>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Privacy Matters</h2>
        <p className="mb-4">
          LLM Translate is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our translation service.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Information We Collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Translation Data:</strong> Text you submit for translation is processed in real-time and may be temporarily stored for the purpose of providing the service and improving translation quality.
          </li>
          <li>
            <strong>Usage Data:</strong> We may collect anonymized usage statistics (such as language pairs, feature usage, and error logs) to improve the application.
          </li>
          <li>
            <strong>Cookies & Local Storage:</strong> We use browser storage to save your settings and translation history (if enabled). No personal information is stored.
          </li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">How We Use Your Information</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>To provide and improve translation and text-to-speech services.</li>
          <li>To personalize your experience (e.g., theme, language, history).</li>
          <li>To monitor and enhance application performance and security.</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Third-Party Providers</h2>
        <p className="mb-4">
          LLM Translate uses third-party AI providers (such as OpenAI, Groq, and OpenRouter) to process translations and speech. Text submitted for translation may be sent to these providers according to their respective privacy policies.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Your Choices</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>You can disable translation history in the application settings.</li>
          <li>You may clear your translation history and reset settings at any time.</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Contact & Updates</h2>
        <p className="mb-4">
          For questions about this Privacy Policy, please open an issue or contact us via our <a href="https://github.com/samestrin/llm-translate" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">GitHub repository</a>.
        </p>
        <p>
          This policy may be updated from time to time. Please check this page for the latest version.
        </p>
      </div>
    </div>
  );
};

export default Privacy;