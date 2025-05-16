import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Container, Link, Typography, useTheme, alpha } from '@mui/material';
import { useTheme as useCustomTheme } from '../../contexts/ThemeContext';
import Header from './Header';
import Footer from './Footer';

const Layout = ({ children }) => {
  const muiTheme = useTheme();
  const { darkMode } = useCustomTheme();
  
  // Skip to content link ID for accessibility
  const skipToContentId = "main-content";
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: 'background.default', // Use MUI theme token
        color: 'text.primary', // Use MUI theme token
        transition: 'all 0.3s',
      }}
    >
      {/* Skip to content link for keyboard accessibility */}
      <Link 
        href={`#${skipToContentId}`}
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
          '&:focus': {
            position: 'fixed',
            top: 2,
            left: 2,
            width: 'auto',
            height: 'auto',
            padding: 2,
            margin: 0,
            outline: 'none',
            overflow: 'visible',
            clip: 'auto',
            background: muiTheme.palette.primary.main,
            color: muiTheme.palette.primary.contrastText,
            zIndex: 9999,
            borderRadius: 1,
            boxShadow: 3,
          }
        }}
      >
        <Typography>Skip to content</Typography>
      </Link>
      
      {/* Header component */}
      <Header />
      
      {/* Main content */}
      <Box
        component="main"
        id={skipToContentId}
        sx={{ 
          flexGrow: 1,
          py: 4,
          px: 2,
          bgcolor: muiTheme.palette.background.default,
          color: muiTheme.palette.text.primary,
          boxShadow: muiTheme.palette.mode === 'dark' ? 'inset 0 0 10px rgba(0,0,0,0.1)' : 'none',
          backgroundImage: muiTheme.palette.mode === 'dark'
            ? 'radial-gradient(circle at top right, rgba(25,118,210,0.05), transparent 70%)'
            : 'radial-gradient(circle at top right, rgba(25,118,210,0.03), transparent 60%)',
          transition: 'all 0.3s ease-in-out'
        }}
        tabIndex="-1"
        role="main"
      >
        <Container maxWidth="lg">
          {children || <Outlet />}
        </Container>
      </Box>
      
      {/* Footer component */}
      <Footer />
    </Box>
  );
};

export default Layout;