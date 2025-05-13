import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Description } from '@headlessui/react';

const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;
  
  // Handle object errors
  const errorMessage = typeof message === 'object' 
    ? JSON.stringify(message, null, 2) 
    : message;
  
  return (
    <div className={`rounded-md bg-red-50 dark:bg-red-900/30 p-4 ${className}`} role="alert" aria-live="assertive">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
          <Description className="mt-2 text-sm text-red-700 dark:text-red-300">
            <p>{errorMessage}</p>
          </Description>
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;