import React from 'react';

const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">Terms and Conditions</h1>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Acceptance of Terms</h2>
        <p className="mb-4">
          By using LLM Translate, you agree to these Terms and Conditions. If you do not agree, please do not use this service.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Use of Service</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>LLM Translate is provided for personal and non-commercial use.</li>
          <li>You are responsible for the content you submit for translation.</li>
          <li>Do not use the service for unlawful, harmful, or abusive purposes.</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Intellectual Property</h2>
        <p className="mb-4">
          LLM Translate is open-source software licensed under the MIT License. You may use, modify, and distribute the software in accordance with the license terms.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Disclaimer</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Translations are provided “as is” without warranty of any kind.</li>
          <li>We do not guarantee the accuracy, reliability, or suitability of translations for any purpose.</li>
          <li>Use of third-party AI providers is subject to their own terms and privacy policies.</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Limitation of Liability</h2>
        <p className="mb-4">
          To the fullest extent permitted by law, LLM Translate and its contributors are not liable for any damages arising from the use or inability to use this service.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Changes to Terms</h2>
        <p className="mb-4">
          We may update these Terms and Conditions at any time. Continued use of the service constitutes acceptance of the revised terms.
        </p>
        <p>
          For questions or concerns, please visit our <a href="https://github.com/samestrin/llm-translate" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">GitHub repository</a>.
        </p>
      </div>
    </div>
  );
};

export default Terms;