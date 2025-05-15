# MUI Component: Button

## 1. Button Component

### 1.1. Overview
Buttons allow users to take actions and make choices with a single tap. They communicate actions that users can take and are typically placed throughout the UI in places like modal windows, forms, cards, and toolbars. The `Button` component comes with three main variants: text (default), contained, and outlined.

### 1.2. Import Statement
```jsx
import Button from '@mui/material/Button';
```

### 1.3. Basic Usage
```jsx
import * as React from 'react';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

export default function BasicButtons() {
  return (
    <Stack spacing={2} direction="row">
      <Button variant="text">Text</Button>
      <Button variant="contained">Contained</Button>
      <Button variant="outlined">Outlined</Button>
    </Stack>
  );
}
```

### 1.4. Component Variants
The `Button` component comes with three main variants: `text`, `contained`, and `outlined`.

### 1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` |  | Yes | The content of the component. |
| `color` | `'inherit'｜'primary'｜'secondary'｜'success'｜'error'｜'info'｜'warning'｜string` | `'primary'` | No | The color of the component. |
| `component` | `elementType` |  | No | The component used for the root node. |
| `disabled` | `bool` | `false` | No | If `true`, the component is disabled. |
| `disableElevation` | `bool` | `false` | No | If `true`, no elevation is used. |
| `disableFocusRipple` | `bool` | `false` | No | If `true`, the keyboard focus ripple is disabled. |
| `disableRipple` | `bool` |  | No | If `true`, the ripple effect is disabled. |
| `endIcon` | `node` |  | No | Element placed after the children. |
| `fullWidth` | `bool` | `false` | No | If `true`, the button will take up the full width of its container. |
| `href` | `string` |  | No | The URL to link to when the button is clicked. |
| `loading` | `bool` | `false` | No | If `true`, the button will be in a loading state. |
| `loadingIndicator` | `node` | `<CircularProgress color="inherit" size={16} />` | No | The loading indicator displayed when `loading` is true. |
| `loadingPosition` | `'start'｜'end'｜'center'` | `'center'` | No | The position of the loading indicator. |
| `onClick` | `func` |  | No | Callback fired when the button is clicked. |
| `size` | `'small'｜'medium'｜'large'｜string` | `'medium'` | No | The size of the component. |
| `startIcon` | `node` |  | No | Element placed before the children. |
| `sx` | `Array<func｜object｜bool>｜func｜object` |  | No | The system prop that allows defining system overrides as well as additional CSS styles. |
| `variant` | `'text'｜'outlined'｜'contained'｜string` | `'text'` | No | The variant to use. |

### 1.6. Common Patterns/Advanced Usage
- **Text Buttons:** Used for less-pronounced actions.
- **Contained Buttons:** For primary actions.
- **Outlined Buttons:** For important but not primary actions.
- **Loading Buttons:** Using the `loading`, `loadingIndicator`, and `loadingPosition` props.

### 1.7. Accessibility (A11y)
- Ensure buttons have a descriptive text label or `aria-label` if only an icon is used.
- Buttons are inherently focusable and keyboard accessible.

### 1.7.1. Screen Reader Considerations
Ensure that the button's purpose is clear to screen readers.

### 1.7.2. Keyboard Navigation
Buttons should be navigable using a keyboard.

### 1.7.3. ARIA Attributes
Use `aria-label` for icon-only buttons.

### 1.8. Styling/Customization
- Use the `sx` prop for instance-specific overrides.
- Use the `styled()` utility for creating reusable custom Button components.
- Theme customization for global Button styles via `styleOverrides` in `MuiButton`.

### 1.8.1. Style Overrides (theme)
Customize the Button component using theme overrides.

### 1.8.2. CSS Classes
Use CSS global class names for styling.

### 1.8.3. sx Prop Examples
```jsx
<Button sx={{ backgroundColor: 'primary.main', color: 'white' }}>Button</Button>
```

### 1.9. Performance Considerations
Optimize performance by minimizing unnecessary re-renders.

### 1.10. Testing Guidelines
Test the Button component for accessibility and functionality.

### 1.11. Version Specific Notes
- The `loading` prop was introduced in v6.4.0.

### 1.12. Related Components
- `ButtonBase`: The base component for `Button`.
- `IconButton`: For creating icon buttons.
- `ButtonGroup`: For grouping buttons.

### 1.13. Common Pitfalls
- Avoid using `Button` without a descriptive text label or `aria-label`.

## 2. Further Research Notes & Links
- [MUI Button Component Documentation](https://mui.com/material-ui/react-button/)
- [MUI Button API Documentation](https://mui.com/material-ui/api/button/)
- [MUI ButtonBase API Documentation](https://mui.com/material-ui/api/button-base/)
