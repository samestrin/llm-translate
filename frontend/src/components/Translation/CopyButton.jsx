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

  // Determine button appearance based on state
  const getButtonVariant = () => "contained";
  
  const getButtonColor = () => {
    if (copyError) return "error";
    if (copied) return "success";
    return "primary";
  };
  
  const getButtonStyle = () => {
    const baseStyle = {
      textTransform: 'none',
      fontSize: '0.875rem',
      px: 2, // Changed to match Translate button
      py: 1, // Changed to match Translate button
      minWidth: 'auto',
      lineHeight: 1,
    };
    
    if (copyError) {
      return {
        ...baseStyle,
        backgroundColor: 'var(--error-100)',
        color: 'var(--error-700)',
        '&.MuiButton-root:hover': {
          backgroundColor: 'var(--error-200)',
        },
      };
    } else if (copied) {
      return {
        ...baseStyle,
        backgroundColor: 'var(--success-100)',
        color: 'var(--success-700)',
        '&.MuiButton-root:hover': {
          backgroundColor: 'var(--success-200)',
        },
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: 'var(--primary-100)',
        color: 'var(--primary-800)',
        '&.MuiButton-root:hover': {
          backgroundColor: 'var(--primary-200)',
        },
      };
    }
  };

  return (
    <Button
      onClick={handleCopy}
      disabled={disabled || !text}
      variant={getButtonVariant()}
      color={getButtonColor()}
      sx={getButtonStyle()}
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