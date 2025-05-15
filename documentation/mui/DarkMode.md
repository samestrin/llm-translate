# MUI Component: Dark Mode

## 1. Dark Mode Component

### 1.1. Overview
The `Dark Mode` feature in MUI enables developers to apply a dark color scheme to their applications. It improves readability in low-light environments and provides a modern UI appearance. MUI supports dark mode via theme customization, primarily through the `palette.mode` setting.

### 1.2. Import Statement
To implement dark mode, you'll need to import the following:

"""tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
"""

### 1.3. Basic Usage
Here is a minimal implementation of dark mode in a MUI application:

"""tsx
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <YourApp />
    </ThemeProvider>
  );
}
"""

### 1.4. Component Variants
Dark mode does not have visual "variants" in the typical sense, but components automatically adapt to the dark theme when the `mode` is set to `'dark'`.

### 1.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `mode` | `'light'｜'dark'` | `'light'` | No | Determines the base color scheme |
| `background.default` | `string` | `#121212` (in dark mode) | No | Background color for the body |
| `text.primary` | `string` | `#fff` (in dark mode) | No | Primary text color |

### 1.6. Common Patterns/Advanced Usage
Implementing a dynamic theme switcher using React state:

"""tsx
const [mode, setMode] = React.useState<'light' | 'dark'>('light');

const theme = React.useMemo(
  () => createTheme({
    palette: {
      mode,
    },
  }),
  [mode],
);

<ThemeProvider theme={theme}>
  <CssBaseline />
  <ToggleButton onClick={() => setMode(prev => prev === 'light' ? 'dark' : 'light')} />
</ThemeProvider>
"""

### 1.7. Accessibility (A11y)

#### 1.7.1 Screen Reader Considerations
Dark mode has no direct screen reader implications but improves readability for users with light sensitivity.

#### 1.7.2 Keyboard Navigation
No changes are needed for keyboard navigation.

#### 1.7.3 ARIA Attributes
Dark mode does not rely on ARIA attributes.

### 1.8. Styling/Customization

#### 1.8.1 Style Overrides (theme)
You can override component styles in dark mode like so:

"""tsx
const theme = createTheme({
  palette: {
    mode: 'dark',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#333',
        },
      },
    },
  },
});
"""

#### 1.8.2 CSS Classes
You can apply conditional styling using CSS classes if you maintain a custom dark mode class.

"""css
body.dark-mode {
  background-color: #121212;
  color: white;
}
"""

#### 1.8.3 sx Prop Examples
Using `sx` prop with dark mode awareness:

"""tsx
<Box sx={{ bgcolor: 'background.default', color: 'text.primary' }}>
  Dark Mode Box
</Box>
"""

### 1.9. Performance Considerations
Using `React.useMemo` for theme creation prevents unnecessary re-renders when toggling between themes.

### 1.10. Testing Guidelines
Use unit tests to validate dynamic switching behavior and snapshot testing to verify theme changes.

### 1.11. Version Specific Notes

#### 1.11.1 Migration Guides
Dark mode support is available starting in MUI v5.

#### 1.11.2 Deprecation Warnings
No deprecations currently affect dark mode functionality.

### 1.12. Related Components

#### 1.12.1 Component Hierarchy
- `ThemeProvider` → Applies the dark theme
- `CssBaseline` → Resets styles suitable for dark mode

#### 1.12.2 Complementary Components
- `Box`: Used frequently for layout and style customization
- `Button`: Automatically adapts to dark mode

#### 1.12.3 Alternative Components
- Custom `ThemeContext` or third-party libraries for more granular theme control

### 1.13. Common Pitfalls
- Forgetting to include `CssBaseline` results in poor background/text contrast
- Not updating `background.default` or `text.primary` for custom themes
- Not memoizing the theme object causes performance issues

## 2. Further Research Notes & Links
- [Dark Mode Customization – MUI Docs](https://mui.com/material-ui/customization/dark-mode/)
- [Theming – MUI System](https://mui.com/material-ui/customization/theming/)
