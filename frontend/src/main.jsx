import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import App from './App.jsx';
import './index.css';
import './App.css';
import { useTheme } from './contexts/ThemeContext';

// Create a wrapper component to use the ThemeContext values for MUI theming
const ThemeWrapper = ({ children }) => {
  const { darkMode } = useTheme();
  
  // Create the MUI theme based on the darkMode value
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode: darkMode ? 'dark' : 'light',
          // You can add more customizations here if needed
        },
      }),
    [darkMode]
  );

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App>
      {/* ThemeWrapper will be rendered inside ThemeProvider from App.jsx */}
      <ThemeWrapper />
    </App>
  </React.StrictMode>,
);
