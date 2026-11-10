# UI Components

Reusable, theme-aware building blocks for the LLM Translate frontend. They are styled with Tailwind only, using the semantic tokens in [`src/index.css`](../../index.css) (`bg-surface`, `text-ink`, `text-ink-muted`, `border-line`, `bg-brand`, `text-brand-ink` and so on), so one class list covers light and dark mode. The global focus ring and the `prefers-reduced-motion` rule also live in `index.css`; components do not set their own outline.

## Components

### ToastProvider

Wraps the app and renders `react-hot-toast`'s `<Toaster>` with the surface, ink and line tokens. Usage: `<ToastProvider>...</ToastProvider>`, then `toast.success('Saved')` anywhere.

### Spinner

An inline spinner with `role="status"` and a label read by screen readers.

- Props: `size` (`xs`, `sm`, `md`, `lg`, `xl`), `color` (`primary`, `secondary`, `success`, `error`, `white`), `label` (default `Loading`), `show`, `className`.
- Usage: `<Spinner size="sm" label="Translating" />`.

### Tooltip

A short label shown on hover and keyboard focus, built on `@radix-ui/react-tooltip`.

- Props: `title` or `content` (the text), `placement` (`top`, `right`, `bottom`, `left`), `delayDuration` (ms).
- The child must be a single element that can hold a ref (a button, a link, a `span`).
- Usage: `<Tooltip title="Copy"><button aria-label="Copy">...</button></Tooltip>`.

### ErrorMessage

An `role="alert"` box with an icon, an "Error" heading and the message. Object messages are shown as JSON. Renders nothing when `message` is empty.

### Modal

A modal dialog rendered into `document.body`.

- Focus moves to the close button when it opens, Tab and Shift+Tab stay inside, Escape and a click on the backdrop call `onClose`, and focus returns to the element that opened it.
- Props: `isOpen`, `onClose`, `title`, `description`, `children`, `maxWidth` (`xs` to `xl`), `primaryButtonText`, `primaryButtonAction`, `primaryButtonProps` (`color: 'error'` for a destructive action), `secondaryButtonText`, `secondaryButtonAction` (defaults to `onClose`).
- Usage: `<Modal isOpen={open} onClose={close} title="Clear history?" primaryButtonText="Clear" primaryButtonAction={clear} secondaryButtonText="Cancel" />`.

Tests: [`UI.test.jsx`](UI.test.jsx).
