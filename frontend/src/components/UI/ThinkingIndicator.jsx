import React from 'react';

/**
 * The words, then three bouncing dots after them, as in llm-pdf-chatbot. A screen reader hears
 * the words and an ellipsis; the dots are decoration. Reduced motion keeps them still.
 */
const ThinkingIndicator = ({ label = 'Thinking' }) => (
  <span className="thinking">
    <span className="thinking-label">{label}</span>
    <span className="visually-hidden">…</span>
    <span className="thinking-dots" aria-hidden="true">
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      <span className="thinking-dot" />
    </span>
  </span>
);

export default ThinkingIndicator;
