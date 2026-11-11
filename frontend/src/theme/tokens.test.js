import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors, contrast } from './tokens'
import { createAppTheme } from './muiTheme'

// Every `--color-x: light-dark(#light, #dark)` in theme.css.
// Vitest runs from frontend/; CSS imports are stubbed in tests, so read the file itself.
// eslint-disable-next-line no-undef
const css = readFileSync(resolve(process.cwd(), 'src/theme.css'), 'utf8')

const cssColors = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi)].map(([, name, light, dark]) => [
    name,
    { light: light.toLowerCase(), dark: dark.toLowerCase() },
  ]),
)

// Text on the background it sits on: each must reach WCAG AA, 4.5:1.
const TEXT_PAIRS = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-sunken'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'surface-sunken'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'surface-sunken'],
  ['accent', 'accent-subtle'],
  ['on-accent', 'accent'],
  ['on-primary', 'primary'],
  ['on-primary', 'primary-hover'],
  ['on-disabled', 'disabled'],
  ['danger', 'surface'],
  ['danger', 'danger-subtle'],
  ['warn', 'surface'],
]

describe('design tokens', () => {
  it('the MUI values are the theme.css values', () => {
    for (const mode of ['light', 'dark']) {
      for (const [name, value] of Object.entries(colors[mode])) {
        expect(cssColors[name]?.[mode], `--color-${name} (${mode})`).toBe(value)
      }
    }
    expect(Object.keys(colors.light).sort()).toEqual(Object.keys(cssColors).sort())
  })

  for (const mode of ['light', 'dark']) {
    it.each(TEXT_PAIRS)(`${mode}: %s on %s reaches 4.5:1`, (fg, bg) => {
      expect(contrast(colors[mode][fg], colors[mode][bg])).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('the accent is teal: #0f766e in light, #5eead4 in dark', () => {
    expect(colors.light.accent).toBe('#0f766e')
    expect(colors.dark.accent).toBe('#5eead4')
  })
})

describe('the MUI theme', () => {
  it.each(['light', 'dark'])('%s: sentence-case tabs and buttons, the family font and the teal primary', (mode) => {
    const theme = createAppTheme(mode)
    expect(theme.palette.mode).toBe(mode)
    expect(theme.palette.primary.main).toBe(colors[mode].primary)
    expect(theme.typography.fontFamily).toMatch(/^system-ui/)
    expect(theme.typography.button.textTransform).toBe('none')
    expect(theme.components.MuiTab.styleOverrides.root.textTransform).toBe('none')
    expect(theme.components.MuiButton.styleOverrides.root.textTransform).toBe('none')
  })
})
