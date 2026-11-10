import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '../contexts/ThemeContext'
import { SettingsProvider } from '../contexts/SettingsContext'
import Settings from './Settings'

beforeEach(() => localStorage.clear())

describe('Settings', () => {
  it('offers only settings that do something', () => {
    render(
      <ThemeProvider>
        <SettingsProvider>
          <MemoryRouter>
            <Settings />
          </MemoryRouter>
        </SettingsProvider>
      </ThemeProvider>,
    )
    expect(screen.queryByText(/interface language/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/provider/i)).not.toBeInTheDocument()
    expect(screen.getByText('Save translation history')).toBeInTheDocument()
    expect(screen.getByText('Auto-translate as I type')).toBeInTheDocument()
  })
})
