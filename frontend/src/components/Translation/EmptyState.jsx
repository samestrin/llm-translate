import React from 'react';

export const EXAMPLE_SENTENCE = 'Our office is closed on Monday, but the online shop stays open.';

/** One line: what to do first, and a sample sentence (a chip) to start from. */
const EmptyState = ({ onExample }) => (
  <section aria-label="Start here" className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
    <span>Type or paste text, pick a language, then press Translate (or Ctrl+Enter). Or try a sample:</span>
    <button
      type="button"
      onClick={() => onExample(EXAMPLE_SENTENCE)}
      className="chip"
      title={EXAMPLE_SENTENCE}
    >
      {EXAMPLE_SENTENCE}
    </button>
  </section>
);

export default EmptyState;
