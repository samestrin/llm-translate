import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsProvider } from '../contexts/SettingsContext'
import { ModelAccessProvider } from '../contexts/ModelAccessContext'
import { http } from '../services/api'
import translationService from '../services/translationService'
import { MISSING_CREDENTIAL_MESSAGE } from '../services/modelAccess'
import Home from './Home'

// Epic 08 T4 on the page: in the public demo, translate asks for a key or code instead of
// failing, the credential travels in headers only, and the speak button is hidden with a
// one-line reason for a preset without speech.

const PRESETS_BODY = {
  public_demo: true,
  presets: [
    { id: 'openai', label: 'OpenAI', speech: true },
    { id: 'openrouter', label: 'OpenRouter', speech: false },
    { id: 'demo', label: 'Demo code', speech: false },
  ],
}

const V1_RESPONSE = {
  translation: '¡Hola, mundo!',
  from_lang: 'English',
  to_lang: 'Spanish',
  model: 'gpt-5-nano',
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  glossary_misses: [],
  cached: false,
}

let calls
let originalAdapter

const header = (config, name) =>
  typeof config.headers?.get === 'function' ? config.headers.get(name) : config.headers?.[name]

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  calls = []
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    calls.push(config)
    const url = config.url
    let data = {}
    if (url === '/v1/presets') data = PRESETS_BODY
    else if (url === '/') data = { message: 'llm-translate is running' }
    else if (url === '/v1/translate') data = V1_RESPONSE
    else if (url === '/v1/translate/file') {
      data = {
        content: '{"a": "Hola"}', format: 'json', from_lang: 'English', to_lang: 'Spanish',
        report: { segments: 1, model: 'm', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } },
      }
    }
    return { data, status: 200, statusText: 'OK', headers: {}, config }
  }
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
  vi.restoreAllMocks()
})

const renderHome = () =>
  render(
    <SettingsProvider>
      <ModelAccessProvider>
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </ModelAccessProvider>
    </SettingsProvider>
  )

const posts = () => calls.filter((c) => c.method === 'post')

const typeText = (text) =>
  fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: text } })

const clickTranslate = () => fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))

const pickPreset = async (label) => {
  fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Provider' }))
  fireEvent.click(screen.getByRole('option', { name: label }))
}

const enterKey = async (label, value) => {
  // The preset dropdown's own value can share the field's label text; target the input.
  fireEvent.change(await screen.findByLabelText(label, { selector: 'input' }), { target: { value } })
}

describe('Home in the public demo', () => {
  it('shows the key panel and the public notice', async () => {
    renderHome()
    expect(await screen.findByRole('combobox', { name: 'Provider' })).toBeInTheDocument()
    expect(screen.getByText('Public demo: do not upload private files. Files are translated in memory and not stored.')).toBeInTheDocument()
  })

  it('translate asks for a key or code instead of sending a model call', async () => {
    renderHome()
    await screen.findByRole('combobox', { name: 'Provider' })
    typeText('Hello')
    clickTranslate()
    expect(await screen.findByText('Key or demo code needed')).toBeInTheDocument()
    expect(screen.getByText(MISSING_CREDENTIAL_MESSAGE)).toBeInTheDocument()
    expect(posts()).toHaveLength(0)
  })

  it('a demo code goes out in X-Demo-Code and the translation comes back', async () => {
    renderHome()
    await enterKey('Demo code', 'demo-code-123')
    typeText('Hello')
    clickTranslate()
    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(posts()).toHaveLength(1)
    expect(header(posts()[0], 'X-Demo-Code')).toBe('demo-code-123')
    expect(header(posts()[0], 'X-Model-Key')).toBeFalsy()
    expect(posts()[0].url).not.toContain('demo-code-123')
    expect(JSON.stringify(posts()[0].data)).not.toContain('demo-code-123')
  })

  it('a preset key goes out in X-Model-Key with the preset', async () => {
    renderHome()
    await pickPreset('OpenAI')
    await enterKey('OpenAI API key', 'sk-fake')
    typeText('Hello')
    clickTranslate()
    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(header(posts()[0], 'X-Model-Preset')).toBe('openai')
    expect(header(posts()[0], 'X-Model-Key')).toBe('sk-fake')
  })

  it('hides the speak button with a one-line reason for a preset without speech', async () => {
    renderHome()
    await pickPreset('OpenRouter')
    await enterKey('OpenRouter API key', 'sk-fake')
    typeText('Hello')
    clickTranslate()
    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Listen to translation' })).not.toBeInTheDocument()
    expect(screen.getByText('Speech is not available for OpenRouter.')).toBeInTheDocument()
  })

  it('keeps the speak button for a preset with speech', async () => {
    renderHome()
    await pickPreset('OpenAI')
    await enterKey('OpenAI API key', 'sk-fake')
    typeText('Hello')
    clickTranslate()
    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Listen to translation' })).toBeInTheDocument()
    expect(screen.queryByText(/Speech is not available/)).not.toBeInTheDocument()
  })

  it('file translation asks for a key or code too', async () => {
    renderHome()
    await screen.findByRole('combobox', { name: 'Provider' })
    fireEvent.click(screen.getByRole('tab', { name: 'File' }))
    fireEvent.change(screen.getByLabelText('Choose a file'), {
      target: { files: [new File(['{"a": "Hello"}'], 'a.json', { type: 'application/json' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))
    expect(await screen.findByText('Key or demo code needed')).toBeInTheDocument()
    expect(posts()).toHaveLength(0)
  })

  it('after clear, translate asks again even for the text just translated', async () => {
    renderHome()
    await enterKey('Demo code', 'demo-code-123')
    typeText('Hello')
    clickTranslate()
    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(posts()).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    clickTranslate()
    expect(await screen.findByText('Key or demo code needed')).toBeInTheDocument()
    await waitFor(() => expect(posts()).toHaveLength(1)) // nothing new went out
  })
})
