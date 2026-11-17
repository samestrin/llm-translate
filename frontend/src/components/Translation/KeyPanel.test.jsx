import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { http } from '../../services/api'
import { ModelAccessProvider } from '../../contexts/ModelAccessContext'
import KeyPanel, { PUBLIC_NOTICE } from './KeyPanel'

// The key panel of the shared design (epic 08): preset dropdown, key or demo code field,
// remember box, clear. It appears only when the server says it is a public demo.

const PRESETS_BODY = {
  public_demo: true,
  presets: [
    { id: 'openai', label: 'OpenAI', speech: true },
    { id: 'openrouter', label: 'OpenRouter', speech: false },
    { id: 'demo', label: 'Demo code', speech: false },
  ],
}

let originalAdapter
let presetsResponse

const renderPanel = () =>
  render(
    <ModelAccessProvider>
      <KeyPanel />
    </ModelAccessProvider>
  )

const pickPreset = async (label) => {
  fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Provider' }))
  fireEvent.click(screen.getByRole('option', { name: label }))
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  presetsResponse = PRESETS_BODY
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    if (config.url === '/v1/presets') {
      if (presetsResponse instanceof Error) throw presetsResponse
      return { data: presetsResponse, status: 200, statusText: 'OK', headers: {}, config }
    }
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
  }
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  vi.restoreAllMocks()
})

describe('the key panel', () => {
  it('shows the public notice with the exact shared-design text', async () => {
    renderPanel()
    expect(await screen.findByText(PUBLIC_NOTICE)).toBeInTheDocument()
    expect(PUBLIC_NOTICE).toBe('Public demo: do not upload private files. Files are translated in memory and not stored.')
  })

  it('offers every preset the server lists, demo first selected', async () => {
    renderPanel()
    const picker = await screen.findByRole('combobox', { name: 'Provider' })
    expect(picker).toHaveTextContent('Demo code')
    fireEvent.mouseDown(picker)
    for (const label of ['OpenAI', 'OpenRouter', 'Demo code']) {
      expect(screen.getByRole('option', { name: label })).toBeInTheDocument()
    }
  })

  it('names the field for what the preset needs: a demo code or the provider key', async () => {
    renderPanel()
    expect(await screen.findByLabelText('Demo code', { selector: 'input' })).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Provider' }))
    fireEvent.click(screen.getByRole('option', { name: 'OpenAI' }))
    expect(screen.getByLabelText('OpenAI API key', { selector: 'input' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Demo code', { selector: 'input' })).not.toBeInTheDocument()
  })

  it('keeps the key in session storage only until remember is ticked', async () => {
    renderPanel()
    const field = await screen.findByLabelText('Demo code', { selector: 'input' })
    fireEvent.change(field, { target: { value: 'demo-code-123' } })
    expect(sessionStorage.getItem('modelAccessKey')).toBe('demo-code-123')
    expect(localStorage.getItem('modelAccessKey')).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: /Remember on this device/ }))
    expect(localStorage.getItem('modelAccessKey')).toBe('demo-code-123')
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()

    fireEvent.click(screen.getByRole('checkbox', { name: /Remember on this device/ }))
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
    expect(sessionStorage.getItem('modelAccessKey')).toBe('demo-code-123')
  })

  it('clear wipes the field, both storages, the preset and remember', async () => {
    renderPanel()
    await screen.findByLabelText('Demo code', { selector: 'input' })
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Provider' }))
    fireEvent.click(screen.getByRole('option', { name: 'OpenAI' }))
    fireEvent.change(screen.getByLabelText('OpenAI API key', { selector: 'input' }), { target: { value: 'sk-fake' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /Remember on this device/ }))
    expect(localStorage.getItem('modelAccessKey')).toBe('sk-fake')

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByLabelText('Demo code', { selector: 'input' })).toHaveValue('')
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(localStorage.getItem('modelAccess')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveTextContent('Demo code')
    expect(screen.getByRole('checkbox', { name: /Remember on this device/ })).not.toBeChecked()
  })

  it('restores a stored key and preset on mount', async () => {
    sessionStorage.setItem('modelAccessKey', 'sk-fake')
    localStorage.setItem('modelAccess', JSON.stringify({ preset: 'openai', remember: false }))
    renderPanel()
    expect(await screen.findByLabelText('OpenAI API key', { selector: 'input' })).toHaveValue('sk-fake')
  })

  it('wipes the key when the preset changes: one provider\'s key never goes to another', async () => {
    renderPanel()
    await pickPreset('OpenAI')
    fireEvent.change(screen.getByLabelText('OpenAI API key', { selector: 'input' }), { target: { value: 'sk-openai' } })
    expect(sessionStorage.getItem('modelAccessKey')).toBe('sk-openai')
    await pickPreset('OpenRouter')
    expect(screen.getByLabelText('OpenRouter API key', { selector: 'input' })).toHaveValue('')
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
  })

  it('repairs a stored preset the server no longer lists back to demo, without its key', async () => {
    localStorage.setItem('modelAccess', JSON.stringify({ preset: 'gone', remember: false }))
    sessionStorage.setItem('modelAccessKey', 'sk-fake')
    renderPanel()
    // The key belonged to the vanished preset; it must not go to the demo gateway.
    expect(await screen.findByLabelText('Demo code', { selector: 'input' })).toHaveValue('')
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Provider' })).toHaveTextContent('Demo code')
  })

  it('is hidden when the server is not a public demo', async () => {
    presetsResponse = { public_demo: false, presets: [] }
    renderPanel()
    await waitFor(() => expect(http.defaults.adapter).toBeDefined())
    expect(screen.queryByText(PUBLIC_NOTICE)).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument()
  })

  it('is hidden when the presets list cannot be reached', async () => {
    presetsResponse = new Error('network down')
    renderPanel()
    await waitFor(() => expect(screen.queryByText(PUBLIC_NOTICE)).not.toBeInTheDocument())
    expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument()
  })
})
