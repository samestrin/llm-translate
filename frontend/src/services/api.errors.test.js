import { describe, it, expect, afterEach } from 'vitest'
import api, { http } from './api'

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

  it('keeps the generic message for a Blob that is not JSON', async () => {
    failWith(500, new Blob(['oops']))
    await expect(api.speak({ text: 'Hola', lang: 'Spanish' })).rejects.toThrow('Request failed with status code 500')
  })
})
