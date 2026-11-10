import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import openapiPaths from '../test/fixtures/openapi-paths.json'
import api, { http, DEFAULT_TIMEOUT_MS, HEALTH_TIMEOUT_MS, LONG_TIMEOUT_MS, WHOLE_DOCUMENT_CHARS } from './api'
import translationService from './translationService'

// The page may call only `/v1` operations that the backend's OpenAPI schema lists,
// plus `GET /`, the health check behind the page's service-reachable indicator.
// The fixture is exported from `app.openapi()`; a backend test fails when it drifts.
const isHealthCheck = ({ method, url }) => method === 'get' && url === '/'
const checkContract = ({ method, url }) => {
  if (isHealthCheck({ method, url })) {
    if (!openapiPaths['/']?.includes('get')) throw new Error('GET / is not in the backend\'s OpenAPI paths')
    return
  }
  if (!url.startsWith('/v1/')) {
    throw new Error(`${method.toUpperCase()} ${url} is not a /v1 route`)
  }
  if (!openapiPaths[url]?.includes(method)) {
    throw new Error(`${method.toUpperCase()} ${url} is not in the backend's OpenAPI paths`)
  }
}

// Every client function with arguments to call it; a new export must be added here.
const CLIENT_CALLS = {
  translateText: () => api.translateText({ text: 'Hello', fromLang: 'English', toLang: 'Spanish' }),
  translateFile: () =>
    api.translateFile({ file: new File(['{"a": "Hi"}'], 'a.json'), fromLang: 'English', toLang: 'Spanish' }),
  speak: () => api.speak({ text: 'Hola', lang: 'Spanish' }),
  health: () => api.health(),
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

beforeEach(() => {
  calls = []
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = respondWith(200)
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
})

const called = () => calls.map((c) => ({ method: c.method, url: c.url }))

describe('the /v1 contract', () => {
  it('rejects a path that is not a /v1 route', () => {
    for (const url of ['/translate', '/speak']) {
      expect(openapiPaths[url]).toBeDefined() // still served, deprecated
      expect(() => checkContract({ method: 'post', url })).toThrow('is not a /v1 route')
    }
    expect(() => checkContract({ method: 'post', url: '/' })).toThrow('is not a /v1 route')
  })

  it('allows only GET / outside /v1, as the health check', () => {
    expect(() => checkContract({ method: 'get', url: '/' })).not.toThrow()
  })

  it('rejects a /v1 path or method the backend does not serve', () => {
    expect(() => checkContract({ method: 'post', url: '/v1/review' })).toThrow('not in the backend')
    expect(() => checkContract({ method: 'get', url: '/v1/translate' })).toThrow('not in the backend')
  })

  it('fails when the page calls an old route through the client', async () => {
    await http.post('/translate', {})
    expect(() => called().forEach(checkContract)).toThrow('POST /translate is not a /v1 route')
  })

  it('covers every client function', () => {
    expect(Object.keys(api).sort()).toEqual(Object.keys(CLIENT_CALLS).sort())
  })

  it.each(Object.keys(CLIENT_CALLS))('%s calls only routes the contract allows', async (name) => {
    await CLIENT_CALLS[name]()
    expect(calls).toHaveLength(1)
    called().forEach(checkContract)
  })

  it('the translation service calls only /v1 routes in the OpenAPI paths', async () => {
    await translationService.translate('Hello', 'English', 'Spanish')
    await translationService.getSpeakAudio('Hola', 'Spanish')
    expect(called()).toEqual([
      { method: 'post', url: '/v1/translate' },
      { method: 'post', url: '/v1/speak' },
    ])
    called().forEach(checkContract)
  })

  it('no source file but the client makes HTTP calls', () => {
    const sources = import.meta.glob('/src/**/*.{js,jsx}', { query: '?raw', import: 'default', eager: true })
    const offenders = Object.entries(sources)
      .filter(([path]) => path !== '/src/services/api.js' && !/\.test\.jsx?$/.test(path))
      .filter(([, code]) => /from ['"]axios['"]|\bfetch\(|XMLHttpRequest/.test(code))
      .map(([path]) => path)
    expect(offenders).toEqual([])
  })
})

describe('the /v1 client', () => {
  it('sends the v1 translate body without a provider', async () => {
    await api.translateText({ text: 'Hello', fromLang: 'Auto-detect', toLang: 'Spanish' })
    expect(JSON.parse(calls[0].data)).toEqual({ text: 'Hello', from_lang: 'Auto-detect', to_lang: 'Spanish' })
  })

  it('passes a glossary and style guide through', async () => {
    const glossary = [{ source_term: 'Dashboard', target_term: 'Panel' }]
    const styleGuide = { tone: 'friendly' }
    await api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish', glossary, styleGuide })
    expect(JSON.parse(calls[0].data)).toMatchObject({ glossary, style_guide: styleGuide })
  })

  it('returns the v1 response body', async () => {
    const body = { translation: 'Hola', model: 'gpt-4o-mini', usage: { total_tokens: 3 } }
    http.defaults.adapter = respondWith(200, body)
    await expect(api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })).resolves.toEqual(body)
  })

  it('uses the default timeout for a short text', async () => {
    await api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })
    expect(calls[0].timeout).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('uses the long timeout for a whole document', async () => {
    await api.translateText({ text: 'a'.repeat(WHOLE_DOCUMENT_CHARS + 1), fromLang: 'English', toLang: 'Spanish' })
    expect(calls[0].timeout).toBe(LONG_TIMEOUT_MS)
    expect(LONG_TIMEOUT_MS).toBeGreaterThan(DEFAULT_TIMEOUT_MS)
  })

  it('uses the long timeout and sends review=on for a review call', async () => {
    await api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish', review: true })
    expect(calls[0].timeout).toBe(LONG_TIMEOUT_MS)
    expect(JSON.parse(calls[0].data).review).toBe('on')
  })

  it('uploads a file as multipart form data with the long timeout', async () => {
    const file = new File(['{"a": "Hi"}'], 'a.json')
    await api.translateFile({ file, fromLang: 'English', toLang: 'Spanish' })
    expect(calls[0].timeout).toBe(LONG_TIMEOUT_MS)
    expect(calls[0].data).toBeInstanceOf(FormData)
    expect(calls[0].data.get('file').name).toBe('a.json')
    expect(calls[0].data.get('from_lang')).toBe('English')
    expect(calls[0].data.get('to_lang')).toBe('Spanish')
  })

  it('sends review=on with a file only when asked', async () => {
    const file = new File(['{"a": "Hi"}'], 'a.json')
    await api.translateFile({ file, fromLang: 'English', toLang: 'Spanish' })
    await api.translateFile({ file, fromLang: 'English', toLang: 'Spanish', review: true })
    expect(calls[0].data.has('review')).toBe(false)
    expect(calls[1].data.get('review')).toBe('on')
  })

  it('sends no review field for a text unless asked', async () => {
    await api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })
    expect(JSON.parse(calls[0].data)).not.toHaveProperty('review')
  })

  it('the translation service passes review on and does not answer a review from a plain cached result', async () => {
    await translationService.translate('Hello', 'English', 'Spanish')
    await translationService.translate('Hello', 'English', 'Spanish', { review: true })
    expect(calls).toHaveLength(2)
    expect(JSON.parse(calls[1].data).review).toBe('on')
  })

  it('asks for speech as a blob', async () => {
    await api.speak({ text: 'Hola', lang: 'Spanish' })
    expect(calls[0].responseType).toBe('blob')
    expect(JSON.parse(calls[0].data)).toEqual({ text: 'Hola', lang: 'Spanish', response_format: 'mp3' })
  })

  it.each([500, 502])('does not retry a POST that failed with %i', async (status) => {
    http.defaults.adapter = respondWith(status, { error: { type: 'api_error', message: 'Upstream failed' } })
    await expect(api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })).rejects.toThrow(
      'Upstream failed',
    )
    expect(calls).toHaveLength(1)
  })

  it('checks health with GET / and a short timeout', async () => {
    http.defaults.adapter = respondWith(200, { message: 'llm-translate is running' })
    await expect(api.health()).resolves.toEqual({ message: 'llm-translate is running' })
    expect(calls[0].method).toBe('get')
    expect(calls[0].url).toBe('/')
    expect(calls[0].timeout).toBe(HEALTH_TIMEOUT_MS)
    expect(HEALTH_TIMEOUT_MS).toBeLessThan(DEFAULT_TIMEOUT_MS)
  })

  it('does not retry a POST that failed on the network', async () => {
    http.defaults.adapter = async (config) => {
      calls.push(config)
      const error = new Error('Network Error')
      error.config = config
      throw error
    }
    await expect(api.speak({ text: 'Hola', lang: 'Spanish' })).rejects.toThrow('Could not reach the translation service')
    expect(calls).toHaveLength(1)
  })

  it('reports a v1 error message and status', async () => {
    http.defaults.adapter = respondWith(413, { error: { type: 'invalid_request_error', message: 'File too large' } })
    const error = await api.translateFile({ file: new File(['x'], 'a.json'), fromLang: 'English', toLang: 'Spanish' })
      .catch((e) => e)
    expect(error.message).toBe('File too large')
    expect(error.status).toBe(413)
  })
})
