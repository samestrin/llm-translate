/**
 * The colour tokens of src/theme.css as values, for the MUI theme, which needs real colours
 * to compute its hover and disabled shades. tokens.test.js checks they match theme.css.
 */
export const colors = {
  light: {
    bg: '#f4f5f7',
    surface: '#ffffff',
    'surface-sunken': '#eef0f3',
    text: '#15171c',
    muted: '#545a65',
    border: '#dcdfe5',
    'border-strong': '#7c8390',
    accent: '#0f766e',
    'accent-hover': '#115e59',
    'accent-subtle': '#e6f4f2',
    'on-accent': '#ffffff',
    primary: '#0f766e',
    'primary-hover': '#115e59',
    'on-primary': '#ffffff',
    disabled: '#e4e7ec',
    'on-disabled': '#545a65',
    danger: '#b3261e',
    'danger-subtle': '#fdecea',
    warn: '#8a4a00',
    focus: '#0f766e',
  },
  dark: {
    bg: '#0f1115',
    surface: '#171a20',
    'surface-sunken': '#1f232b',
    text: '#e6e8ec',
    muted: '#a1a7b3',
    border: '#2c313a',
    'border-strong': '#6f7785',
    accent: '#5eead4',
    'accent-hover': '#99f6e4',
    'accent-subtle': '#12302d',
    'on-accent': '#042f2e',
    primary: '#0f766e',
    'primary-hover': '#115e59',
    'on-primary': '#ffffff',
    disabled: '#2a2f38',
    'on-disabled': '#a1a7b3',
    danger: '#ff8a80',
    'danger-subtle': '#3a1d1b',
    warn: '#f0a640',
    focus: '#5eead4',
  },
}

export const fontSans = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"

/** WCAG 2 contrast ratio of two #rrggbb colours. */
export const contrast = (a, b) => {
  const lum = (hex) => {
    const [r, g, b2] = hex.slice(1).match(/../g).map((v) => {
      const c = parseInt(v, 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b2
  }
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
