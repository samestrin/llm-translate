import React, { useState, useCallback, memo, useEffect } from 'react';
import { Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ErrorIcon from '@mui/icons-material/Error';
import { copyToClipboard } from '../../utils/helpers';

const CopyButton = memo(({ text, onCopy, disabled }) => {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Reset states after unmounting to prevent memory leaks
  useEffect(() => {
    return () => {
      if (copied) setCopied(false);
      if (copyError) setCopyError(false);
    };
  }, [copied, copyError]);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    
    try {
      const success = await copyToClipboard(text);
      
      if (success) {
        setCopied(true);
        setCopyError(false);
        if (onCopy) onCopy();
        
        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      } else {
        setCopyError(true);
        setTimeout(() => {
          setCopyError(false);
        }, 2000);
      }
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyError(true);
      setTimeout(() => {
        setCopyError(false);
      }, 2000);
    }
  }, [text, onCopy]);

  return (
    <Button
      onClick={handleCopy}
      disabled={disabled || !text}
      variant="outlined"
      startIcon={
        copyError ? (
          <ErrorIcon fontSize="small" />
        ) : copied ? (
          <CheckIcon fontSize="small" />
        ) : (
          <ContentCopyIcon fontSize="small" />
        )
      }
      aria-label={copied ? 'Copied' : copyError ? 'Copy failed' : 'Copy to clipboard'}
    >
      {copyError ? 'Failed' : copied ? 'Copied!' : 'Copy'}
    </Button>
  );
});

CopyButton.displayName = 'CopyButton';

export default CopyButton;