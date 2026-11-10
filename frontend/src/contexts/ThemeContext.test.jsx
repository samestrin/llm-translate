import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from './ThemeContext'

// A matchMedia stand-in whose prefers-color-scheme answer the test can flip.
const fakeSystem = (dark) => {
  const listeners = new Set()
  const mql = {
    get matches() {
      return dark
    },
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
  }
  window.matchMedia = vi.fn(() => mql)
  return {
    set(next) {
      dark = next
      listeners.forEach((fn) => fn({ matches: next }))
    },
    listeners,
  }
}

const Probe = () => {
  const { darkMode, toggleTheme } = useTheme()
  return (
    <button type="button" onClick={toggleTheme}>
      {darkMode ? 'dark' : 'light'}
    </button>
  )
}

const renderProbe = () =>
  render(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
  )

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
  })
  afterEach(() => {
    delete window.matchMedia
  })

  it('follows a dark system scheme on a first visit without storing a choice', () => {
    fakeSystem(true)
    renderProbe()
    expect(screen.getByRole('button')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(localStorage.getItem('theme')).toBeNull()
  })

  it('follows a light system scheme on a first visit', () => {
    fakeSystem(false)
    renderProbe()
    expect(screen.getByRole('button')).toHaveTextContent('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('tracks the system scheme while the visitor has not chosen', () => {
    const system = fakeSystem(false)
    renderProbe()
    act(() => system.set(true))
    expect(screen.getByRole('button')).toHaveTextContent('dark')
    expect(document.documentElement).toHaveClass('dark')
  })

  it('stores the toggled choice and keeps it when the system changes', () => {
    const system = fakeSystem(false)
    renderProbe()
    fireEvent.click(screen.getByRole('button'))
    expect(localStorage.getItem('theme')).toBe('dark')
    act(() => system.set(false))
    expect(screen.getByRole('button')).toHaveTextContent('dark')
    fireEvent.click(screen.getByRole('button'))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('uses a stored choice over the system scheme', () => {
    fakeSystem(true)
    localStorage.setItem('theme', 'light')
    renderProbe()
    expect(screen.getByRole('button')).toHaveTextContent('light')
  })

  it('ignores a stored value that is not light or dark', () => {
    fakeSystem(true)
    localStorage.setItem('theme', 'purple')
    renderProbe()
    expect(screen.getByRole('button')).toHaveTextContent('dark')
  })

  it('works where matchMedia is missing', () => {
    renderProbe()
    expect(screen.getByRole('button')).toHaveTextContent('light')
  })

  it('stops listening to the system when unmounted', () => {
    const system = fakeSystem(false)
    const { unmount } = renderProbe()
    expect(system.listeners.size).toBe(1)
    unmount()
    expect(system.listeners.size).toBe(0)
  })
})
