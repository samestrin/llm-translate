# MUI Component: Alert & AlertTitle

## 1. Alert Component

### 1.1. Overview
The `Alert` component displays brief messages for the user without interrupting their use of the app. It should not be confused with alert dialogs, which are intended to interrupt the user. For more information, visit the [MUI Alert Documentation](https://mui.com/material-ui/react-alert/).

### 1.2. Import Statement
```jsx
import Alert from '@mui/material/Alert';
// For AlertTitle:
import AlertTitle from '@mui/material/AlertTitle';
```

### 1.3. Basic Usage
```jsx
import Alert from '@mui/material/Alert';

// Example:
// <Alert severity="error">This is an error alert — check it out!</Alert>
// <Alert severity="warning">This is a warning alert — check it out!</Alert>
// <Alert severity="info">This is an info alert — check it out!</Alert>
// <Alert severity="success">This is a success alert — check it out!</Alert> // Default severity
```

### 1.4. Component Variants
The `Alert` component comes in different variants, including `filled`, `outlined`, and `standard`. For example:
```jsx
<Alert variant="filled" severity="error">This is a filled error alert!</Alert>
<Alert variant="outlined" severity="warning">This is an outlined warning alert!</Alert>
```

### 1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `action` | `node` | - | No | The action to display. |
| `children` | `node` | - | Yes | The content of the component. |
| `classes` | `object` | - | No | Override or extend the styles applied to the component. |
| `closeText` | `string` | 'Close' | No | Override the default label for the close popup icon button. |
| `color` | `'success'｜'info'｜'warning'｜'error'｜string` | - | No | The color of the component. |
| `icon` | `node` | - | No | Override the icon displayed before the children. |
| `iconMapping` | `object` | - | No | The component maps the `severity` prop to a range of different icons. |
| `onClose` | `func` | - | No | Callback fired when the component requests to be closed. |
| `role` | `string` | 'alert' | No | The ARIA role of the component. |
| `severity` | `'success'｜'info'｜'warning'｜'error'` | 'success' | No | The severity of the alert. |
| `square` | `bool` | `false` | No | If `true`, rounded corners are disabled. |
| `sx` | `object` | - | No | The system prop that allows defining system overrides as well as additional CSS styles. |
| `variant` | `'filled'｜'outlined'｜'standard'` | 'standard' | No | The variant to use. |

### 1.6. Common Patterns/Advanced Usage
- Alerts with actions (e.g., an undo button).
- Alerts with custom icons or no icons.
- Description alerts (using `AlertTitle`).
- Controlling alert visibility.
- Using transitions (e.g., `Collapse`) for entrance and exit animations.

### 1.7. Accessibility (A11y)
- By default, `role="alert"`. For alerts that are not dynamically rendered, consider `role="status"` for less assertive announcements.
- Alerts should not affect keyboard focus.
- If an `action` is provided, it must have a `tabindex` of 0 to be keyboard accessible.
- Ensure `AlertTitle` is used for a clear heading if the alert contains a description.

### 1.8. Styling/Customization
- Using the `sx` prop for instance-specific overrides.
- Using `styled()` for creating reusable custom Alert components.
- Theme customization for global Alert styles.
- CSS global class names for targeting specific parts (e.g., `.MuiAlert-icon`, `.MuiAlert-message`).

### 1.9. Performance Considerations
No specific performance considerations are noted for the `Alert` component.

### 1.10. Testing Guidelines
Test the `Alert` component by verifying its severity, variant, and accessibility features.

### 1.11. Version Specific Notes
No significant changes or deprecations are noted for the `Alert` component.

### 1.12. Related Components
- `AlertTitle`
- `Snackbar` (often used to display Alerts)
- `IconButton` (can be used within the `action` prop)

### 1.13. Common Pitfalls
- Not providing an `action` prop when using `onClose`.
- Not using `AlertTitle` for descriptive alerts.

## 2. AlertTitle Component

### 2.1. Overview
The `AlertTitle` component is used as a heading within an `Alert` to provide a styled and properly aligned title.

### 2.2. Import Statement
```jsx
import AlertTitle from '@mui/material/AlertTitle';
```

### 2.3. Basic Usage
```jsx
// Example:
// <Alert severity="error">
//   <AlertTitle>Error</AlertTitle>
//   This is an error alert — <strong>check it out!</strong>
// </Alert>
```

### 2.4. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `children` | `node` | - | Yes | The content of the component. |
| `classes` | `object` | - | No | Override or extend the styles applied to the component. |
| `sx` | `object` | - | No | The system prop that allows defining system overrides as well as additional CSS styles. |

### 2.5. Common Patterns/Advanced Usage
Usually used directly within an `Alert` to provide a heading.

### 2.6. Accessibility (A11y)
- Provides a semantic and visual heading for the alert content.
- Internally, it renders as a `<div>` with typography styles that make it look like a title.

### 2.7. Styling/Customization
- Using the `sx` prop.
- Theme customization for global `AlertTitle` styles.

### 2.8. Version Specific Notes
No significant changes or deprecations are noted for the `AlertTitle` component.

### 2.9. Related Components
- `Alert`

## 3. Further Research Notes & Links
- [MUI Alert Documentation](https://mui.com/material-ui/react-alert/)
