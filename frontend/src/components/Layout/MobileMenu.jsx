import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  IconButton, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  ListItemText,
  alpha 
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Menu as MenuIcon, X, Sun, Moon } from 'lucide-react';

const MobileMenu = ({
  navigation,
  isActive,
  darkMode,
  toggleTheme,
  mobileMenuOpen,
  handleMobileMenuToggle,
  handleCloseMobileMenu
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    handleMobileMenuToggle();
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
    handleCloseMobileMenu();
  };
  
  return (
    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center' }}>
      {/* Theme Toggle Button */}
      <IconButton
        onClick={toggleTheme}
        sx={{
          mr: 1,
          p: 1,
          bgcolor: alpha('#fff', 0.1),
          '&:hover': {
            bgcolor: alpha('#fff', 0.2),
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
              color: theme.palette.warning.light,
              animation: 'spin 12s linear infinite',
            }} 
            aria-hidden="true" 
          />
        ) : (
          <Moon 
            size={20} 
            style={{ 
              color: theme.palette.common.white,
              animation: 'pulse 3s ease-in-out infinite',
            }} 
            aria-hidden="true" 
          />
        )}
      </IconButton>
      
      {/* Mobile Menu Button */}
      <IconButton
        edge="end"
        color="inherit"
        aria-label="Open menu"
        aria-expanded={Boolean(anchorEl)}
        aria-haspopup="true"
        onClick={handleMenuOpen}
        sx={{
          p: 1,
          bgcolor: alpha('#fff', 0.1),
          '&:hover': {
            bgcolor: alpha('#fff', 0.2),
            transform: 'scale(1.05)',
          },
          transition: 'all 0.2s',
        }}
      >
        {Boolean(anchorEl) ? <X size={20} /> : <MenuIcon size={20} />}
      </IconButton>
      
      {/* Mobile Menu */}
      <Menu
        id="mobile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            mt: 1.5,
            width: 200,
            borderRadius: 1,
            bgcolor: theme.palette.mode === 'dark' 
              ? theme.palette.secondary[800]
              : theme.palette.background.paper,
            boxShadow: theme.shadows[4],
            overflow: 'hidden',
          }
        }}
      >
        {navigation.map((item, index) => (
          <MenuItem
            key={item.name}
            component={Link}
            to={item.href}
            onClick={handleMenuClose}
            dense
            selected={isActive(item.href)}
            sx={{
              py: 1.5,
              opacity: 0,
              animation: `fadeIn 0.3s ease-out forwards ${index * 0.1 + 0.1}s`,
              '@keyframes fadeIn': {
                '0%': { opacity: 0, transform: 'translateY(8px)' },
                '100%': { opacity: 1, transform: 'translateY(0)' },
              },
              bgcolor: isActive(item.href) ? 
                (theme.palette.mode === 'dark' 
                  ? alpha(theme.palette.primary.main, 0.2)
                  : alpha(theme.palette.primary.main, 0.1)) : 'transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              <item.icon 
                size={20} 
                color={
                  theme.palette.mode === 'dark' 
                    ? theme.palette.secondary[300] 
                    : theme.palette.secondary[700]
                } 
              />
            </ListItemIcon>
            <ListItemText primary={item.name} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default MobileMenu;