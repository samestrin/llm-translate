# MUI Component: Default Theme

## 1. Default Theme Component

### 1.1. Overview
The `Default Theme` in MUI is a preconfigured theme object used when no custom theme is provided. It defines sensible design tokens like spacing, typography, palette, shape, and component defaults. You can access and extend this theme for consistent styling across your application.

### 1.2. Import Statement
To inspect or use the default theme object, you can import it from the MUI library:

"""tsx
import { createTheme } from '@mui/material/styles';

const theme = createTheme();
"""

To access it in a component:

"""tsx
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
"""

### 1.3. Basic Usage
You can inspect the default theme or extend it as follows:

"""tsx
const defaultTheme = createTheme();

console.log(defaultTheme.palette.primary.main); // '#1976d2'
"""

### 1.4. Component Variants
While the default theme does not include custom variants, it defines default settings for all components. You can override or extend these defaults via the `components` key.

### 1.5. Key Props

| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `palette` | `object` | See docs | No | Color tokens including primary, secondary, and more |
| `typography` | `object` | See docs | No | Font family, size, weight, and headings |
| `spacing` | `number｜function` | `8` | No | Base spacing unit |
| `shape` | `object` | `{ borderRadius: 4 }` | No | Global border radius |
| `breakpoints` | `object` | `{ xs, sm, md, lg, xl }` | No | Responsive breakpoints |
| `zIndex` | `object` | `{ appBar: 1100, modal: 1300 }` | No | Component layering control |

### 1.6. Common Patterns/Advanced Usage
You can customize and reuse parts of the default theme:

#### Extend the Default Theme

"""tsx
const theme = createTheme({
  palette: {
    primary: {
      main: '#556cd6',
    },
  },
  shape: {
    borderRadius: 8,
  },
});
"""

#### Nested Theme Access

Using `useTheme` for responsive logic:

"""tsx
const theme = useTheme();

<Box sx={{ [theme.breakpoints.up('md')]: { padding: theme.spacing(4) } }} />
"""

### 1.7. Accessibility (A11y)

#### 1.7.1 Screen Reader Considerations
The default theme ensures color contrast and font legibility suitable for accessible design.

#### 1.7.2 Keyboard Navigation
Focus styles and component interactions follow accessibility standards by default.

#### 1.7.3 ARIA Attributes
The default theme does not interfere with ARIA attributes but supports components that require them.

### 1.8. Styling/Customization

#### 1.8.1 Style Overrides (theme)
Use the `components` section to override default styles:

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
Default styles are scoped to components but can be customized via class selectors when needed.

#### 1.8.3 sx Prop Examples

"""tsx
<Box sx={{ bgcolor: 'primary.main', p: 2, borderRadius: 2 }}>
  Themed Box
</Box>
"""

### 1.9. Performance Considerations
Accessing or extending the default theme is lightweight and does not cause rendering overhead. Use `useMemo` when creating dynamic themes.

### 1.10. Testing Guidelines
- Test using `ThemeProvider` with or without custom theme
- Use `theme.spacing()`, `theme.palette` in snapshot and functional tests

### 1.11. Version Specific Notes

#### 1.11.1 Migration Guides
- MUI v5 introduced more customization options in `components` and expanded typography scaling

#### 1.11.2 Deprecation Warnings
- Legacy overrides from v4 (`overrides`, `props`) have been replaced by `components`

### 1.12. Related Components

#### 1.12.1 Component Hierarchy
- `ThemeProvider` → Supplies default or custom theme to child components

#### 1.12.2 Complementary Components
- `CssBaseline` → Resets default browser styles for a consistent base
- `StyledEngineProvider` → Manages styling engine

#### 1.12.3 Alternative Components
- None. The default theme is the base layer for all MUI components

### 1.13. Common Pitfalls
- Forgetting to wrap components in `ThemeProvider` when customizing
- Accessing `useTheme` outside of a `ThemeProvider` context
- Misunderstanding default values (e.g., spacing unit is 8px, not 1px)

## 2. Further Research Notes & Links
- [Default Theme – MUI Docs](https://mui.com/material-ui/customization/default-theme/)
- [Theme Structure Reference](https://mui.com/material-ui/customization/theming/#theme-structure)
- [useTheme Hook](https://mui.com/material-ui/customization/theming/#use-theme)
