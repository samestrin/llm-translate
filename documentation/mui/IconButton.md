# MUI Component: IconButton

##1. IconButton Component

###1.1. Overview
Icon buttons are commonly found in app bars and toolbars. They are used for single actions where an icon can effectively convey the meaning. `IconButton` is built on top of `ButtonBase` and provides a convenient way to create buttons that only contain an icon.

###1.2. Import Statement
```jsx
import IconButton from '@mui/material/IconButton';
// or
import { IconButton } from '@mui/material';
```

###1.3. Basic Usage
```jsx
import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AlarmIcon from '@mui/icons-material/Alarm';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import Stack from '@mui/material/Stack';

export default function BasicIconButtons() {
  return (
    <Stack direction="row" spacing={1}>
      <IconButton aria-label="delete">
        <DeleteIcon />
      </IconButton>
      <IconButton aria-label="delete" disabled color="primary">
        <DeleteIcon />
      </IconButton>
      <IconButton color="secondary" aria-label="add an alarm">
        <AlarmIcon />
      </IconButton>
      <IconButton color="primary" aria-label="add to shopping cart">
        <AddShoppingCartIcon />
      </IconButton>
    </Stack>
  );
}
```

###1.4. Component Variants
The `IconButton` component has various styles that can be applied using different props such as `color`, `size`, and `edge`.

###1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` |  | Yes | The icon to display. This is typically an SVG icon component. |
| `color` | `'inherit'｜'default'｜'primary'｜'secondary'｜'error'｜'info'｜'success'｜'warning'｜string` | `'default'` | No | The color of the component. It supports theme colors. |
| `disabled` | `bool` | `false` | No | If `true`, the component is disabled. |
| `disableFocusRipple` | `bool` | `false` | No | If `true`, the keyboard focus ripple is disabled. |
| `disableRipple` | `bool` | `false` | No | If `true`, the ripple effect is disabled. |
| `edge` | `'start'｜'end'｜false` | `false` | No | If given, uses a negative margin to counteract the padding on one side. |
| `size` | `'small'｜'medium'｜'large'｜string` | `'medium'` | No | The size of the component. |
| `sx` | `Array<func｜object｜bool>｜func｜object` |  | No | The system prop that allows defining system overrides as well as additional CSS styles. |

###1.6. Common Patterns/Advanced Usage
Examples of more complex scenarios or common use cases include:
- Basic Icon Button: Displaying a simple icon that triggers an action on click.
- Color Variants: Using `primary`, `secondary`, `error`, etc., colors.
- Sizing: Using `small`, `medium`, or `large` sizes.
- Disabled State: Disabling the button using the `disabled` prop.
- Edge Alignment: Using the `edge` prop for alignment in components like `AppBar` or `ListItem`.
- Accessibility: Always provide an `aria-label` for icon buttons, as they don't have visible text.

###1.7. Accessibility (A11y)
- Always provide a descriptive `aria-label` prop for `IconButton` components.
- `IconButton` inherits accessibility features from `ButtonBase`, including focus management and keyboard navigation.
- If `disableRipple` is true, ensure focus visibility is handled via `.Mui-focusVisible` or other means.

###1.8. Styling/Customization
The `IconButton` component can be styled using:
- The `sx` prop for instance-specific overrides.
- The `styled()` utility for creating reusable custom `IconButton` components.
- Theme customization for global `IconButton` styles via `styleOverrides` in `MuiIconButton`.
- CSS global class names.

###1.9. Performance Considerations
There are no specific performance considerations mentioned for `IconButton`. However, it's essential to follow best practices for optimizing React applications.

###1.10. Testing Guidelines
When testing `IconButton`, ensure to check its accessibility features, such as the presence of `aria-label` and proper keyboard navigation.

###1.11. Version Specific Notes
- The `loading` and `loadingIndicator` props are relatively newer additions for handling loading states directly within the button.
- Review the main `IconButton` API page on mui.com for any recent changes or deprecation notices if using a specific version.

###1.12. Related Components
- `ButtonBase`: The underlying component.
- `Button`: For buttons with text and/or icons.
- Icons from `@mui/icons-material`: Commonly used as children.
- `Tooltip`: Often used to provide more context on hover for icon-only buttons.
- `AppBar`, `Toolbar`, `List`, `ListItemSecondaryAction`: Commonly host `IconButton`s.

###1.13. Common Pitfalls
Common issues with `IconButton` include:
- Forgetting to provide an `aria-label`, making the button inaccessible to screen readers.
- Not handling focus visibility when `disableRipple` is true.

##2. Further Research Notes & Links
- [MUI IconButton API Documentation](https://mui.com/material-ui/api/icon-button/)
- [MUI Icons Documentation](https://mui.com/material-ui/material-icons/)
- [MUI ButtonBase API Documentation](https://mui.com/material-ui/api/button-base/)
