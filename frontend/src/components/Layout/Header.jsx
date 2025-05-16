import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  AppBar,
  Toolbar,
  Box,
  Container,
  IconButton, 
  useScrollTrigger,
  alpha
} from '@mui/material';
import { useTheme as useMuiTheme } from '@mui/material/styles';
import { 
  Home as HomeIcon, 
  History as HistoryIcon, 
  Sun, 
  Moon, 
  Globe 
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import NavigationLink from './NavigationLink';
import MobileMenu from './MobileMenu';
import Logo from './Logo';

const Header = () => {
  const location = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Use MUI's useScrollTrigger for scroll effects
  const scrolled = useScrollTrigger({
    disableHysteresis: true,
    threshold: 10,
  });

  // Memoize navigation items
  const navigation = useMemo(() => [
    { name: 'Home', href: '/', icon: HomeIcon },
    { name: 'History', href: '/history', icon: HistoryIcon }
  ], []);

  // Memoize the isActive function
  const isActive = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);

  // Toggle mobile menu
  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen(prevState => !prevState);
  }, []);

  // Close mobile menu
  const handleCloseMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
  }, []);

  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  // Handle escape key press
  const handleEscapeKey = useCallback((e) => {
    if (e.key === 'Escape' && mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileMenuOpen]);

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  return (
    <AppBar 
      position="sticky" 
      sx={{
        background: darkMode
          ? `linear-gradient(to right, ${muiTheme.palette.info.dark}, ${muiTheme.palette.secondary.dark})`
          : `linear-gradient(to right, ${muiTheme.palette.primary.light},  #ADD8E6)`,
        transition: 'all 0.3s ease-in-out',
        py: scrolled ? 0.5 : 1.5,
        boxShadow: scrolled ? 8 : 3,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      {/* Decorative dots overlay pattern */}
      <Box 
        sx={{ 
          position: 'absolute', 
          inset: 0, 
          bgcolor: darkMode ? alpha(muiTheme.palette.primary.dark, 0.4) : 'background.paper',
          opacity: darkMode ? 0.18 : 0.1,
          animation: 'pulse 8s infinite ease-in-out',
          '@keyframes pulse': {
            '0%, 100%': { opacity: darkMode ? 0.12 : 0.05 },
            '50%': { opacity: darkMode ? 0.22 : 0.15 },
          },
          pointerEvents: 'none',
        }} 
        aria-hidden="true"
      />
      
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Logo */}
          <Logo />
          
          {/* Desktop Navigation */}
          <Box 
            component="nav" 
            aria-label="Main navigation"
            sx={{ 
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 3
            }}
          >
            {navigation.map((item) => (
              <NavigationLink 
                key={item.name} 
                item={item} 
                isActive={isActive} 
              />
            ))}
            
            {/* Theme Toggle */}
            <IconButton
              onClick={toggleTheme}
              sx={{
                p: 1,
                borderRadius: '50%',
                bgcolor: darkMode
                  ? alpha('#fff', 0.08) // Light background in dark mode
                  : alpha('#000', 0.08), // Dark background in light mode
                '&:hover': {
                  bgcolor: darkMode
                    ? alpha('#fff', 0.18)
                    : alpha('#000', 0.18),
                  transform: 'scale(1.05) rotate(12deg)',
                },
                transition: 'all 0.2s',
              }}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={darkMode}
            >
              {darkMode ? (
                <Sun 
                  size={20} 
                  style={{ 
                    color: muiTheme.palette.warning.light,
                    animation: 'spin 10s linear infinite',
                  }} 
                  aria-hidden="true" 
                />
              ) : (
                <Moon 
                  size={20} 
                  color="#000"
                  stroke="#000"
                  strokeWidth={2.5}
                  fill="none"
                  style={{ 
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.15))',
                    animation: 'pulse 3s ease-in-out infinite',
                  }} 
                  aria-hidden="true" 
                />
              )}
            </IconButton>
          </Box>

          {/* Mobile Menu */}
          <MobileMenu 
            navigation={navigation}
            isActive={isActive}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            mobileMenuOpen={mobileMenuOpen}
            handleMobileMenuToggle={handleMobileMenuToggle}
            handleCloseMobileMenu={handleCloseMobileMenu}
          />
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;