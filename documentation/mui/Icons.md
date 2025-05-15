# MUI Component: Icons

Material UI provides a comprehensive set of icons through the `@mui/icons-material` package. This package includes over 2,100 official Material Icons converted to `SvgIcon` components.

## 1. Select Component

### 1.1. Overview
Material UI provides a comprehensive set of icons through the `@mui/icons-material` package. This package includes over 2,100 official Material Icons converted to `SvgIcon` components.

### 1.2. Import Statement
Each icon is a separate component and can be imported directly from `@mui/icons-material`.

```javascript
import AccessAlarmIcon from '@mui/icons-material/AccessAlarm';
import LightModeIcon from '@mui/icons-material/LightMode';
```

### 1.3. Basic Usage
Icons can be used like any other React component.

```jsx
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import AlarmIcon from '@mui/icons-material/Alarm';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';

export default function IconButtons() {
  return (
    <>
      <IconButton aria-label="delete">
        <DeleteIcon />
      </IconButton>
      <IconButton aria-label="alarm" color="primary">
        <AlarmIcon />
      </IconButton>
      <IconButton color="secondary" aria-label="add to shopping cart">
        <AddShoppingCartIcon />
      </IconButton>
    </>
  );
}
```

### 1.4. Component Variants
- Icons come in different variants based on their usage and styling. They can be customized using various props.

### 1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `color` | `enum('inherit', 'action', 'disabled', 'primary', 'secondary', 'error', 'info', 'success', 'warning', string)` | `'inherit'` | No | Applies a theme color palette to the icon. |
| `fontSize` | `enum('inherit', 'large', 'medium', 'small', string)` | `'medium'` | No | The fontSize applied to the icon. |
| `sx` | `object` | - | No | The `sx` prop allows for custom styling using a superset of CSS. |
| `titleAccess` | `string` | - | No | Provides an accessible title for the icon. |

### 1.6. Common Patterns/Advanced Usage
Icons are frequently used within `Button` or `IconButton` components.

```jsx
import Button from '@mui/material/Button';
import SendIcon from '@mui/icons-material/Send';

// ...
<Button variant="contained" endIcon={<SendIcon />}>
  Send
</Button>
```

### 1.7. Accessibility (A11y)
- **Decorative Icons:** If an icon is purely decorative, it should be hidden from assistive technologies using `aria-hidden="true"`.
- **Semantic Icons:** If an icon conveys meaning on its own, provide an accessible label.

```jsx
// Good for IconButton
<IconButton aria-label="settings">
  <SettingsIcon />
</IconButton>

// Good for standalone semantic icon
<ErrorIcon titleAccess="Error" color="error" />
```

### 1.8. Styling/Customization
Besides `color`, `fontSize`, and the `sx` prop, you can customize icons globally through the theme.

```js
// In your theme customization
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  components: {
    MuiSvgIcon: {
      styleOverrides: {
        root: {
          // Apply to all SvgIcons
          // color: 'green',
          // fontSize: '3rem',
        },
        colorPrimary: {
          color: 'orange', // Override primary color for icons
        },
      },
    },
  },
});
```

### 1.9. Performance Considerations
Icons are SvgIcon components, and their performance is generally good. However, ensure you're not importing unnecessary icons.

### 1.10. Testing Guidelines
Test icons by verifying their visual appearance and accessibility features.

### 1.11. Version Specific Notes
- The `@mui/icons-material` package is regularly updated with new icons. Ensure your package version is current.
- It depends on `@mui/material` and Emotion, so ensure compatibility between these packages.

### 1.12. Related Components
- Other related components include `IconButton` and `Button`.

### 1.13. Common Pitfalls
- Not providing an accessible label for semantic icons.
- Not customizing icons correctly for different themes or contexts.

## 2. Further Research Notes & Links
- [Material Icons Search](https://mui.com/material-ui/material-icons/)
