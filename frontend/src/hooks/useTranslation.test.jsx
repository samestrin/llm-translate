import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SettingsProvider } from '../contexts/SettingsContext'
import { http } from '../services/api'
import translationService from '../services/translationService'
import useTranslation from './useTranslation.jsx'

const MISSES = [{ term: 'Dashboard', expected: 'Panel' }]
const response = {
  translation: 'Hola',
  from_lang: 'English',
  to_lang: 'Spanish',
  model: 'gpt-4o-mini',
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  cached: false,
}
let misses
let originalAdapter

beforeEach(() => {
  localStorage.clear()
  misses = MISSES
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => ({
    data: { ...response, glossary_misses: misses },
    status: 200,
    statusText: 'OK',
    headers: {},
    config,
  })
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
})

const renderTranslation = async () => {
  const hook = renderHook(() => useTranslation(), { wrapper: SettingsProvider })
  act(() => {
    hook.result.current.setSourceLang('English')
    hook.result.current.setTargetLang('Spanish')
    hook.result.current.setSourceText('Open the Dashboard')
  })
  await act(() => hook.result.current.translate())
  await waitFor(() => expect(hook.result.current.glossaryMisses).toEqual(MISSES))
  return hook
}

describe('useTranslation glossary misses', () => {
  it('clears them when a new translation starts', async () => {
    const { result } = await renderTranslation()
    let reply
    http.defaults.adapter = (config) => new Promise((resolve) => {
      reply = () => resolve({
        data: { ...response, glossary_misses: MISSES }, status: 200, statusText: 'OK', headers: {}, config,
      })
    })
    act(() => result.current.setSourceText('Open the Settings'))
    let pending
    act(() => { pending = result.current.translate() })
    await waitFor(() => expect(reply).toBeDefined())
    // Still in flight: the old misses must be gone before the reply arrives.
    expect(result.current.glossaryMisses).toEqual([])
    await act(async () => { reply(); await pending })
    expect(result.current.glossaryMisses).toEqual(MISSES)
  })

  it('clears them when a history item is loaded', async () => {
    const { result } = await renderTranslation()
    act(() => result.current.loadFromHistory({
      sourceText: 'Hello', translatedText: 'Hola', sourceLang: 'English', targetLang: 'Spanish', model: 'm',
    }))
    expect(result.current.glossaryMisses).toEqual([])
  })

  it('clears them when the languages are swapped', async () => {
    const { result } = await renderTranslation()
    act(() => result.current.swapLanguages())
    expect(result.current.sourceLang).toBe('Spanish')
    expect(result.current.glossaryMisses).toEqual([])
  })

  it('clears them when the translation is cleared', async () => {
    const { result } = await renderTranslation()
    act(() => result.current.clearTranslation())
    expect(result.current.glossaryMisses).toEqual([])
    expect(result.current.translatedText).toBe('')
  })
})

