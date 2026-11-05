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
let response
let originalAdapter

beforeEach(() => {
  localStorage.clear()
  calls = []
  response = V1_RESPONSE
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, data: JSON.parse(config.data) })
    return { data: response, status: 200, statusText: 'OK', headers: {}, config }
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

  it('sends the saved glossary and style guide and lists the glossary misses', async () => {
    localStorage.setItem('translationOptions', JSON.stringify({
      glossary: [{ sourceTerm: 'Dashboard', targetTerm: 'Panel', note: '', doNotTranslate: false }],
      styleGuide: { tone: 'friendly', formality: '', audience: '', notes: '' },
    }))
    response = { ...V1_RESPONSE, glossary_misses: [{ term: 'Dashboard', expected: 'Panel' }] }
    renderHome()

    fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: 'Open the Dashboard' } })
    fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))

    const misses = await screen.findByRole('list', { name: 'Glossary terms missing from the translation' })
    expect(misses).toHaveTextContent('Dashboard')
    expect(misses).toHaveTextContent('Panel')
    expect(calls[0].data).toEqual({
      text: 'Open the Dashboard',
      from_lang: 'Auto-detect',
      to_lang: 'English',
      glossary: [{ source_term: 'Dashboard', target_term: 'Panel' }],
      style_guide: { tone: 'friendly' },
    })
  })

  it('saves glossary edits in this browser and does not reuse a translation made with another glossary', async () => {
    renderHome()
    fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: 'Open the Dashboard' } })
    fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))
    await screen.findByDisplayValue('¡Hola, mundo!')
    expect(screen.queryByRole('list', { name: 'Glossary terms missing from the translation' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add term' }))
    fireEvent.change(screen.getByLabelText('Source term 1'), { target: { value: 'Dashboard' } })
    fireEvent.change(screen.getByLabelText('Translation 1'), { target: { value: 'Panel' } })
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'admins' } })

    expect(JSON.parse(localStorage.getItem('translationOptions'))).toMatchObject({
      glossary: [{ sourceTerm: 'Dashboard', targetTerm: 'Panel' }],
      styleGuide: { audience: 'admins' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))
    await waitFor(() => expect(calls).toHaveLength(2))
    expect(calls[1].data.glossary).toEqual([{ source_term: 'Dashboard', target_term: 'Panel' }])

    fireEvent.click(screen.getByRole('button', { name: 'Remove term 1' }))
    expect(screen.queryByLabelText('Source term 1')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('translationOptions')).glossary).toEqual([])
  })

  it('shows the error of a failed /v1/translate once', async () => {
    http.defaults.adapter = async (config) => {
      calls.push({ method: config.method, url: config.url, data: JSON.parse(config.data) })
      const err = new Error('Request failed with status code 502')
      err.response = { status: 502, statusText: 'Bad Gateway', data: { error: { type: 'upstream_error', message: 'The model provider is unavailable' } } }
      throw err
    }
    renderHome()

    fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: 'Hello, world!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))

    expect(await screen.findByText('The model provider is unavailable')).toBeInTheDocument()
    expect(screen.getAllByText('The model provider is unavailable')).toHaveLength(1)
    expect(calls).toHaveLength(1)
  })

  it('makes no request on load', async () => {
    renderHome()
    await waitFor(() => expect(screen.getByPlaceholderText('Enter text to translate...')).toBeInTheDocument())
    expect(calls).toEqual([])
  })
})
