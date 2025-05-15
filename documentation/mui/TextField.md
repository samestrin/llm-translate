# MUI Component: TextField

##1. TextField Component

###1.1. Overview
The `TextField` component is a complete form control including a label, input, and help text. It's a convenience wrapper for the most common use cases, abstracting over `FormControl`, `InputLabel`, `Input` (or `FilledInput` / `OutlinedInput`), and `FormHelperText`. It's designed for text-based input from users.

###1.2. Import Statement
```jsx
import TextField from '@mui/material/TextField';
// or
import { TextField } from '@mui/material';
```

###1.3. Basic Usage
```jsx
import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';

export default function BasicTextFields() {
  return (
    <Box
      component="form"
      sx={{
        '& > :not(style)': { m: 1, width: '25ch' },
      }}
      noValidate
      autoComplete="off"
    >
      <TextField id="outlined-basic" label="Outlined" variant="outlined" />
      <TextField id="filled-basic" label="Filled" variant="filled" />
      <TextField id="standard-basic" label="Standard" variant="standard" />
    </Box>
  );
}
```

###1.4. Component Variants
The `TextField` component comes in three variants: `outlined`, `filled`, and `standard`.

###1.5. Key Props
| Prop | Type | Default | Required | Description |
|------|------|---------|----------|-------------|
| `autoComplete` | string | - | No | Helps users fill forms faster. |
| `autoFocus` | bool | false | No | If true, the input element is focused during the first mount. |
| `color` | 'primary' | 'primary' | No | The color of the component. |
| `defaultValue` | any | - | No | The default value. Use when the component is not controlled. |
| `disabled` | bool | false | No | If true, the component is disabled. |
| `error` | bool | false | No | If true, the label is displayed in an error state. |
| `FormHelperTextProps` | object | - | No | Props applied to the FormHelperText element. |
| `fullWidth` | bool | false | No | If true, the input will take up the full width of its container. |
| `helperText` | node | - | No | The helper text content. |
| `id` | string | - | No | The id of the input element. |
| `InputLabelProps` | object | - | No | Props applied to the InputLabel element. |
| `inputProps` | object | - | No | Attributes applied to the input element. |
| `InputProps` | object | - | No | Props applied to the Input element (FilledInput, OutlinedInput, or Input). |
| `inputRef` | ref | - | No | Pass a ref to the input element. |
| `label` | node | - | No | The label content. |
| `margin` | 'dense' | 'none' | No | Adjusts vertical spacing. |
| `maxRows` | number | string | - | No | Maximum number of rows for multiline. |
| `minRows` | number | string | - | No | Minimum number of rows for multiline. |
| `multiline` | bool | false | No | If true, a textarea element is rendered. |
| `name` | string | - | No | Name attribute of the input element. |
| `onChange` | func | - | No | Callback fired when the value is changed. |
| `placeholder` | string | - | No | The short hint displayed in the input before the user enters a value. |
| `required` | bool | false | No | If true, the label is displayed as required and the input element is required. |
| `rows` | number | string | - | No | Number of rows for multiline (when not using minRows/maxRows). |
| `select` | bool | false | No | Render a Select element. |
| `SelectProps` | object | - | No | Props applied to the Select element if `select` is true. |
| `size` | 'medium' | 'small' | 'medium' | No | The size of the component. |
| `type` | string | - | No | Type of the input element (e.g., 'text', 'password', 'number'). |
| `value` | any | - | No | The value of the input element (controlled component). |
| `variant` | 'outlined' | 'filled' | 'standard' | 'outlined' | No | The variant to use. |

###1.6. Common Patterns/Advanced Usage
**Using `inputProps` to pass attributes to the underlying input element:**
```jsx
<TextField
  id="time"
  label="Alarm clock"
  type="time"
  defaultValue="07:30"
  inputProps={{ // Attributes passed to the HTML input element
    step: 300, // 5 min steps
  }}
  sx={{ width: 150 }}
/>
```

**Multiline TextField:**
```jsx
<TextField
  id="outlined-multiline-static"
  label="Multiline"
  multiline
  rows={4}
  defaultValue="Default Value"
/>
```

**Using TextField as a Select:**
```jsx
const currencies = [
  { value: 'USD', label: '$' },
  { value: 'EUR', label: '€' },
];
<TextField
  id="outlined-select-currency"
  select
  label="Select"
  defaultValue="EUR"
  helperText="Please select your currency"
>
  {currencies.map((option) => (
    <MenuItem key={option.value} value={option.value}>
      {option.label}
    </MenuItem>
  ))}
</TextField>
```

###1.7. Accessibility (A11y)
- Ensure `id` and `label` props are used correctly for screen reader accessibility. The `id` should be unique.
- Use `helperText` to provide additional instructions if needed.
- If `error` prop is true, an `aria-invalid="true"` attribute is automatically applied to the input.
- For `select` variant, ensure options are keyboard navigable.

###1.8. Styling/Customization
- **`sx` prop:** For ad-hoc styling.
- **Global class names:**
  - `.MuiTextField-root` (targets the FormControl wrapper)
  - Underlying input components (`.MuiInput-root`, `.MuiOutlinedInput-root`, `.MuiFilledInput-root`) and label (`.MuiInputLabel-root`) have their own classes.
- **Theme overrides:** Customize default props and styles using the theme.
  - `MuiTextField`: For default props of the TextField component.
  - `MuiInput`, `MuiOutlinedInput`, `MuiFilledInput`, `MuiInputLabel`, `MuiFormHelperText`: For styling the underlying components.

###1.9. Performance Considerations
Placeholder text for performance considerations.

###1.10. Testing Guidelines
Placeholder text for testing guidelines.

###1.11. Version Specific Notes
- The `TextField` API is generally stable. Check MUI release notes for any breaking changes related to specific versions if issues arise.

###1.12. Related Components
- `FormControl`
- `InputLabel`
- `Input`
- `OutlinedInput`
- `FilledInput`
- `FormHelperText`
- `Select` (when `select` prop is true)
- `MenuItem` (for `select` options)

###1.13. Common Pitfalls
Placeholder text for common pitfalls.

##2. Further Research Notes & Links
- [MUI TextField Component Page](https://mui.com/material-ui/react-text-field/)
- [MUI TextField API Documentation](https://mui.com/material-ui/api/text-field/)
