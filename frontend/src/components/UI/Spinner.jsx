import React, { useMemo } from 'react';
import { Box, CircularProgress, Fade } from '@mui/material';

const Spinner = ({ 
  size = 'md', 
  className = '', 
  show = true, 
  color = 'primary',
  thickness = 'normal',
  label = 'Loading'  // Accessibility: label is used for aria-label
}) => {
  // Define size mappings for MUI
  const sizeMappings = useMemo(() => ({
    xs: 16,
    sm: 20,
    md: 32,
    lg: 48,
    xl: 64
  }), []);

  // Define thickness mappings for MUI
  const thicknessMappings = useMemo(() => ({
    thin: {
      xs: 1.5,
      sm: 2,
      md: 2.5,
      lg: 3,
      xl: 3.5
    },
    normal: {
      xs: 2,
      sm: 3,
      md: 3.5,
      lg: 4,
      xl: 4.5
    },
    thick: {
      xs: 2.5,
      sm: 3.5,
      md: 4,
      lg: 5,
      xl: 5.5
    }
  }), []);

  // Define color mappings for MUI
  const colorMappings = useMemo(() => ({
    primary: 'primary',
    secondary: 'secondary',
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
    white: 'common.white'
  }), []);

  // Get the appropriate thickness based on size and thickness preference
  const spinnerThickness = thicknessMappings[thickness][size];
  const spinnerSize = sizeMappings[size];
  const spinnerColor = colorMappings[color];

  return (
    <Fade
      in={show}
      timeout={{
        enter: 300,
        exit: 300
      }}
      unmountOnExit
    >
      <Box className={className} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress
          size={spinnerSize}
          thickness={spinnerThickness}
          color={spinnerColor !== 'common.white' ? spinnerColor : undefined}
          sx={{
            ...(spinnerColor === 'common.white' && {
              color: 'common.white',
              '& .MuiCircularProgress-circle': {
                color: 'common.white',
              }
            })
          }}
          aria-label={label}
        />
        <Box component="span" sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap' }}>
          {label}
        </Box>
      </Box>
    </Fade>
  );
};

export default React.memo(Spinner);