import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import api, { http } from './api'
import translationService from './translationService'
import { saveAccess, clearAccess, setPresetsInfo, MISSING_CREDENTIAL_MESSAGE } from './modelAccess'

// Epic 08 T4: every model call carries the visitor's credential in request headers only,
// and in the public demo no model call goes out without a key or code.

const FAKE_KEY = 'sk-test-FAKE-KEY-1234567890'

const PRESETS_BODY = {
  public_demo: true,
  presets: [
    { id: 'openai', label: 'OpenAI', speech: true },
    { id: 'openrouter', label: 'OpenRouter', speech: false },
    { id: 'demo', label: 'Demo code', speech: false },
  ],
}

let calls
let originalAdapter

const respondWith = (status, data = {}) => async (config) => {
  calls.push(config)
  if (status >= 400) {
    const error = new Error(`Request failed with status code ${status}`)
    error.config = config
    error.response = { status, statusText: '', data, config }
    throw error
  }
  return { data, status, statusText: 'OK', headers: {}, config }
}

const header = (config, name) =>
  typeof config.headers?.get === 'function' ? config.headers.get(name) : config.headers?.[name]

const fileCall = () => api.translateFile({ file: new File(['{"a": "Hi"}'], 'a.json'), fromLang: 'English', toLang: 'Spanish' })
const textCall = () => api.translateText({ text: 'Hello', fromLang: 'English', toLang: 'Spanish' })
const speakCall = () => api.speak({ text: 'Hola', lang: 'Spanish' })

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setPresetsInfo(null)
  calls = []
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = respondWith(200)
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
  clearAccess()
  setPresetsInfo(null)
})

describe('credential headers on every model call', () => {
  it.each([
    ['translateText', textCall],
    ['translateFile', fileCall],
    ['speak', speakCall],
  ])('%s sends the preset key in headers only', async (_name, call) => {
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: false })
    await call()
    expect(calls).toHaveLength(1)
    expect(header(calls[0], 'X-Model-Preset')).toBe('openai')
    expect(header(calls[0], 'X-Model-Key')).toBe(FAKE_KEY)
    // The key is in no URL and no body.
    expect(calls[0].url).not.toContain(FAKE_KEY)
    expect(JSON.stringify(calls[0].params ?? null)).not.toContain(FAKE_KEY)
    const body = calls[0].data
    const serialized = body instanceof FormData
      ? JSON.stringify([...body.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : v.name]))
      : JSON.stringify(body)
    expect(serialized).not.toContain(FAKE_KEY)
  })

  it.each([
    ['translateText', textCall],
    ['translateFile', fileCall],
    ['speak', speakCall],
  ])('%s sends a demo code in X-Demo-Code only', async (_name, call) => {
    saveAccess({ preset: 'demo', key: 'demo-code-123', remember: false })
    await call()
    expect(header(calls[0], 'X-Demo-Code')).toBe('demo-code-123')
    expect(header(calls[0], 'X-Model-Key')).toBeFalsy()
  })

  it('sends no credential headers when none is stored (env-key mode)', async () => {
    await textCall()
    expect(header(calls[0], 'X-Model-Key')).toBeFalsy()
    expect(header(calls[0], 'X-Demo-Code')).toBeFalsy()
    expect(header(calls[0], 'X-Model-Preset')).toBeFalsy()
  })

  it('health and the presets list carry no credential headers and need no credential', async () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: false })
    http.defaults.adapter = respondWith(200, PRESETS_BODY)
    await api.health()
    await api.presets()
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual(['get /', 'get /v1/presets'])
    for (const config of calls) {
      expect(header(config, 'X-Model-Key')).toBeFalsy()
      expect(header(config, 'X-Demo-Code')).toBeFalsy()
    }
  })
})

describe('no model call without a key or code in the public demo', () => {
  beforeEach(() => setPresetsInfo(PRESETS_BODY))

  it.each([
    ['translateText', textCall],
    ['translateFile', fileCall],
    ['speak', speakCall],
  ])('%s asks for a key or code instead of sending', async (_name, call) => {
    await expect(call()).rejects.toMatchObject({ message: MISSING_CREDENTIAL_MESSAGE, type: 'missing_credentials' })
    expect(calls).toHaveLength(0)
  })

  it('the translation service asks too, even for a cached text', async () => {
    // Warm the cache in env-key mode, then switch the server to the public demo.
    setPresetsInfo(null)
    http.defaults.adapter = respondWith(200, { translation: 'Hola' })
    await translationService.translate('Hello', 'English', 'Spanish')
    expect(calls).toHaveLength(1)
    setPresetsInfo(PRESETS_BODY)
    await expect(translationService.translate('Hello', 'English', 'Spanish')).rejects.toMatchObject({
      type: 'missing_credentials',
    })
    expect(calls).toHaveLength(1) // the cache did not answer without a credential
  })

  it('a stored key lets the call through with headers', async () => {
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: false })
    await textCall()
    expect(calls).toHaveLength(1)
    expect(header(calls[0], 'X-Model-Key')).toBe(FAKE_KEY)
  })

  it('after clear the next call asks again and nothing is sent', async () => {
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: true })
    await textCall()
    clearAccess()
    await expect(textCall()).rejects.toMatchObject({ type: 'missing_credentials' })
    expect(calls).toHaveLength(1)
  })

  it('env-key mode still sends without credentials', async () => {
    setPresetsInfo(null)
    await textCall()
    expect(calls).toHaveLength(1)
  })
})

describe('the translation cache and the preset', () => {
  it('does not serve one preset\'s cached translation to another preset', async () => {
    http.defaults.adapter = respondWith(200, { translation: 'Hola' })
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: false })
    await translationService.translate('Hello', 'English', 'Spanish')
    saveAccess({ preset: 'openrouter', key: 'or-key', remember: false })
    await translationService.translate('Hello', 'English', 'Spanish')
    expect(calls).toHaveLength(2)
    expect(header(calls[1], 'X-Model-Preset')).toBe('openrouter')
  })

  it('is never keyed by the key: a new key for the same preset reuses the cache', async () => {
    http.defaults.adapter = respondWith(200, { translation: 'Hola' })
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: false })
    await translationService.translate('Hello', 'English', 'Spanish')
    saveAccess({ preset: 'openai', key: 'another-key', remember: false })
    await translationService.translate('Hello', 'English', 'Spanish')
    expect(calls).toHaveLength(1)
  })
})

describe('a failed call never carries the key in the error', () => {
  it('scrubs the credential headers from the error config that console logging would print', async () => {
    saveAccess({ preset: 'openai', key: FAKE_KEY, remember: false })
    http.defaults.adapter = respondWith(401, { error: { type: 'authentication_error', message: 'The key was rejected by OpenAI.' } })
    const error = await textCall().catch((e) => e)
    expect(error.message).toBe('The key was rejected by OpenAI.')
    const configs = [error.originalError?.config, error.originalError?.response?.config].filter(Boolean)
    expect(configs.length).toBeGreaterThan(0)
    for (const config of configs) {
      expect(header(config, 'X-Model-Key')).toBeFalsy()
      expect(header(config, 'X-Demo-Code')).toBeFalsy()
    }
  })

  it('scrubs a demo code too', async () => {
    saveAccess({ preset: 'demo', key: 'demo-code-123', remember: false })
    http.defaults.adapter = respondWith(401, { error: { type: 'authentication_error', message: 'This demo code is used up or expired.' } })
    const error = await speakCall().catch((e) => e)
    expect(header(error.originalError.config, 'X-Demo-Code')).toBeFalsy()
  })
})
