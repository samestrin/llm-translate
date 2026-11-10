import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsProvider } from '../contexts/SettingsContext'
import History from './History'
import HistoryList from '../components/History/HistoryList'

const item = (id, sourceText, translatedText) => ({
  id,
  timestamp: '2026-01-01T00:00:00.000Z',
  sourceText,
  translatedText,
  sourceLang: 'English',
  targetLang: 'Spanish',
})

const renderHistory = () =>
  render(
    <SettingsProvider>
      <MemoryRouter>
        <History />
      </MemoryRouter>
    </SettingsProvider>,
  )

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('History', () => {
  it('shows the empty state when nothing is saved', () => {
    renderHistory()
    expect(screen.getByText('No translation history yet.')).toBeInTheDocument()
  })

  it('shows a no-result message for a search that matches nothing', () => {
    localStorage.setItem('translationHistory', JSON.stringify([item('1', 'hello', 'hola')]))
    renderHistory()
    fireEvent.change(screen.getByPlaceholderText('Translation search term...'), { target: { value: 'zzz' } })
    expect(screen.getByText('No translations match "zzz".')).toBeInTheDocument()
    expect(screen.getByText('Try a different search term.')).toBeInTheDocument()
  })

  it('shows a loading status while the history is being read, then the items', async () => {
    localStorage.setItem('translationHistory', JSON.stringify([item('1', 'hello', 'hola')]))
    const list = (isLoading) => (
      <HistoryList
        history={isLoading ? [] : [item('1', 'hello', 'hola')]}
        isLoading={isLoading}
        searchQuery=""
        formatTimestamp={() => 'now'}
        truncateText={(t) => t}
      />
    )
    const { rerender } = render(<MemoryRouter>{list(true)}</MemoryRouter>)
    expect(screen.getByRole('status')).toHaveTextContent('Loading history')
    rerender(<MemoryRouter>{list(false)}</MemoryRouter>)
    expect(screen.queryByText(/Loading history/)).not.toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('treats a whitespace-only search as no search', () => {
    localStorage.setItem('translationHistory', JSON.stringify([item('1', 'hello', 'hola')]))
    renderHistory()
    fireEvent.change(screen.getByPlaceholderText('Translation search term...'), { target: { value: '   ' } })
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('shows an alert, not an empty list, when history cannot be loaded', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('translationHistory', '{oops')
    renderHistory()
    expect(screen.getByRole('alert')).toHaveTextContent('Your translation history could not be loaded.')
    expect(screen.queryByText('No translation history yet.')).not.toBeInTheDocument()
  })

  it('confirms clearing in a dialog that takes focus and closes on Escape', () => {
    localStorage.setItem('translationHistory', JSON.stringify([item('1', 'hello', 'hola')]))
    renderHistory()
    const clearAll = screen.getByRole('button', { name: 'Clear all translation history' })
    clearAll.focus()
    // A native button's Enter/Space activation is a click.
    fireEvent.click(clearAll)
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Clear Translation History')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()

    // Escape cancels, keeps the item and returns focus to the button.
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('hello')).toBeInTheDocument()
    expect(clearAll).toHaveFocus()

    fireEvent.click(clearAll)
    fireEvent.click(screen.getByRole('button', { name: 'Clear History' }))
    expect(screen.queryByText('hello')).not.toBeInTheDocument()
    expect(screen.getByText('No translation history yet.')).toBeInTheDocument()
  })
})
