import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  EMPTY_OPTIONS,
  loadOptions,
  saveOptions,
  toRequestGlossary,
  toRequestStyleGuide,
} from './translationOptions'

beforeEach(() => localStorage.clear())

describe('loadOptions and saveOptions', () => {
  it('returns empty options when nothing is saved', () => {
    expect(loadOptions()).toEqual(EMPTY_OPTIONS)
  })

  it('reads back what was saved', () => {
    const options = {
      glossary: [{ sourceTerm: 'Dashboard', targetTerm: 'Panel', note: '', doNotTranslate: false }],
      styleGuide: { tone: 'friendly', formality: '', audience: '', notes: '' },
    }
    saveOptions(options)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY))).toEqual(options)
    expect(loadOptions()).toEqual(options)
  })

  it.each([
    ['not JSON', '{oops'],
    ['not an object', '"text"'],
    ['null', 'null'],
  ])('returns empty options when the saved value is %s', (_, raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    expect(loadOptions()).toEqual(EMPTY_OPTIONS)
  })

  it('keeps only well-formed rows and string style fields', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      glossary: [null, 'x', { sourceTerm: 'A', targetTerm: 7, doNotTranslate: 'yes' }],
      styleGuide: { tone: 3, notes: 'Short.' },
    }))
    expect(loadOptions()).toEqual({
      glossary: [{ sourceTerm: 'A', targetTerm: '', note: '', doNotTranslate: false }],
      styleGuide: { tone: '', formality: '', audience: '', notes: 'Short.' },
    })
  })
})

describe('toRequestGlossary', () => {
  it('maps rows to the API entries, trimmed, with blank fields left out', () => {
    expect(toRequestGlossary([
      { sourceTerm: ' Dashboard ', targetTerm: ' Panel ', note: ' home screen ', doNotTranslate: false },
      { sourceTerm: 'LLM Translate', targetTerm: 'ignored', note: '', doNotTranslate: true },
    ])).toEqual([
      { source_term: 'Dashboard', target_term: 'Panel', note: 'home screen' },
      { source_term: 'LLM Translate', do_not_translate: true },
    ])
  })

  it('drops rows the API would reject: no source term, or no translation and not kept as is', () => {
    expect(toRequestGlossary([
      { sourceTerm: '  ', targetTerm: 'Panel', note: '', doNotTranslate: false },
      { sourceTerm: 'Dashboard', targetTerm: ' ', note: '', doNotTranslate: false },
    ])).toEqual([])
  })
})

describe('toRequestStyleGuide', () => {
  it('sends only the fields with text', () => {
    expect(toRequestStyleGuide({ tone: ' friendly ', formality: '', audience: ' ', notes: 'Use tú.' }))
      .toEqual({ tone: 'friendly', notes: 'Use tú.' })
  })

  it('is undefined when no field has text', () => {
    expect(toRequestStyleGuide({ tone: '', formality: ' ', audience: '', notes: '' })).toBeUndefined()
  })
})
