import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const HistoryEmpty = ({ searchQuery }) => {
  const theme = useTheme();

  const getTextColor = () => {
    return theme.palette.mode === 'dark' ? 'var(--secondary-100)' : 'var(--secondary-900)';
  };

  return (
    <Box 
      sx={{ 
        textAlign: 'center', 
        py: 8,
        color: 'var(--secondary-500)', 
      }}
    >
      <Typography variant="body1" sx={{ mb: 2, color: getTextColor() }}>
        No translation history found.
      </Typography>
      <Typography variant="body2" sx={{ color: 'secondary.500' }}>
        {searchQuery ? 'Try a different search term.' : 'Translations will appear here as you use the translator.'}
      </Typography>
    </Box>
  );
};

export default HistoryEmpty;