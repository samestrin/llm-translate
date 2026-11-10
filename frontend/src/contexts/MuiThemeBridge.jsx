import React, { useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { useTheme } from './ThemeContext';

// Keeps the MUI components still used by the pages in step with the Tailwind dark class.
// The app is moving to Tailwind only; delete this file once nothing imports @mui.
const MuiThemeBridge = ({ children }) => {
  const { darkMode } = useTheme();
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          ...(darkMode && {
            background: { default: '#020617', paper: '#0f172a' },
            text: { primary: '#f1f5f9', secondary: '#94a3b8' },
          }),
        },
      }),
    [darkMode],
  );
  return <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;
};

export default MuiThemeBridge;
