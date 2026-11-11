import React from 'react';
import ThinkingIndicator from '../UI/ThinkingIndicator';

/**
 * A polite live region that is always in the page, so a screen reader reads each new message:
 * what is happening while `busy` (the words with the thinking dots after them), and the outcome
 * after. Empty when there is nothing to say.
 */
const StatusMessage = ({ message, busy = false }) => (
  <p aria-live="polite" className="m-0 flex min-h-5 items-center gap-2 text-sm text-ink-muted">
    {message && (busy ? <ThinkingIndicator label={message.replace(/…$/, '')} /> : <span>{message}</span>)}
  </p>
);

export default StatusMessage;
