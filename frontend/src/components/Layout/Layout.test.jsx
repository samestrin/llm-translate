import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '../../contexts/ThemeContext'
import Layout from '.'

const renderAt = (path) =>
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<p>home page</p>} />
            <Route path="/history" element={<p>history page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    delete document.documentElement.dataset.theme
  })

  it('puts a skip link first that targets a focusable main', () => {
    renderAt('/')
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(document.body.querySelector('a')).toBe(skip)
    expect(skip).toHaveAttribute('href', '#main-content')
    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
    expect(main).toHaveAttribute('tabindex', '-1')
    expect(main).toHaveTextContent('home page')
  })

  it('renders the banner, main navigation, main and contentinfo landmarks', () => {
    renderAt('/')
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    const footerNav = screen.getByRole('navigation', { name: 'Footer' })
    // Plain words, not jargon: the model and speech pages are "Models" and "Speech".
    for (const [name, href] of [
      ['About', '/about'],
      ['Guide', '/guide'],
      ['Models', '/llm-info'],
      ['Speech', '/tts-info'],
      ['Privacy', '/privacy'],
      ['Terms', '/terms'],
    ]) {
      expect(within(footerNav).getByRole('link', { name })).toHaveAttribute('href', href)
    }
  })

  it('marks only the current page link with aria-current', () => {
    renderAt('/history')
    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
  })

  it('links the logo home', () => {
    renderAt('/history')
    expect(screen.getByRole('link', { name: 'LLM Translate home' })).toHaveAttribute('href', '/')
  })

  it('names what the theme toggle does next, as llm-pdf-chatbot does', () => {
    renderAt('/')
    // In light it offers dark; the name says what pressing does, so no aria-pressed as well.
    const toggle = screen.getByRole('button', { name: 'Dark theme' })
    expect(toggle).not.toHaveAttribute('aria-pressed')
    fireEvent.click(toggle)
    expect(document.documentElement).toHaveClass('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    // The label flips so the way back is clear.
    expect(screen.getByRole('button', { name: 'Light theme' })).toBe(toggle)
    fireEvent.click(toggle)
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByRole('button', { name: 'Dark theme' })).toBe(toggle)
  })

  it('shows the mark and the name in the header', () => {
    renderAt('/')
    const home = screen.getByRole('link', { name: 'LLM Translate home' })
    expect(home).toHaveTextContent('LLM Translate')
    const svg = home.querySelector('svg.logo-mark')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    // The colours come from the theme tokens, not fixed fills.
    for (const part of ['back', 'letter', 'front', 'lines']) {
      expect(svg.querySelector(`.logo-mark-${part}`)).not.toHaveAttribute('fill')
    }
  })
})

describe('MobileMenu', () => {
  beforeEach(() => localStorage.clear())

  it('opens a menu the button controls and closes it with Escape, returning focus', () => {
    renderAt('/history')
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    const panel = document.getElementById(button.getAttribute('aria-controls'))
    expect(panel).not.toBeNull()
    expect(within(panel).getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(button.getAttribute('aria-controls'))).toBeNull()
    expect(button).toHaveFocus()
  })

  it('closes after a link is followed', () => {
    renderAt('/history')
    const button = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    const panel = document.getElementById(button.getAttribute('aria-controls'))
    fireEvent.click(within(panel).getByRole('link', { name: 'Home' }))
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('main')).toHaveTextContent('home page')
  })

  it('closes when the button is pressed again and ignores other keys', () => {
    renderAt('/')
    const button = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(button)
    fireEvent.keyDown(document, { key: 'a' })
    expect(button).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })
})
