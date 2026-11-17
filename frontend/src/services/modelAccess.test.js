import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  DEFAULT_PRESET,
  loadAccess,
  saveAccess,
  clearAccess,
  accessHeaders,
  hasCredential,
  setPresetsInfo,
  getPresetsInfo,
  isPublicDemo,
  assertModelCredential,
  MISSING_CREDENTIAL_MESSAGE,
} from './modelAccess'

// The visitor's key lives in the browser only: session storage by default, local storage
// only with "remember on this device" (epic 08 shared design). Clear wipes both.

const PRESETS_BODY = {
  public_demo: true,
  presets: [
    { id: 'openai', label: 'OpenAI', speech: true },
    { id: 'openrouter', label: 'OpenRouter', speech: false },
    { id: 'demo', label: 'Demo code', speech: false },
  ],
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  setPresetsInfo(null) // back to env-key mode
})

describe('the credential store', () => {
  it('starts empty with the demo preset and no remember', () => {
    expect(loadAccess()).toEqual({ preset: DEFAULT_PRESET, key: '', remember: false })
    expect(hasCredential()).toBe(false)
    expect(accessHeaders()).toEqual({})
  })

  it('keeps the key in session storage only, by default', () => {
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: false })
    expect(sessionStorage.getItem('modelAccessKey')).toBe('sk-fake')
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
    expect(loadAccess()).toEqual({ preset: 'openai', key: 'sk-fake', remember: false })
    expect(hasCredential()).toBe(true)
  })

  it('keeps the key in local storage only when remembered', () => {
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    expect(localStorage.getItem('modelAccessKey')).toBe('sk-fake')
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(loadAccess()).toEqual({ preset: 'openai', key: 'sk-fake', remember: true })
  })

  it('moves the key between storages when remember is toggled', () => {
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: false })
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
    expect(sessionStorage.getItem('modelAccessKey')).toBe('sk-fake')
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(localStorage.getItem('modelAccessKey')).toBe('sk-fake')
  })

  it('an empty key removes it from both storages', () => {
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    saveAccess({ preset: 'openai', key: '', remember: true })
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(hasCredential()).toBe(false)
  })

  it('clear wipes the key, the preset and remember from both storages', () => {
    saveAccess({ preset: 'openrouter', key: 'sk-fake', remember: true })
    clearAccess()
    expect(localStorage.getItem('modelAccessKey')).toBeNull()
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(localStorage.getItem('modelAccess')).toBeNull()
    expect(loadAccess()).toEqual({ preset: DEFAULT_PRESET, key: '', remember: false })
    expect(accessHeaders()).toEqual({})
  })

  it('clear also wipes a session-stored key', () => {
    saveAccess({ preset: 'demo', key: 'demo-code', remember: false })
    clearAccess()
    expect(sessionStorage.getItem('modelAccessKey')).toBeNull()
    expect(hasCredential()).toBe(false)
  })

  it('survives corrupt stored preferences', () => {
    localStorage.setItem('modelAccess', '{not json')
    expect(loadAccess()).toEqual({ preset: DEFAULT_PRESET, key: '', remember: false })
  })

  it('trims a pasted key so surrounding whitespace never reaches a header', () => {
    saveAccess({ preset: 'openai', key: '  sk-fake\n', remember: false })
    expect(loadAccess().key).toBe('sk-fake')
    expect(accessHeaders()['X-Model-Key']).toBe('sk-fake')
    saveAccess({ preset: 'openai', key: '   ', remember: false })
    expect(hasCredential()).toBe(false)
  })
})

