# MUI Component: Theming

## 1. Theming Component

### 1.1. Overview
Theming in MUI provides a centralized way to customize the look and feel of all components in a React application. It allows you to define values such as colors, typography, spacing, and component-level overrides, promoting consistency and maintainability across the UI.

### 1.2. Import Statement
To set up a custom theme in MUI, import the following utilities:

"""tsx
import { createTheme, ThemeProvider } from '@mui/material/styles';
"""

### 1.3. Basic Usage
Here's a basic example of applying a custom theme to your MUI application:

"""tsx
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <YourApp />
    </ThemeProvider>
  );
}
"""

### 1.4. Component Variants
Theming enables global customization of component variants using the `components` key:

"""tsx
const theme = createTheme({
  components: {
    MuiButton: {
      variants: [
        {
          props: { variant: 'dashed' },
          style: {
            border: '1px dashed grey',
          },
        },
      ],
    },
  },
});
"""

### 1.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `palette` | `object` | `{}` | No | Defines color schemes |
| `typography` | `object` | Default MUI typography | No | Sets global font styles |
| `components` | `object` | `{}` | No | Allows customization of component defaults |
| `spacing` | `number｜function` | `8` | No | Controls spacing scale |
| `shape` | `object` | `{ borderRadius: 4 }` | No | Defines shape customization like border radius |

### 1.6. Common Patterns/Advanced Usage
You can extend themes or create multiple themes using `createTheme` and custom tokens:

#### Theme Extension

"""tsx
const baseTheme = createTheme({ palette: { primary: { main: '#1976d2' } } });
const extendedTheme = createTheme(baseTheme, {
  palette: {
    secondary: {
      main: '#dc004e',
    },
  },
});
"""

#### Custom Spacing Function

"""tsx
const theme = createTheme({
  spacing: (factor) => `${0.25 * factor}rem`,
});
"""

### 1.7. Accessibility (A11y)

#### 1.7.1 Screen Reader Considerations
Themes do not directly affect screen readers but should ensure contrast and size accessibility are met.

#### 1.7.2 Keyboard Navigation
Themes should not interfere with focus styles or keyboard navigation behavior.

#### 1.7.3 ARIA Attributes
Themes do not use ARIA attributes directly, but custom component styles should ensure ARIA compliance.

### 1.8. Styling/Customization

#### 1.8.1 Style Overrides (theme)
Override styles globally using the `components` key in the theme:

"""tsx
const theme = createTheme({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
"""

#### 1.8.2 CSS Classes
While not required, you can apply themes in combination with CSS classes for more granular control.

#### 1.8.3 sx Prop Examples
You can reference theme values directly using the `sx` prop:

"""tsx
<Box sx={{ bgcolor: 'primary.main', p: 2, borderRadius: 2 }}>
  Themed Box
</Box>
"""

### 1.9. Performance Considerations
- Use `React.useMemo` when switching themes dynamically
- Avoid redefining the theme on every render to prevent unnecessary re-renders

### 1.10. Testing Guidelines
- Use snapshot tests to verify theme structure
- Test components under different themes if your app supports them dynamically

### 1.11. Version Specific Notes

#### 1.11.1 Migration Guides
Major theming updates occurred with the release of MUI v5. Refer to MUI’s official upgrade guide for migration from v4.

#### 1.11.2 Deprecation Warnings
Legacy theme structure from v4 is deprecated. Use the v5 `createTheme` approach.

### 1.12. Related Components

#### 1.12.1 Component Hierarchy
- `ThemeProvider` → Applies theme context to the app
- `CssBaseline` → Resets CSS to match theme expectations

#### 1.12.2 Complementary Components
- `StyledEngineProvider`: Allows full control over JSS engine

#### 1.12.3 Alternative Components
- Use of Tailwind CSS or Emotion with `@emotion/react` for design systems outside of MUI

### 1.13. Common Pitfalls
- Not wrapping your app with `ThemeProvider`
- Forgetting to pass the theme object to `createTheme`
- Overriding styles incorrectly within `components` leading to unexpected UI

## 2. Further Research Notes & Links
- [MUI Theming Documentation](https://mui.com/material-ui/customization/theming/)
- [Default Theme Structure](https://mui.com/material-ui/customization/default-theme/)
- [Extend the Theme](https://mui.com/material-ui/customization/theming/#custom-variables)
