import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  TextField, 
  FormControl, 
  FormLabel, 
  FormHelperText, 
  IconButton,
  Box,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import { Tooltip } from '../UI/Tooltip';

const TextArea = React.memo(({ 
  value, 
  onChange, 
  placeholder, 
  label,
  id,
  maxLength = 5000,
  readOnly = false,
  onClear,
  className = '',
  autoFocus = false,
  ariaDescribedBy, // Prop to allow parent to pass additional describedby ids
  ariaLabel // Prop to allow custom aria-label if label prop is not sufficient
}) => {
  const textareaRef = useRef(null);
  
  // Auto-focus functionality
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);
  
  // Memoize derived values to prevent recalculation on every render
  const characterCount = useMemo(() => value.length, [value]);
  const isNearLimit = useMemo(() => characterCount > maxLength * 0.8 && characterCount < maxLength, [characterCount, maxLength]);
  const isAtLimit = useMemo(() => characterCount >= maxLength, [characterCount, maxLength]);
  
  // Memoize the clear button handler
  const handleClear = useCallback(() => {
    if (onClear) {
      onClear();
    }
    // Focus the textarea after clearing
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [onClear]);

  // Handle resize functionality and keyboard navigation
  const handleKeyDown = useCallback((e) => {
    // Allow Ctrl+Enter to submit forms
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.target.form?.requestSubmit();
    }
  }, []);

  // Generate a unique ID for the description
  const descriptionId = useMemo(() => 
    `${id}-description`, 
    [id]
  );

  // Generate an ID for the clear button
  const clearButtonId = useMemo(() => 
    `${id}-clear-button`,
    [id]
  );

  // Determine aria-describedby value
  const describedByIds = useMemo(() => {
    const ids = [descriptionId];
    if (ariaDescribedBy) ids.push(ariaDescribedBy);
    if (!readOnly && value) ids.push(clearButtonId);
    return ids.join(' ');
  }, [descriptionId, ariaDescribedBy, readOnly, value, clearButtonId]);
  
  // Define the text color for the character count
  const getCountColor = () => {
    if (isAtLimit) return 'var(--color-danger)';
    if (isNearLimit) return 'var(--color-warn)';
    return 'var(--color-muted)';
  };

  return (
    <Box className={`relative w-full ${className}`}>
      <FormControl 
        fullWidth 
        variant="outlined"
      >
        {label && (
          <FormLabel 
            htmlFor={id} 
            sx={{ mb: 1 }}
          >
            {label}
          </FormLabel>
        )}
        <Box sx={{ position: 'relative' }}>
          <TextField
            inputRef={textareaRef}
            id={id}
            value={value}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            label={label}
            inputProps={{
              // Read-only, not disabled: the result stays focusable, selectable and readable.
              readOnly,
              maxLength: maxLength,
              'aria-label': ariaLabel || label,
              'aria-describedby': describedByIds,
              'aria-invalid': isAtLimit ? 'true' : 'false',
              'aria-required': className.includes('required') ? 'true' : 'false'
            }}
            multiline
            rows={7}
            fullWidth
            variant="outlined"
            // The result box sits on the sunken surface, so it reads as output, not a field to type in.
            sx={readOnly ? { '& .MuiOutlinedInput-root': { backgroundColor: 'var(--color-surface-sunken)' } } : undefined}
          />
          {!readOnly && value && (
            <Tooltip content="Clear text">
              <IconButton
                id={clearButtonId}
                onClick={handleClear}
                aria-label="Clear text"
                size="small"
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  color: 'var(--color-muted)',
                  '&:hover': {
                    color: 'var(--color-text)',
                    backgroundColor: 'var(--color-surface-sunken)'
                  },
                  opacity: 0,
                  transition: 'opacity 0.2s',
                  '.MuiBox-root:hover &': {
                    opacity: 1
                  },
                  '&:focus': {
                    opacity: 1
                  }
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {/* Character count and warnings/errors */}
        {!readOnly && (
          <FormHelperText
            id={descriptionId}
            sx={{
              mt: 1,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              color: getCountColor(),
              transition: 'color 0.2s'
            }}
            {...(isAtLimit && { 'aria-live': 'assertive', role: 'alert' })}
            {...(isNearLimit && { 'aria-live': 'polite', role: 'status' })}
          >
            <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center' }}>
              <span className="sr-only">Character count:</span> 
              {characterCount}/{maxLength}
              
              {isNearLimit && (
                <Tooltip content="You're approaching the character limit" className="ml-1">
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      ml: 1,
                      cursor: 'help',
                      color: 'var(--color-warn)'
                    }} 
                    aria-hidden="true"
                  >
                    <WarningAmberIcon sx={{ fontSize: '0.875rem' }} />
                    <span className="sr-only">. Warning: approaching character limit.</span>
                  </Box>
                </Tooltip>
              )}
              
              {isAtLimit && (
                <Tooltip content="You've reached the maximum character limit" className="ml-1">
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      ml: 1,
                      cursor: 'help',
                      color: 'var(--color-danger)'
                    }} 
                    aria-hidden="true"
                  >
                    <ErrorIcon sx={{ fontSize: '0.875rem' }} />
                    <span className="sr-only">. Error: maximum character limit reached.</span>
                  </Box>
                </Tooltip>
              )}
            </Typography>
          </FormHelperText>
        )}
      </FormControl>
    </Box>
  );
});

// Add a display name for better debugging
TextArea.displayName = 'TextArea';

export default TextArea;