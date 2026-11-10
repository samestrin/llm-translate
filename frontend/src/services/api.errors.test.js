import { describe, it, expect, afterEach } from 'vitest'
import api, { http, describeError } from './api'

const original = http.defaults.adapter
afterEach(() => {
  http.defaults.adapter = original
})

const failWith = (status, data) => {
  http.defaults.adapter = async (config) => {
    const err = new Error(`Request failed with status code ${status}`)
    err.response = { status, statusText: 'Error', data, config }
    throw err
  }
}

describe('error messages', () => {
  it('reads the JSON error of a /v1/speak Blob body', async () => {
    failWith(502, new Blob([JSON.stringify({ error: { message: 'The speech model is unavailable' } })]))
    await expect(api.speak({ text: 'Hola', lang: 'Spanish' })).rejects.toMatchObject({
      message: 'The speech model is unavailable',
      status: 502,
    })
  })

  it('reads the `detail` of a 422 Blob body', async () => {
    failWith(422, new Blob([JSON.stringify({ detail: [{ msg: 'Field required' }, { msg: 'Input should be a string' }] })]))
    await expect(api.speak({ text: 'Hola', lang: 'Spanish' })).rejects.toThrow('Field required; Input should be a string')
  })

  // The page shows this message; axios's own "Request failed with status code 500" is never shown.
  it('gives a readable message, not a raw status, for a Blob that is not JSON', async () => {
    failWith(500, new Blob(['oops']))
    const error = await api.speak({ text: 'Hola', lang: 'Spanish' }).catch((e) => e)
    expect(error.message).toBe('The translation service had a problem and sent no details. Try again.')
    expect(error.status).toBe(500)
  })

  it.each([
    [502, '<html>Bad Gateway</html>'],
    [404, undefined],
    [500, { detail: 'Internal Server Error' }],
  ])('never shows a raw status for a %i without a /v1 error body', async (status, data) => {
    failWith(status, data)
    const error = await api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' }).catch((e) => e)
    expect(error.message).not.toMatch(/status code|\b\d{3}\b/)
  })

  it('says the service could not be reached when there is no response', async () => {
    http.defaults.adapter = async () => {
      throw Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })
    }
    await expect(api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })).rejects.toThrow(
      'Could not reach the translation service. Check that the backend is running, then try again.',
    )
  })

  it('says the service took too long on a timeout', async () => {
    http.defaults.adapter = async () => {
      throw Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' })
    }
    await expect(api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })).rejects.toThrow(
      'The translation service took too long to answer. Try again.',
    )
  })

  it('keeps the error type of a /v1 error', async () => {
    failWith(401, { error: { type: 'authentication_error', message: 'No model API key is set' } })
    await expect(api.translateText({ text: 'Hi', fromLang: 'English', toLang: 'Spanish' })).rejects.toMatchObject({
      type: 'authentication_error',
    })
  })
})

const NO_KEY = 'No model API key is set, and the model endpoint requires one. Set LLM_API_KEY and restart the backend.'

describe('describeError', () => {
  it('names a missing model key when the backend says so', () => {
    const error = Object.assign(new Error(NO_KEY), { type: 'authentication_error' })
    expect(describeError(error)).toEqual({ title: 'No model key set', message: NO_KEY, segmentErrors: [] })
  })

  it('does not call a wrong key a missing one', () => {
    const error = Object.assign(new Error('Authentication failed with the model endpoint. Please check your API key.'), {
      type: 'authentication_error',
    })
    expect(describeError(error).title).toBe('Translation failed')
  })

  it('lists the segment errors of a file', () => {
    const segments = [{ segment: 1, type: 'api_error', message: 'Segment /a failed' }]
    const error = Object.assign(new Error('1 of 2 segments failed'), { data: { error: { segment_errors: segments } } })
    expect(describeError(error)).toEqual({ title: 'Translation failed', message: '1 of 2 segments failed', segmentErrors: segments })
  })

  it('has a message for an error without one', () => {
    expect(describeError(new Error('')).message).toBe('Something went wrong. Try again.')
  })
})

