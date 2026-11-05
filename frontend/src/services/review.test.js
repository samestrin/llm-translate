import { describe, it, expect } from 'vitest'
import { flagSeverity, splitDocument, textSegments, jsonSegments } from './review'

describe('flagSeverity', () => {
  it.each([
    ['still wrong after revision: major meaning error: "open" loses the imperative', 'major'],
    ['still wrong after revision: major fluency error: stiff; critical meaning error: negation dropped', 'critical'],
    ['revision came back empty: critical format error: the markup is gone', 'critical'],
    ['still wrong after revision: minor style error: a little formal', 'minor'],
  ])('%s is %s', (reason, severity) => {
    expect(flagSeverity(reason)).toBe(severity)
  })

  it.each([
    'review could not be read',
    'revision lost or changed a placeholder; the earlier translation is kept',
  ])('a pipeline message has no severity: %s', (reason) => {
    expect(flagSeverity(reason)).toBeNull()
  })

  it('counts a severity word only in the "<severity> <category> error" form', () => {
    expect(flagSeverity('still wrong after revision: major meaning error: the critical warning is softened')).toBe('major')
  })
})

describe('splitDocument (mirrors the backend split at LLM_SEGMENT_MAX_CHARS)', () => {
  it('keeps a text within the limit as one segment, without surrounding whitespace', () => {
    expect(splitDocument('  Hello.\n\nWorld.  \n', 4000)).toEqual(['Hello.\n\nWorld.'])
  })

  it('packs paragraphs into a segment while it stays within the limit', () => {
    expect(splitDocument('aaaa\n\nbbbb\n\ncccc', 10)).toEqual(['aaaa\n\nbbbb', 'cccc'])
  })

  it('treats a blank line holding spaces as a paragraph break', () => {
    expect(splitDocument('aaaa\n  \nbbbbbbbb', 10)).toEqual(['aaaa', 'bbbbbbbb'])
  })

  it('splits a paragraph longer than the limit at its lines and never packs it with another', () => {
    expect(splitDocument('aa\n\nbbbb\ncccc\ndddd\n\nee', 10)).toEqual(['aa', 'bbbb\ncccc', 'dddd', 'ee'])
  })
})

describe('textSegments', () => {
  it('gives the one segment of a short text its source and translation', () => {
    expect(textSegments('Open the dashboard.', 'Abra el tablero.')).toEqual({
      1: { source: 'Open the dashboard.', translation: 'Abra el tablero.' },
    })
  })

  it('gives each segment of a long text its source only', () => {
    const first = 'a'.repeat(3000)
    const second = 'b'.repeat(3000)
    expect(textSegments(`${first}\n\n${second}`, 'whatever')).toEqual({
      1: { source: first, translation: null },
      2: { source: second, translation: null },
    })
  })
})

describe('jsonSegments', () => {
  it('maps every JSON Pointer to its source and translated string', () => {
    const source = JSON.stringify({ greeting: 'Hello', menu: { items: ['Open', 'Close'] }, 'a/b~c': 'Slash' })
    const translated = JSON.stringify({ greeting: 'Hola', menu: { items: ['Abrir', 'Cerrar'] }, 'a/b~c': 'Barra' })
    expect(jsonSegments(source, translated)).toEqual({
      '/greeting': { source: 'Hello', translation: 'Hola' },
      '/menu/items/0': { source: 'Open', translation: 'Abrir' },
      '/menu/items/1': { source: 'Close', translation: 'Cerrar' },
      '/a~1b~0c': { source: 'Slash', translation: 'Barra' },
    })
  })

  it('gives nothing for a file that is not JSON', () => {
    expect(jsonSegments('greeting: Hello', 'greeting: Hola')).toEqual({})
  })
})
