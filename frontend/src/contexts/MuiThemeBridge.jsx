import React, { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { useTheme } from './ThemeContext';
import { createAppTheme } from '../theme/muiTheme';

// Gives the MUI components the family theme (src/theme/muiTheme.js) for the current mode.
const MuiThemeBridge = ({ children }) => {
  const { darkMode } = useTheme();
  const theme = useMemo(() => createAppTheme(darkMode ? 'dark' : 'light'), [darkMode]);
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};

export default MuiThemeBridge;
