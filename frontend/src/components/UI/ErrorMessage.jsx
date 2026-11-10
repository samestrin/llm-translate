import React from 'react';
import { CircleAlert } from 'lucide-react';

const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;

  // Handle object errors
  const errorMessage = typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

  return (
    <div
      role="alert"
      className={`flex gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200 ${className}`}
    >
      <CircleAlert size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">Error</p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{errorMessage}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
