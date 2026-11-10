import React, { useId } from 'react';

export const EXAMPLE_SENTENCE = 'Our office is closed on Monday, but the online shop stays open.';

/** What to do first on an empty text box, and an example sentence to start from. */
const EmptyState = ({ onExample }) => {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-md border border-line bg-surface-muted p-4 text-sm text-ink">
      <h2 id={headingId} className="mb-2 text-base font-semibold">Start here</h2>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-ink-muted">
        <li>Type or paste text in the box below.</li>
        <li>Pick the language to translate to.</li>
        <li>Press Translate (or Ctrl+Enter).</li>
      </ol>
      <p className="mb-2 text-ink-muted">No text to hand? Try this one:</p>
      <button
        type="button"
        onClick={() => onExample(EXAMPLE_SENTENCE)}
        className="rounded-md border border-line bg-surface px-3 py-2 text-left text-ink hover:border-brand"
      >
        {EXAMPLE_SENTENCE}
      </button>
    </section>
  );
};

export default EmptyState;
