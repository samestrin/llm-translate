# UI Components: README

## 1. Overview

### 1.1. Purpose

This directory contains reusable UI components for the LLM Translate frontend. These components are designed to provide consistent, accessible, and theme-aware UI elements across the application. They leverage Material UI (MUI) v7.1.0 and custom styling conventions, including Tailwind CSS variables for color and spacing.

### 1.2. General Notes

- All components are theme-aware (support both light and dark modes).
- Components are implemented as functional React components, using hooks and memoization for performance.
- Accessibility is prioritized (ARIA labels, keyboard navigation, etc.).
- Components are styled using a combination of MUI's `sx` prop, custom CSS variables, and Tailwind utility classes.
- For detailed usage of MUI primitives, see the [MUI documentation index](../../../documentation/mui/README.md).

---

## 2. Component Documentation

### 2.1. ToastProvider

- **Purpose:** Provides a global toast notification system using `react-hot-toast`, styled to match the application's theme and color palette.
- **Key Features:**
  - Memoized toast options for performance.
  - Custom success, error, loading, and custom toast styles.
  - Integrates with Tailwind and MUI color variables.
- **Usage:** Wrap your app or page in `<ToastProvider>...</ToastProvider>` to enable toasts.
- **References:** [react-hot-toast](https://react-hot-toast.com/), [MUI Zoom](../../../documentation/mui/Zoom.md)

### 2.2. Spinner

- **Purpose:** Displays a loading spinner with customizable size, color, and thickness.
- **Key Features:**
  - Supports multiple sizes (`xs`, `sm`, `md`, `lg`, `xl`).
  - Theme-aware color options (`primary`, `secondary`, `success`, `error`, `warning`, `info`, `white`).
  - Accessible: includes visually hidden label for screen readers.
  - Uses MUI's `CircularProgress` and `Fade` for smooth transitions.
- **Usage:** Place `<Spinner show={true} size="md" color="primary" />` where loading indication is needed.
- **References:** [MUI CircularProgress](../../../documentation/mui/CircularProgress.md), [MUI Fade](../../../documentation/mui/Fade.md)

### 2.3. Tooltip

- **Purpose:** Provides a styled tooltip component, wrapping MUI's `Tooltip` with custom theme-aware styles.
- **Key Features:**
  - Custom background, border, and text color for both light and dark modes.
  - Supports both `title` and `content` props for compatibility.
  - Uses MUI's `Zoom` for transitions.
- **Usage:** Wrap any element with `<Tooltip title="Info">...</Tooltip>`.
- **References:** [MUI Tooltip](../../../documentation/mui/Tooltip.md), [MUI Zoom](../../../documentation/mui/Zoom.md)

### 2.4. ErrorMessage

- **Purpose:** Displays an error alert with a title and message, using MUI's `Alert` and `AlertTitle`.
- **Key Features:**
  - Theme-aware background and text color.
  - Custom icon (`ErrorOutlineIcon`).
  - Handles both string and object error messages.
- **Usage:** Place `<ErrorMessage message={error} />` where error feedback is needed.
- **References:** [MUI Alert](../../../documentation/mui/Alert.md), [MUI AlertTitle](../../../documentation/mui/Alert.md)

### 2.5. Modal

- **Purpose:** Provides a modal dialog with title, description, content, and customizable actions.
- **Key Features:**
  - Uses MUI's `Dialog`, `DialogTitle`, `DialogContent`, `DialogActions`.
  - Theme-aware background, border radius, and shadow.
  - Supports primary and secondary action buttons.
  - Handles escape key and close button for accessibility.
- **Usage:** Render `<Modal isOpen={open} onClose={handleClose} title="..." description="...">...</Modal>` for dialogs.
- **References:** [MUI Dialog](../../../documentation/mui/Dialog.md), [MUI Button](../../../documentation/mui/Button.md), [MUI IconButton](../../../documentation/mui/IconButton.md)

---

## 3. File Tree

```
UI/
├── ErrorMessage.jsx
├── Modal.jsx
├── Spinner.jsx
├── ToastProvider.jsx
└── Tooltip.jsx
```

---

## 4. Further Notes

- All components are memoized for performance.
- For theming and color variables, see the project's `tailwind.config.js` and MUI theme files.
- For advanced usage and customization, refer to the individual component files and the [MUI documentation index](../../../documentation/mui/README.md).

---

## 5. References

- [MUI Component Index](../../../documentation/mui/README.md)
- [MUI Theming](../../../documentation/mui/Theming.md)
- [MUI DarkMode](../../../documentation/mui/DarkMode.md)
- [Tailwind Config](../../../../tailwind.config.js)
