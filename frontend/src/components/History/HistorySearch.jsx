import React from 'react';
import { 
  Box, 
  TextField, 
  InputAdornment, 
  IconButton,
  Button
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { Tooltip } from '../UI/Tooltip';
import { useTheme } from '@mui/material/styles';

const HistorySearch = ({ 
  searchQuery, 
  handleSearchChange, 
  handleClearSearch, 
  handleSearchKeyPress, 
  handleSearchSubmit, 
  openConfirmModal 
}) => {
  const theme = useTheme();

  // Get border color based on theme
  const getBorderColor = () => {
    return theme.palette.mode === 'dark' ? theme.palette.secondary[700] : theme.palette.secondary[300];
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', sm: 'row' }, 
      gap: 2, 
      mb: 4 
    }}>
      <Box sx={{ flexGrow: 1, position: 'relative' }}>
        <form onSubmit={handleSearchSubmit}>
          <TextField
            id="search-history"
            placeholder="Translation search term..."
            fullWidth
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleSearchKeyPress}
            aria-label="Search translation history"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'secondary.400' }} />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <Tooltip title="Clear search">
                    <IconButton
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                      size="small"
                      sx={{
                        color: 'var(--secondary-400)',
                        '&:hover': {
                          color: 'var(--secondary-600)',
                          backgroundColor: 'var(--secondary-100)'
                        }
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              ),
              sx: {
                borderColor: getBorderColor(),
                '&.Mui-focused': {
                  borderColor: theme.palette.primary.main,
                },
                bgcolor: theme.palette.mode === 'dark' ? 'secondary.800' : 'white',
                borderRadius: 1.5
              }
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderColor: getBorderColor(),
                '&:hover': {
                  borderColor: theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.400',
                },
                '&.Mui-focused': {
                  borderColor: theme.palette.primary.main,
                },
              },
            }}
          />
        </form>
      </Box>
      
      <Button
        variant="contained"
        color="error"
        onClick={openConfirmModal}
        startIcon={<DeleteIcon />}
        aria-label="Clear all translation history"
        sx={{
          px: 2,
          py: 1,
          textTransform: 'none',
          fontSize: '0.875rem',
          lineHeight: 1,
          minWidth: 'auto',
          bgcolor: 'error.600',
          '&:hover': {
            bgcolor: 'error.700',
          },
        }}
      >
        Clear All
      </Button>
    </Box>
  );
};

export default HistorySearch;