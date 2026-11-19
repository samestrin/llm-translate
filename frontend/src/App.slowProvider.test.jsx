import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { http } from './services/api'
import translationService from './services/translationService'
import App from './App'

// A visitor's own Synthetic key took 16.9 s for a 141-character title, and the page gave up
// at 15 s (EST-7600). The fake API answers after a delay and, like axios's browser adapter,
// fails with ECONNABORTED when the request's timeout runs out first.
const TRANSLATION = { translation: 'Hola', from_lang: 'English', to_lang: 'Spanish', model: 'm', usage: {} }

const slowAdapter = (delayMs) => (config) => {
  if (!(config.method === 'post' && config.url === '/v1/translate')) {
    return Promise.resolve({ data: { message: 'llm-translate is running' }, status: 200, statusText: 'OK', headers: {}, config })
  }
  return new Promise((resolve, reject) => {
    const timer = config.timeout
      ? setTimeout(() => {
        clearTimeout(answer)
        const error = new Error(`timeout of ${config.timeout}ms exceeded`)
        error.code = 'ECONNABORTED'
        error.config = config
        reject(error)
      }, config.timeout)
      : null
    const answer = setTimeout(() => {
      clearTimeout(timer)
      resolve({ data: TRANSLATION, status: 200, statusText: 'OK', headers: {}, config })
    }, delayMs)
  })
}

let originalAdapter

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  localStorage.clear()
  // jsdom has no matchMedia; the theme and the toaster read it.
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} }))
  originalAdapter = http.defaults.adapter
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  delete window.matchMedia
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const wait = (ms) => act(() => vi.advanceTimersByTimeAsync(ms))

const translateHello = async () => {
  render(<App />)
  await wait(0)
  fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: 'Hello' } })
  fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))
}

describe('a slow provider', () => {
  it('still yields a translation when the API answers after 20 s', async () => {
    http.defaults.adapter = slowAdapter(20000)
    await translateHello()
    await wait(20000)
    expect(screen.getByDisplayValue('Hola')).toBeInTheDocument()
    expect(screen.queryByText(/took too long/)).not.toBeInTheDocument()
  })

  it('shows the seconds waited, then says some providers take up to a minute', async () => {
    http.defaults.adapter = slowAdapter(30000)
    await translateHello()

    await wait(12000)
    expect(screen.getByText('12 s')).toBeInTheDocument()
    expect(screen.queryByText(/Some providers take up to a minute/)).not.toBeInTheDocument()

    await wait(9000)
    expect(screen.getByText('21 s')).toBeInTheDocument()
    expect(screen.getByText(/Some providers take up to a minute/)).toBeInTheDocument()

    await wait(9000)
    expect(screen.getByDisplayValue('Hola')).toBeInTheDocument()
    expect(screen.queryByText(/\d+ s$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Some providers take up to a minute/)).not.toBeInTheDocument()
  })

  it('the fake API gives up like the browser does when the timeout is shorter than the answer', async () => {
    // The oracle above, shown to fail: with the old 15 s timeout the same answer is lost.
    const result = slowAdapter(20000)({ method: 'post', url: '/v1/translate', timeout: 15000 })
    const outcome = expect(result).rejects.toMatchObject({ code: 'ECONNABORTED' })
    await vi.advanceTimersByTimeAsync(15000)
    await outcome
  })
})
