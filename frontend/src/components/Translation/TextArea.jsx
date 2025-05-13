import React from 'react';
import { Field, Label, Textarea, Description } from '@headlessui/react';
import { X } from 'lucide-react';
import { Tooltip } from '../UI/Tooltip';

const TextArea = ({ 
  value, 
  onChange, 
  placeholder, 
  label,
  id,
  maxLength = 5000,
  readOnly = false,
  onClear,
  className = ''
}) => {
  const characterCount = value.length;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isAtLimit = characterCount >= maxLength;

  return (
    <div className={`relative w-full ${className}`}>
      <Field disabled={readOnly}>
        {label && (
          <Label htmlFor={id} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1 data-disabled:opacity-70">
            {label}
          </Label>
        )}
        <div className="relative">
          <Textarea
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            readOnly={readOnly}
            maxLength={maxLength}
            rows={8}
            className={`w-full rounded-md border ${
              isAtLimit 
                ? 'border-red-500 dark:border-red-700' 
                : 'border-secondary-300 dark:border-secondary-600'
            } bg-white dark:bg-secondary-800 px-3 py-2 text-secondary-900 dark:text-white shadow-sm 
            data-focus:ring-2 data-focus:ring-primary-500 data-focus:border-primary-500
            data-disabled:cursor-default data-disabled:bg-secondary-50 data-disabled:dark:bg-secondary-900`}
          />
          {!readOnly && value && (
            <Tooltip content="Clear text">
              <button
                type="button"
                onClick={onClear}
                className="absolute top-2 right-2 p-1 rounded-full text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 focus:outline-none focus:ring-2 focus:ring-primary-500 z-10"
                aria-label="Clear text"
              >
                <X className="h-4 w-4" />
              </button>
            </Tooltip>
          )}
        </div>
        {!readOnly && (
          <Description className={`mt-1 text-xs flex justify-end ${
            isAtLimit 
              ? 'text-red-600 dark:text-red-400' 
              : isNearLimit 
                ? 'text-amber-600 dark:text-amber-400' 
                : 'text-secondary-500 dark:text-secondary-400'
          } data-disabled:opacity-70`}>
            {characterCount}/{maxLength} characters
            {isNearLimit && !isAtLimit && (
              <Tooltip content="You're approaching the character limit" className="ml-1">
                <span className="inline-block ml-1 cursor-help">⚠️</span>
              </Tooltip>
            )}
            {isAtLimit && (
              <Tooltip content="You've reached the maximum character limit" className="ml-1">
                <span className="inline-block ml-1 cursor-help">⛔</span>
              </Tooltip>
            )}
          </Description>
        )}
      </Field>
    </div>
  );
};

export default TextArea;