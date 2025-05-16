import React from 'react';

const LLMInfo = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">How AI-Powered Machine Translation Works</h1>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Neural Machine Translation</h2>
        <p className="mb-4">
          Modern AI translation uses neural networks trained on massive multilingual datasets. Unlike traditional rule-based systems, these models learn patterns and relationships between languages directly from data, allowing them to handle complex linguistic nuances.
        </p>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Contextual Understanding</h2>
        <p className="mb-4">
          Large Language Models (LLMs) excel at understanding context, which enables them to:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Disambiguate words with multiple meanings based on surrounding text</li>
          <li>Preserve the tone and style of the original content</li>
          <li>Handle idiomatic expressions and cultural references</li>
          <li>Maintain consistency across longer passages</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Zero-Shot and Few-Shot Learning</h2>
        <p className="mb-4">
          Advanced LLMs can translate between language pairs they weren't explicitly trained on by leveraging their general language understanding. This capability allows them to:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>Translate between low-resource language pairs</li>
          <li>Adapt to specialized domains with minimal examples</li>
          <li>Handle rare or newly emerging language combinations</li>
        </ol>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Why AI Translations Are Different</h2>
        <p className="mb-4">
          Compared to traditional translation methods, AI-powered translation offers:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>More natural-sounding output</li>
          <li>Better handling of context-dependent meanings</li>
          <li>Continuous improvement as models are updated</li>
          <li>Ability to adapt to specific styles or tones when prompted</li>
        </ul>
      </div>

      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Limitations</h2>
        <p className="mb-4">
          While powerful, AI translation still has some limitations:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>May struggle with highly specialized or technical content</li>
          <li>Can occasionally hallucinate or invent content</li>
          <li>May not perfectly capture cultural nuances</li>
          <li>Quality varies between language pairs based on training data</li>
        </ul>
      </div>
    </div>
  );
};

export default LLMInfo;