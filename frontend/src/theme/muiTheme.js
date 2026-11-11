import { createTheme } from '@mui/material/styles'
import { colors, fontSans } from './tokens'

/**
 * The MUI theme for one mode, built from the family tokens so MUI components look like the
 * rest of the family: sentence-case tabs and buttons, outlined fields with a normal-size
 * label above them, one focus ring, no ripple.
 * Component styles use the CSS variables, so they follow the page's theme with no re-render;
 * the palette uses the values, which MUI needs for its own shades.
 */
export const createAppTheme = (mode) => {
  const c = colors[mode]
  return createTheme({
    palette: {
      mode,
      primary: { main: c.primary, dark: c['primary-hover'], contrastText: c['on-primary'] },
      secondary: { main: c.muted, contrastText: c.surface },
      error: { main: c.danger },
      warning: { main: c.warn },
      background: { default: c.bg, paper: c.surface },
      text: { primary: c.text, secondary: c.muted, disabled: c['on-disabled'] },
      divider: c.border,
      action: { disabledBackground: c.disabled, disabled: c['on-disabled'] },
    },
    typography: {
      fontFamily: fontSans,
      button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 6 },
    components: {
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 'var(--weight-medium)',
            fontSize: 'var(--text-sm)',
            lineHeight: 'var(--leading)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-1) var(--space-3)',
          },
          contained: {
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: '1px solid var(--color-primary)',
            '&:hover': { backgroundColor: 'var(--color-primary-hover)', borderColor: 'var(--color-primary-hover)' },
            '&.Mui-disabled': {
              backgroundColor: 'var(--color-disabled)',
              color: 'var(--color-on-disabled)',
              borderColor: 'var(--color-border)',
            },
          },
          outlined: {
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderColor: 'var(--color-border-strong)',
            '&:hover': { backgroundColor: 'var(--color-surface-sunken)', borderColor: 'var(--color-border-strong)' },
            '&.Mui-disabled': {
              backgroundColor: 'var(--color-disabled)',
              color: 'var(--color-on-disabled)',
              borderColor: 'var(--color-border)',
            },
          },
          text: { color: 'var(--color-accent)' },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-sm)',
            '&:hover': { backgroundColor: 'var(--color-surface-sunken)' },
            '&.Mui-disabled': { color: 'var(--color-on-disabled)' },
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40, borderBottom: '1px solid var(--color-border)' },
          indicator: { backgroundColor: 'var(--color-accent)' },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            minHeight: 40,
            fontSize: 'var(--text-base)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-muted)',
            '&.Mui-selected': { color: 'var(--color-accent)' },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          root: {
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            color: 'var(--color-text)',
            '&.Mui-focused': { color: 'var(--color-text)' },
            '&.Mui-disabled': { color: 'var(--color-on-disabled)' },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontSize: 'var(--text-base)',
            color: 'var(--color-muted)',
            '&.Mui-focused': { color: 'var(--color-accent)' },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-base)',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border-strong)' },
            '&:hover:not(.Mui-disabled) .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-text)' },
            // The one focus ring: the border becomes the ring; theme.css keeps the input's own outline off.
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--color-focus)',
              borderWidth: 'var(--focus-ring-width)',
            },
            '&.Mui-disabled': { backgroundColor: 'var(--color-disabled)' },
            '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-border)' },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--color-danger)' },
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: { paddingTop: 'var(--space-2)', paddingBottom: 'var(--space-2)' },
          icon: { color: 'var(--color-muted)' },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', backgroundColor: 'var(--color-surface)', color: 'var(--color-text)' },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-2)', maxHeight: 280 },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontSize: 'var(--text-sm)',
            '&:hover': { backgroundColor: 'var(--color-surface-sunken)' },
            '&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible': {
              backgroundColor: 'var(--color-accent-subtle)',
              color: 'var(--color-text)',
              fontWeight: 'var(--weight-medium)',
            },
            '&.Mui-focusVisible': { backgroundColor: 'var(--color-surface-sunken)' },
          },
        },
      },
      MuiFormHelperText: {
        styleOverrides: { root: { color: 'var(--color-muted)', fontSize: 'var(--text-xs)' } },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: 'var(--color-primary)' },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: 'var(--color-primary)', opacity: 1 },
          },
          track: { backgroundColor: 'var(--color-border-strong)', opacity: 1 },
        },
      },
      MuiCheckbox: {
        styleOverrides: { root: { color: 'var(--color-border-strong)', '&.Mui-checked': { color: 'var(--color-primary)' } } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: 'var(--color-text)', color: 'var(--color-surface)', fontSize: 'var(--text-xs)' },
        },
      },
    },
  })
}
