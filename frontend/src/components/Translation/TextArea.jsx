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
import { useTheme } from '@mui/material/styles';

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
  const theme = useTheme(); // Add this line to access the current theme
  
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
  
  // Define the border color based on the character limit and theme (matches LanguageSelector)
  const getBorderColor = () => {
    if (isAtLimit) return theme.palette.error[500];
    if (readOnly) return theme.palette.mode === 'dark' ? theme.palette.secondary[800] : theme.palette.secondary[200];
    return theme.palette.mode === 'dark' ? theme.palette.secondary[700] : theme.palette.secondary[300];
  };

  // Define the text color for the character count
  const getCountColor = () => {
    if (isAtLimit) return 'var(--error-600)';
    if (isNearLimit) return 'var(--warning-600)';
    return 'var(--secondary-500)';
  };

  return (
    <Box className={`relative w-full ${className}`}>
      <FormControl 
        disabled={readOnly} 
        fullWidth 
        variant="outlined"
      >
        {label && (
          <FormLabel 
            htmlFor={id} 
            sx={{
              color: readOnly 
                ? (theme.palette.mode === 'dark' ? theme.palette.secondary[600] : theme.palette.secondary[400])
                : (theme.palette.mode === 'dark' ? theme.palette.secondary[200] : theme.palette.secondary[700]),
              mb: 1,
              fontSize: '0.875rem',
              fontWeight: 500
            }}
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
            disabled={readOnly}
            label={label}
            inputProps={{
              maxLength: maxLength,
              'aria-label': ariaLabel || label,
              'aria-describedby': describedByIds,
              'aria-invalid': isAtLimit ? 'true' : 'false',
              'aria-required': className.includes('required') ? 'true' : 'false'
            }}
            multiline
            rows={8}
            fullWidth
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: getBorderColor(),
                  borderWidth: '1px',
                  transition: 'all 0.2s ease-in-out'
                },
                '&:hover fieldset': {
                  borderColor: !readOnly 
                    ? theme.palette.primary[300]
                    : getBorderColor()
                },
                '&.Mui-focused fieldset': {
                  borderColor: theme.palette.primary[500],
                  borderWidth: '2px',
                },
                '&.Mui-disabled fieldset': {
                  borderColor: theme.palette.mode === 'dark' ? theme.palette.secondary[800] : theme.palette.secondary[200],
                  backgroundColor: theme.palette.mode === 'dark' ? theme.palette.secondary[900] : theme.palette.secondary[50]
                }
              },
              backgroundColor: readOnly
                ? (theme.palette.mode === 'dark' ? theme.palette.secondary[900] : theme.palette.secondary[50])
                : (theme.palette.mode === 'dark' ? theme.palette.secondary[800] : theme.palette.background.paper),
              fontSize: '0.875rem',
              transition: 'all 0.2s ease-in-out',
            }}
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
                  color: 'var(--secondary-400)',
                  '&:hover': {
                    color: 'var(--secondary-600)',
                    backgroundColor: 'var(--secondary-100)'
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
                      color: 'var(--warning-500)'
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
                      color: 'var(--error-500)'
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