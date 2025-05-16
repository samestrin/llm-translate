import React, { memo, useMemo, useCallback } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Box,
  Typography
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import CheckIcon from '@mui/icons-material/Check';
import { useTheme } from '@mui/material/styles';

// Updated languages array with Auto-detect and reordered priorities
const languages = [
  'Auto-detect',
  'English',
  'Hebrew',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Chinese',
  'Korean',
  'Arabic',
  'Hindi',
  'Dutch',
  'Swedish',
  'Polish',
  'Turkish',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Greek',
];

const LanguageSelector = ({ selected, onChange, label, id, disabled = false }) => {
  const theme = useTheme(); // Add this line to access the current theme
  // Memoize the source selector check
  const isSourceSelector = useMemo(() => 
    label.toLowerCase().includes('from'), 
    [label]
  );
  
  // Memoize the filtered languages array
  const filteredLanguages = useMemo(() => 
    isSourceSelector ? languages : languages.filter(lang => lang !== 'Auto-detect'),
    [isSourceSelector]
  );
  
  // Memoize the icon for Auto-detect
  const renderLanguageIcon = useCallback((language) => {
    if (language === 'Auto-detect') {
      return (
        <LanguageIcon 
          sx={{ 
            height: 16, 
            width: 16, 
            mr: 1,
            color: 'primary.main',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} 
          aria-hidden="true" 
        />
      );
    }
    return null;
  }, []);

  // Determine if the current selection is Auto-detect
  const isAutoDetect = useMemo(() => selected === 'Auto-detect', [selected]);
  
  // Generate a unique ID for the select if not provided
  const selectId = useMemo(() => 
    `${id || 'language'}-selector`,
    [id]
  );
  
  // Generate a unique ID for the label
  const labelId = useMemo(() => 
    `${selectId}-label`,
    [selectId]
  );

  // Handle change event
  const handleChange = useCallback((event) => {
    onChange(event.target.value);
  }, [onChange]);

  return (
    <Box sx={{ width: '100%' }}>
      <FormControl 
        fullWidth 
        variant="outlined" 
        disabled={disabled}
        size="small"
      >
        <InputLabel 
          id={labelId}
          sx={{
            color: disabled 
              ? (theme.palette.mode === 'dark' ? theme.palette.secondary[600] : theme.palette.secondary[400])
              : (theme.palette.mode === 'dark' ? theme.palette.secondary[200] : theme.palette.secondary[700]),
            '&.Mui-focused': {
              color: theme.palette.primary[500]
            },
            fontSize: '0.875rem',
            fontWeight: 500
          }}
        >
          {label}
        </InputLabel>
        <Select
          labelId={labelId}
          id={selectId}
          value={selected}
          onChange={handleChange}
          label={label}
          sx={{
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: disabled 
                ? (theme.palette.mode === 'dark' ? theme.palette.secondary[800] : theme.palette.secondary[200])
                : (theme.palette.mode === 'dark' ? theme.palette.secondary[700] : theme.palette.secondary[300]),
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: !disabled 
                ? theme.palette.primary[300]
                : undefined,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.primary[500],
              borderWidth: '2px',
            },
            backgroundColor: disabled 
              ? (theme.palette.mode === 'dark' ? theme.palette.secondary[900] : theme.palette.secondary[50])
              : (theme.palette.mode === 'dark' ? theme.palette.secondary[800] : theme.palette.background.paper),
            fontSize: '0.875rem',
            transition: 'all 0.2s ease-in-out',
            '& .MuiSelect-select': {
              display: 'flex',
              alignItems: 'center',
              padding: '0.5rem 0.75rem',
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: theme.palette.mode === 'dark' ? theme.palette.secondary[800] : theme.palette.background.paper,
                color: theme.palette.mode === 'dark' ? theme.palette.secondary[100] : theme.palette.secondary[900],
                maxHeight: 240,
                '& .MuiMenuItem-root': {
                  fontSize: '0.875rem',
                  padding: '0.5rem 0.75rem',
                  position: 'relative',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(14, 165, 233, 0.18)'
                      : 'rgba(14, 165, 233, 0.1)',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(14, 165, 233, 0.28)'
                        : 'rgba(14, 165, 233, 0.2)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? theme.palette.secondary[700]
                      : theme.palette.secondary[100],
                  },
                },
                boxShadow: theme.shadows[4],
                borderRadius: '0.375rem',
              },
            },
            anchorOrigin: {
              vertical: 'bottom',
              horizontal: 'left',
            },
            transformOrigin: {
              vertical: 'top',
              horizontal: 'left',
            },
            slotProps: {
              paper: {
                elevation: 8,
              }
            }
          }}
        >
          {filteredLanguages.map((language, index) => (
            <MenuItem 
              key={index} 
              value={language}
              sx={{
                '&.Mui-selected': {
                  fontWeight: 500,
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(14, 165, 233, 0.18)'
                    : 'rgba(14, 165, 233, 0.1)',
                },
                backgroundColor: theme.palette.mode === 'dark'
                  ? theme.palette.secondary[800]
                  : theme.palette.background.paper,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                {renderLanguageIcon(language)}
                <Typography 
                  sx={{ 
                    fontWeight: language === selected ? 500 : 400,
                    color: language === 'Auto-detect' ? 'primary.main' : 'inherit',
                  }}
                >
                  {language}
                </Typography>
              </Box>
              {language === selected && (
                <CheckIcon 
                  sx={{ 
                    fontSize: 16,
                    color: 'primary.main',
                    ml: 1
                  }}
                />
              )}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

// Add display name for better debugging
LanguageSelector.displayName = 'LanguageSelector';

// Use React.memo to prevent unnecessary re-renders when props haven't changed
export default memo(LanguageSelector);