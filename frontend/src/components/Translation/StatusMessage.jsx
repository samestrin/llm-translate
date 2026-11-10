import React from 'react';

/**
 * A polite live region that is always in the page, so a screen reader reads each new message:
 * what is happening while `busy`, and the outcome after. Empty when there is nothing to say.
 */
const StatusMessage = ({ message, busy = false }) => (
  <p aria-live="polite" className="flex min-h-5 items-center gap-2 text-sm text-ink-muted">
    {busy && message && (
      <span aria-hidden="true" className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
    )}
    {message && <span>{message}</span>}
  </p>
);

export default StatusMessage;
