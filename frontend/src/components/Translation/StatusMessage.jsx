import React from 'react';
import ThinkingIndicator from '../UI/ThinkingIndicator';
import useElapsedSeconds from '../../hooks/useElapsedSeconds';

// A visitor's own provider can take this long or more (EST-7600); the page then says so.
export const SLOW_ANSWER_SECONDS = 20;

/**
 * A polite live region that is always in the page, so a screen reader reads each new message:
 * what is happening while `busy` (the words with the thinking dots after them), and the outcome
 * after. Empty when there is nothing to say. While busy it counts the seconds waited, hidden from
 * screen readers so they are not read every second, and after SLOW_ANSWER_SECONDS it says once,
 * in a second live region, that some providers are slow.
 */
const StatusMessage = ({ message, busy = false }) => {
  const seconds = useElapsedSeconds(busy);
  return (
    <>
      <p aria-live="polite" className="m-0 flex min-h-5 items-center gap-2 text-sm text-ink-muted">
        {message && (busy ? <ThinkingIndicator label={message.replace(/…$/, '')} /> : <span>{message}</span>)}
        {message && busy && seconds > 0 && (
          <span aria-hidden="true" className="tabular-nums">{`${seconds} s`}</span>
        )}
      </p>
      <p aria-live="polite" className="m-0 text-sm text-ink-muted">
        {busy && seconds >= SLOW_ANSWER_SECONDS ? 'Some providers take up to a minute.' : ''}
      </p>
    </>
  );
};

export default StatusMessage;
