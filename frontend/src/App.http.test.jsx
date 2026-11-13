import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { http } from './services/api'
import translationService from './services/translationService'
import App from './App'

// All of the page's HTTP goes through the client in services/api.js, whose calls
// api.contract.test.js checks against the backend's routes. With that client's
// adapter stubbed, any request made another way (fetch, a second axios instance,
// a bare XMLHttpRequest) reaches jsdom's fetch or XMLHttpRequest, which are spied on.
let calls
let originalAdapter
let fetchSpy
let xhrSpy

const ROUTES = {
  'get /': { message: 'llm-translate is running' },
  'post /v1/translate': { translation: 'Hola', from_lang: 'English', to_lang: 'Spanish', model: 'm', usage: {} },
  'post /v1/translate/file': {
    content: '{"a": "Hola"}', format: 'json', from_lang: 'English', to_lang: 'Spanish',
    report: { segments: 1, model: 'm', usage: {} },
  },
}

beforeEach(() => {
  localStorage.clear()
  // jsdom has no matchMedia; the theme and the toaster read it.
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  calls = []
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    calls.push(`${config.method} ${config.url}`)
    return { data: ROUTES[`${config.method} ${config.url}`], status: 200, statusText: 'OK', headers: {}, config }
  }
  fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch is not the API client'))
  xhrSpy = vi.spyOn(XMLHttpRequest.prototype, 'open')
})

afterEach(() => {
  delete window.matchMedia
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
  vi.restoreAllMocks()
})

describe('the page', () => {
  it('makes every HTTP call through the API client', async () => {
    render(<App />)
    await waitFor(() => expect(calls).toContain('get /'))

    fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))
    expect(await screen.findByDisplayValue('Hola')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'File' }))
    fireEvent.change(screen.getByLabelText('Choose a file'), {
      target: { files: [new File(['{"a": "Hello"}'], 'a.json', { type: 'application/json' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))
    await waitFor(() => expect(calls).toContain('post /v1/translate/file'))

    expect(calls).toContain('post /v1/translate')
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(xhrSpy).not.toHaveBeenCalled()
  })

  it('would catch a request made around the client', async () => {
    // The oracle above, shown to fail: a fetch or a second axios instance is seen.
    render(<App />)
    await waitFor(() => expect(calls).toContain('get /'))
    await fetch('/v1/translate').catch(() => {})
    const { default: axios } = await import('axios')
    await axios.get('/elsewhere').catch(() => {})
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(xhrSpy).toHaveBeenCalled()
  })
})