describe('when the browser blocks storage', () => {
  // Safari "Block All Cookies" or disabled storage: every Storage method throws. The
  // entered credential must still gate and reach the headers for this visit, instead of
  // a dead end where the panel shows the key but every call asks for one.
  const originals = {}
  beforeEach(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      originals[method] = Storage.prototype[method]
      Storage.prototype[method] = () => {
        throw new Error('storage blocked')
      }
    }
  })
  afterEach(() => {
    for (const method of Object.keys(originals)) Storage.prototype[method] = originals[method]
    clearAccess() // reset the in-memory fallback so other tests start clean
  })

  it('the entered key still gates and reaches the headers', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: '  sk-fake\n', remember: false })
    expect(loadAccess()).toEqual({ preset: 'openai', key: 'sk-fake', remember: false })
    expect(hasCredential()).toBe(true)
    expect(accessHeaders()).toEqual({ 'X-Model-Preset': 'openai', 'X-Model-Key': 'sk-fake' })
    expect(() => assertModelCredential()).not.toThrow()
  })

  it('a demo code still reaches X-Demo-Code', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'demo', key: 'demo-code', remember: false })
    expect(accessHeaders()).toEqual({ 'X-Demo-Code': 'demo-code' })
    expect(() => assertModelCredential()).not.toThrow()
  })

  it('remember on this device keeps the same visit behavior', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    expect(loadAccess()).toEqual({ preset: 'openai', key: 'sk-fake', remember: true })
    expect(accessHeaders()).toEqual({ 'X-Model-Preset': 'openai', 'X-Model-Key': 'sk-fake' })
    expect(() => assertModelCredential()).not.toThrow()
  })

  it('clear wipes the in-memory key too', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    clearAccess()
    expect(hasCredential()).toBe(false)
    expect(accessHeaders()).toEqual({})
    expect(() => assertModelCredential()).toThrow(MISSING_CREDENTIAL_MESSAGE)
  })

  it('an empty key removes the credential', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: false })
    saveAccess({ preset: 'openai', key: '', remember: false })
    expect(hasCredential()).toBe(false)
    expect(() => assertModelCredential()).toThrow(MISSING_CREDENTIAL_MESSAGE)
  })
})

describe('the request headers', () => {
  it('a preset key goes in X-Model-Preset and X-Model-Key', () => {
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: false })
    expect(accessHeaders()).toEqual({ 'X-Model-Preset': 'openai', 'X-Model-Key': 'sk-fake' })
  })

  it('a demo code goes in X-Demo-Code, never in X-Model-Key', () => {
    saveAccess({ preset: 'demo', key: 'demo-code', remember: false })
    expect(accessHeaders()).toEqual({ 'X-Demo-Code': 'demo-code' })
  })

  it('no key means no credential headers', () => {
    saveAccess({ preset: 'openai', key: '', remember: false })
    expect(accessHeaders()).toEqual({})
  })
})

describe('the public-demo mode', () => {
  it('is off until the server says otherwise', () => {
    expect(isPublicDemo()).toBe(false)
    expect(getPresetsInfo()).toEqual({ publicDemo: false, presets: [] })
  })

  it('is on only for a well-formed public_demo response', () => {
    setPresetsInfo(PRESETS_BODY)
    expect(isPublicDemo()).toBe(true)
    expect(getPresetsInfo().presets).toEqual(PRESETS_BODY.presets)
    for (const body of [null, undefined, {}, { public_demo: false, presets: [] }, { public_demo: true }, { public_demo: 'yes', presets: [] }]) {
      setPresetsInfo(body)
      expect(isPublicDemo()).toBe(false)
    }
  })
})

describe('the model-call gate', () => {
  it('lets a call without credentials through in env-key mode', () => {
    expect(() => assertModelCredential()).not.toThrow()
  })

  it('refuses a call without a key or code in the public demo, asking for one', () => {
    setPresetsInfo(PRESETS_BODY)
    let error
    try {
      assertModelCredential()
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(Error)
    expect(error.type).toBe('missing_credentials')
    expect(error.message).toBe(MISSING_CREDENTIAL_MESSAGE)
    expect(error.message).toMatch(/demo code or your own API key/)
  })

  it('lets a call with a preset key through', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: false })
    expect(() => assertModelCredential()).not.toThrow()
  })

  it('lets a call with a demo code through', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'demo', key: 'demo-code', remember: false })
    expect(() => assertModelCredential()).not.toThrow()
  })

  it('refuses again after clear', () => {
    setPresetsInfo(PRESETS_BODY)
    saveAccess({ preset: 'openai', key: 'sk-fake', remember: true })
    clearAccess()
    expect(() => assertModelCredential()).toThrow(MISSING_CREDENTIAL_MESSAGE)
  })
})
