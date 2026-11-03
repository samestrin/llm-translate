import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsProvider } from '../contexts/SettingsContext'
import { http } from '../services/api'
import translationService from '../services/translationService'
import Home from './Home'

const V1_RESPONSE = {
  translation: '¡Hola, mundo!',
  from_lang: 'English',
  to_lang: 'Spanish',
  model: 'gpt-4o-mini',
  usage: { prompt_tokens: 42, completion_tokens: 6, total_tokens: 48 },
  glossary_misses: [],
  cached: false,
}

let calls
let originalAdapter

beforeEach(() => {
  localStorage.clear()
  calls = []
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: JSON.parse(config.data) })
    return { data: V1_RESPONSE, status: 200, statusText: 'OK', headers: {}, config }
  }
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
})

const renderHome = () =>
  render(
    <SettingsProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </SettingsProvider>,
  )

describe('Home', () => {
  it('translates on /v1 and stores the translation in history', async () => {
    localStorage.setItem('settings', JSON.stringify({ aiProvider: 'groq', historyEnabled: true, maxHistoryItems: 50 }))
    renderHome()

    fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: 'Hello, world!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))

    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(screen.getByText('Translated with gpt-4o-mini')).toBeInTheDocument()

    const history = JSON.parse(localStorage.getItem('translationHistory'))
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      sourceText: 'Hello, world!',
      translatedText: '¡Hola, mundo!',
      targetLang: 'English',
      model: 'gpt-4o-mini',
    })

    // No health check on GET /, and no provider in the body.
    expect(calls).toEqual([
      { method: 'post', url: '/v1/translate', data: { text: 'Hello, world!', from_lang: 'Auto-detect', to_lang: 'English' } },
    ])
  })

  it.each([
    ['a /v1 item', { model: 'gpt-4o-mini' }],
    ['an item saved before /v1', { service_used: 'openai', model_used: 'gpt-4o-mini' }],
  ])('shows the model of %s opened from history', async (_, fields) => {
    sessionStorage.setItem('selectedHistoryItem', JSON.stringify({
      sourceText: 'Hello', translatedText: 'Hola', sourceLang: 'English', targetLang: 'Spanish', ...fields,
    }))
    renderHome()

    expect(await screen.findByDisplayValue('Hola')).toBeInTheDocument()
    expect(screen.getByText('Translated with gpt-4o-mini')).toBeInTheDocument()
    expect(calls).toEqual([])
  })

  it('makes no request on load', async () => {
    renderHome()
    await waitFor(() => expect(screen.getByPlaceholderText('Enter text to translate...')).toBeInTheDocument())
    expect(calls).toEqual([])
  })
})
