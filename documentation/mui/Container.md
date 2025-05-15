# MUI Component: Container

The `Container` component centers your content horizontally. It's one of the most basic layout elements.

## 1. Select Component

### 1.1. Overview
The `Container` component is used to center content horizontally.

### 1.2. Import Statement
```jsx
import Container from '@mui/material/Container';
// or
import { Container } from '@mui/material';
```

### 1.3. Basic Usage
```jsx
import * as React from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

export default function SimpleContainer() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ bgcolor: '#cfe8fc', height: '100vh' }} />
    </Container>
  );
}
```

### 1.4. Component Variants
- Fixed Container: Set the `fixed` prop to design for a fixed set of sizes.
- Fluid Container: `maxWidth` is bounded by the `maxWidth` prop value.

### 1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` |  | Yes | The content of the component. |
| `classes` | `object` |  | No | Override or extend the styles applied to the component. |
| `component` | `elementType` | `'div'` | No | The component used for the root node. |
| `disableGutters` | `bool` | `false` | No | If `true`, the left and right padding is removed. |
| `fixed` | `bool` | `false` | No | Set the `max-width` to match the `min-width` of the current breakpoint. |
| `maxWidth` | `'xs'｜'sm'｜'md'｜'lg'｜'xl'｜false｜string` | `'lg'` | No | Determine the `max-width` of the container. |
| `sx` | `Array<func｜object｜bool>｜func｜object` |  | No | The system prop that allows defining system overrides as well as additional CSS styles. |

### 1.6. Common Patterns/Advanced Usage
#### Fixed Container
```jsx
import * as React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';

export default function FixedContainer() {
  return (
    <React.Fragment>
      <CssBaseline />
      <Container fixed>
        <Box sx={{ bgcolor: '#cfe8fc', height: '100vh' }} />
      </Container>
    </React.Fragment>
  );
}
```

#### Fluid Container
```jsx
<Container maxWidth="sm">
  {/* Content */}
</Container>
```

### 1.7. Accessibility (A11y)
- Ensure content within the `Container` follows accessibility best practices.
- Refer to general web accessibility guidelines for content structure and ARIA attributes as needed.

### 1.8. Styling/Customization
You can customize the `Container` using several methods:
- **`sx` prop:** For one-off styling overrides.
- **`classes` prop:** To override the styles of specific parts of the component.
- **Global class names:** Useful for styling with CSS.
- **Theme overrides:** Use `MuiContainer` to change default props with the theme's `styleOverrides` property.

#### CSS API and Customization
| Class name | Rule name | Description |
|------------|-----------|-------------|
| `.MuiContainer-root` | `root` | Styles applied to the root element. |
| `.MuiContainer-disableGutters` | `disableGutters` | Styles applied if `disableGutters={true}`. |
| `.MuiContainer-fixed` | `fixed` | Styles applied if `fixed={true}`. |
| `.MuiContainer-maxWidthXs` | `maxWidthXs` | Styles applied if `maxWidth="xs"`. |
| `.MuiContainer-maxWidthSm` | `maxWidthSm` | Styles applied if `maxWidth="sm"`. |
| `.MuiContainer-maxWidthMd` | `maxWidthMd` | Styles applied if `maxWidth="md"`. |
| `.MuiContainer-maxWidthLg` | `maxWidthLg` | Styles applied if `maxWidth="lg"`. |
| `.MuiContainer-maxWidthXl` | `maxWidthXl` | Styles applied if `maxWidth="xl"`. |

### 1.9. Performance Considerations
**PLACEHOLDER**: Add performance optimization tips if applicable.

### 1.10. Testing Guidelines
**PLACEHOLDER**: Add tips for testing the component.

### 1.11. Version Specific Notes
Refer to the official MUI documentation for version-specific changes or deprecations.

### 1.12. Related Components
- `Box`: Often used inside `Container` for structuring content.
- `Grid`: For more complex grid-based layouts within or around a `Container`.

### 1.13. Common Pitfalls
**PLACEHOLDER**: Add common issues and solutions if applicable.

## 2. Further Research Notes & Links
- [MUI Container API Documentation](https://mui.com/material-ui/api/container/)
