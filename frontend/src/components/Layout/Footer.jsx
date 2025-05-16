import React, { useMemo } from 'react';
import { Box, Container, Link as MuiLink, Typography, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  const theme = useTheme();
  
  // Current year for copyright
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  
  return (
    <Box 
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        background: theme => theme.palette.mode === 'dark' 
          ? `linear-gradient(to right, ${theme.palette.secondary[800]}, ${theme.palette.secondary[900]})` 
          : `linear-gradient(to right, ${theme.palette.secondary[100]}, ${theme.palette.secondary[200]})`,
        boxShadow: 'inset 0 1px 0 rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s',
      }}
      role="contentinfo"
      aria-label="Site footer"
    >
      <Container 
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: 'center',
          color: theme => theme.palette.mode === 'dark' 
            ? theme.palette.secondary[400] 
            : theme.palette.secondary[600],
        }}
      >
        <Typography 
          variant="body2" 
          sx={{ mb: { xs: 2, md: 0 } }}
        >
          © {currentYear} LLM Translate. All rights reserved.
        </Typography>
        
        <Box 
          component="nav"
          sx={{ 
            display: 'flex', 
            gap: 3 
          }}
          aria-label="Footer navigation"
        >
            <MuiLink
            component={RouterLink}
            to="/about"
            underline="hover"
            sx={{
              color: 'inherit',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              '&:hover': {
                color: theme => theme.palette.mode === 'dark'
                  ? theme.palette.primary[400]
                  : theme.palette.primary[600],
                transform: 'scale(1.05)',
              },
            }}
            aria-label="About"
          >
            About
          </MuiLink>

          <MuiLink
            component={RouterLink}
            to="/llm-info"
            underline="hover"
            sx={{
              color: 'inherit',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              '&:hover': {
                color: theme => theme.palette.mode === 'dark'
                  ? theme.palette.primary[400]
                  : theme.palette.primary[600],
                transform: 'scale(1.05)',
              },
            }}
            aria-label="About"
          >
            LLMs
          </MuiLink>   

          <MuiLink
            component={RouterLink}
            to="/tts-info"
            underline="hover"
            sx={{
              color: 'inherit',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              '&:hover': {
                color: theme => theme.palette.mode === 'dark'
                  ? theme.palette.primary[400]
                  : theme.palette.primary[600],
                transform: 'scale(1.05)',
              },
            }}
            aria-label="About"
          >
            TTS
          </MuiLink>          

          <MuiLink
            component={RouterLink}
            to="/privacy"
            underline="hover"
            sx={{
              color: 'inherit',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              '&:hover': {
                color: theme => theme.palette.mode === 'dark'
                  ? theme.palette.primary[400]
                  : theme.palette.primary[600],
                transform: 'scale(1.05)',
              },
            }}
            aria-label="Privacy Policy"
          >
            Privacy
          </MuiLink>
          
          <MuiLink
            component={RouterLink}
            to="/terms"
            underline="hover"
            sx={{
              color: 'inherit',
              fontSize: '0.875rem',
              transition: 'all 0.2s',
              '&:hover': {
                color: theme => theme.palette.mode === 'dark'
                  ? theme.palette.primary[400]
                  : theme.palette.primary[600],
                transform: 'scale(1.05)',
              },
            }}
            aria-label="Terms of Service"
          >
            Terms
          </MuiLink>
                    
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;