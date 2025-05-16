import React from 'react';
import { 
  Alert,
  AlertTitle,
  Box,
  Typography
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const ErrorMessage = ({ message, className = '' }) => {
  if (!message) return null;
  
  // Handle object errors
  const errorMessage = typeof message === 'object' 
    ? JSON.stringify(message, null, 2) 
    : message;
  
  return (
    <Alert 
      severity="error"
      icon={<ErrorOutlineIcon />}
      className={className}
      sx={{
        bgcolor: theme => theme.palette.mode === 'dark' ? 'error.900' : 'error.50',
        color: theme => theme.palette.mode === 'dark' ? 'error.200' : 'error.800',
        border: 'none',
        '& .MuiAlert-icon': {
          color: theme => theme.palette.mode === 'dark' ? 'error.500' : 'error.400',
        }
      }}
    >
      <AlertTitle sx={{ 
        fontSize: '0.875rem',
        fontWeight: 500,
        color: theme => theme.palette.mode === 'dark' ? 'error.200' : 'error.800',
      }}>
        Error
      </AlertTitle>
      <Typography 
        variant="body2" 
        sx={{ 
          mt: 0.5,
          color: theme => theme.palette.mode === 'dark' ? 'error.300' : 'error.700',
        }}
      >
        {errorMessage}
      </Typography>
    </Alert>
  );
};

export default ErrorMessage;