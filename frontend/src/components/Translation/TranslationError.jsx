import React from 'react';
import { CircleAlert } from 'lucide-react';
import { describeError } from '../../services/api';

/**
 * A failed translation: the server's message (or a readable one, never a raw status), the
 * failed segments of a file, and a button to try again. A missing model key gets its own title.
 */
const TranslationError = ({ error, onRetry, disabled = false }) => {
  if (!error) return null;
  const { title, message, segmentErrors } = describeError(error);
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
    >
      <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message}</p>
        {segmentErrors.length > 0 && (
          <ul aria-label="Failed segments" className="mt-1 list-disc pl-5 text-sm">
            {segmentErrors.map((s) => (
              <li key={s.segment} className="break-words">{s.message}</li>
            ))}
          </ul>
        )}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={disabled}
            className="mt-3 rounded-md border border-current px-3 py-1.5 text-sm font-medium hover:bg-red-100 disabled:opacity-50 dark:hover:bg-red-900"
          >
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

export default TranslationError;
