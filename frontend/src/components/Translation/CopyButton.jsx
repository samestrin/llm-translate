import React, { useState } from 'react';
import { Button } from '@headlessui/react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../utils/helpers';
import { Tooltip } from '../UI/Tooltip';

const CopyButton = ({ text, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    
    const success = await copyToClipboard(text);
    
    if (success) {
      setCopied(true);
      if (onCopy) onCopy();
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const tooltipContent = !text 
    ? "No text to copy" 
    : copied 
      ? "Copied to clipboard!" 
      : "Copy to clipboard";

  return (
    <Tooltip content={tooltipContent}>
      <Button
        onClick={handleCopy}
        disabled={!text}
        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-md 
          ${copied
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
            : 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100'
          } 
          data-hover:${!copied ? 'bg-primary-200 dark:bg-primary-800' : ''}
          data-disabled:bg-secondary-100 data-disabled:text-secondary-400 data-disabled:cursor-not-allowed data-disabled:dark:bg-secondary-800 data-disabled:dark:text-secondary-600
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors`}
        aria-label={copied ? 'Copied' : 'Copy to clipboard'}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-1" />
            <span>Copy</span>
          </>
        )}
      </Button>
    </Tooltip>
  );
};

export default CopyButton;