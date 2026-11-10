import { describe, it, expect, beforeEach, afterEach } from 'vitest'
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