// The owner's repro (epic 07.1, 2026-11-11): translate into Hebrew, Speak, translate the
// same sentence into French, Speak -- the Hebrew audio played again. Speak must always
// fetch and play audio for the translation currently on screen.
describe('useTranslation speak', () => {
  const TRANSLATIONS = { Hebrew: 'שלום', French: 'Bonjour' }
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL
  let players
  let created
  let revoked
  let calls
  let speakGate
  let failNextSpeak

  const speakCalls = () => calls.filter((c) => c.url === '/v1/speak')

  beforeEach(() => {
    players = []
    // jsdom's Audio cannot load or play. This one records src and play/pause and fires
    // the events the hook listens for, synchronously, so tests stay deterministic.
    class FakeAudio extends EventTarget {
      constructor() {
        super()
        this._src = ''
        this.paused = true
        this.readyState = 0
        this.plays = 0
        players.push(this)
      }
      get src() { return this._src }
      set src(value) {
        this._src = value
        if (value) {
          this.readyState = 4
          this.dispatchEvent(new Event('canplay'))
        }
      }
      play() {
        this.plays += 1
        this.paused = false
        this.dispatchEvent(new Event('playing'))
        return Promise.resolve()
      }
      pause() {
        this.paused = true
        this.dispatchEvent(new Event('pause'))
      }
    }
    vi.stubGlobal('Audio', FakeAudio)

    // jsdom has no object URLs; hand out numbered ones and record every revoke.
    created = []
    revoked = []
    URL.createObjectURL = vi.fn((blob) => {
      const url = `blob:mock/${created.length + 1}`
      created.push({ url, blob })
      return url
    })
    URL.revokeObjectURL = vi.fn((url) => { revoked.push(url) })

    calls = []
    speakGate = null
    failNextSpeak = false
    http.defaults.adapter = async (config) => {
      const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
      calls.push({ url: config.url, data })
      if (config.url === '/v1/speak') {
        if (speakGate) await speakGate
        if (failNextSpeak) {
          failNextSpeak = false
          throw Object.assign(new Error('Request failed with status code 500'), {
            response: { status: 500, statusText: '', data: { error: { message: 'tts down' } } }, config,
          })
        }
        return { data: new Blob([`audio for ${data.text}`], { type: 'audio/mpeg' }), status: 200, statusText: 'OK', headers: {}, config }
      }
      return {
        data: { ...response, translation: TRANSLATIONS[data.to_lang] ?? data.text, glossary_misses: [] },
        status: 200, statusText: 'OK', headers: {}, config,
      }
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // jsdom may not define these at all; put back exactly what was there.
    if (originalCreateObjectURL) URL.createObjectURL = originalCreateObjectURL
    else delete URL.createObjectURL
    if (originalRevokeObjectURL) URL.revokeObjectURL = originalRevokeObjectURL
    else delete URL.revokeObjectURL
  })

  const renderSpeaking = async (targetLang) => {
    const hook = renderHook(() => useTranslation(), { wrapper: SettingsProvider })
    act(() => {
      hook.result.current.setSourceText('Hello')
      hook.result.current.setTargetLang(targetLang)
    })
    await act(() => hook.result.current.translate())
    return hook
  }

  it('speaks the current translation: re-translating then speaking fetches audio for the new text', async () => {
    const { result } = await renderSpeaking('Hebrew')
    expect(result.current.translatedText).toBe('שלום')

    await act(() => result.current.handleSpeak())
    expect(speakCalls()).toHaveLength(1)
    expect(speakCalls()[0].data).toMatchObject({ text: 'שלום', lang: 'Hebrew' })
    const player = players[0]
    const firstUrl = result.current.audioUrl
    expect(firstUrl).toBe(created[0].url)
    expect(player.src).toBe(firstUrl)

    // Same sentence, new language: the Hebrew audio must not survive this.
    act(() => result.current.setTargetLang('French'))
    await act(() => result.current.translate())
    expect(result.current.translatedText).toBe('Bonjour')

    await act(() => result.current.handleSpeak())
    expect(speakCalls()).toHaveLength(2)
    expect(speakCalls()[1].data).toMatchObject({ text: 'Bonjour', lang: 'French' })
    expect(result.current.audioUrl).toBe(created[1].url)
    expect(result.current.audioUrl).not.toBe(firstUrl)
    expect(player.src).toBe(result.current.audioUrl)
  })

  it('drops the old audio when the translation changes: URL revoked, blob cleared, playback stopped', async () => {
    const { result } = await renderSpeaking('Hebrew')
    await act(() => result.current.handleSpeak())
    const firstUrl = result.current.audioUrl
    expect(result.current.isAudioPlaying).toBe(true)

    act(() => result.current.setTargetLang('French'))
    await act(() => result.current.translate())

    expect(revoked).toContain(firstUrl)
    expect(result.current.audioUrl).toBeNull()
    expect(result.current.audioBlob).toBeNull()
    expect(result.current.isAudioPlaying).toBe(false)
    expect(players[0].paused).toBe(true)
  })

  it('keeps a speak error until the next translation, then clears it', async () => {
    const { result } = await renderSpeaking('Hebrew')
    failNextSpeak = true
    await act(() => result.current.handleSpeak())
    expect(result.current.speakError).toBe('Failed to generate audio')

    act(() => result.current.setTargetLang('French'))
    await act(() => result.current.translate())
    expect(result.current.speakError).toBeNull()
  })

  it('keeps the cached audio while the translation is unchanged', async () => {
    const { result } = await renderSpeaking('Hebrew')
    await act(() => result.current.handleSpeak())
    expect(result.current.isAudioPlaying).toBe(true)
    const firstUrl = result.current.audioUrl

    // Second press pauses, third resumes from cache: no new request, same URL.
    await act(() => result.current.handleSpeak())
    expect(result.current.isAudioPlaying).toBe(false)
    await act(() => result.current.handleSpeak())
    expect(speakCalls()).toHaveLength(1)
    expect(result.current.audioUrl).toBe(firstUrl)
    expect(players[0].plays).toBe(2)
    expect(revoked).not.toContain(firstUrl)
  })

  it('discards audio that arrives for a translation already replaced', async () => {
    const { result } = await renderSpeaking('Hebrew')
    let openGate
    speakGate = new Promise((resolve) => { openGate = resolve })
    let pending
    act(() => { pending = result.current.handleSpeak() })
    await waitFor(() => expect(speakCalls()).toHaveLength(1))
    expect(speakCalls()[0].data.text).toBe('שלום')

    // The French translation lands while the Hebrew audio is still being generated.
    act(() => result.current.setTargetLang('French'))
    await act(() => result.current.translate())
    await act(async () => { openGate(); speakGate = null; await pending })

    expect(result.current.audioUrl).toBeNull()
    expect(result.current.audioBlob).toBeNull()
    expect(players[0].src).toBe('')
    expect(result.current.isSpeakingLoading).toBe(false)

    await act(() => result.current.handleSpeak())
    expect(speakCalls()).toHaveLength(2)
    expect(speakCalls()[1].data.text).toBe('Bonjour')
    expect(players[0].src).toBe(result.current.audioUrl)
  })
})
