import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SettingsProvider } from '../contexts/SettingsContext'
import { http } from '../services/api'
import translationService from '../services/translationService'
import Home from './Home'

const V1_RESPONSE = {
  translation: '¡Hola, mundo!',
  from_lang: 'English',
  to_lang: 'Spanish',
  model: 'gpt-4o-mini',
  usage: { prompt_tokens: 42, completion_tokens: 6, total_tokens: 48 },
  glossary_misses: [],
  cached: false,
}

const FILE_RESPONSE = {
  content: '{"a": "Hola"}',
  format: 'json',
  from_lang: 'English',
  to_lang: 'English',
  report: { segments: 1, model: 'gpt-4o-mini', usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } },
}

const REVIEW = {
  flags: [{ segment: 1, reason: 'major style error: too casual', severity: 'major', source: 'Hello', translation: 'Hola' }],
  steps: [{ step: 'translation', model: 'gpt-4o-mini', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }],
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
}

const NO_KEY = 'No model API key is set, and the model endpoint requires one. Set LLM_API_KEY and restart the backend.'

// A failed request the way axios hands it to the response interceptor.
const failure = (status, data) =>
  Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, statusText: '', data } })

const deferred = () => {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

let calls
let routes
let originalAdapter

beforeEach(() => {
  localStorage.clear()
  calls = []
  routes = {
    'get /': () => ({ message: 'llm-translate is running' }),
    'post /v1/translate': () => V1_RESPONSE,
    'post /v1/translate/file': () => FILE_RESPONSE,
  }
  originalAdapter = http.defaults.adapter
  http.defaults.adapter = async (config) => {
    const data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
    calls.push({ method: config.method, url: config.url, data })
    const body = await routes[`${config.method} ${config.url}`](config)
    return { data: body, status: 200, statusText: 'OK', headers: {}, config }
  }
})

afterEach(() => {
  http.defaults.adapter = originalAdapter
  translationService.clearCache()
  vi.restoreAllMocks()
})

const posts = () => calls.filter((c) => c.method === 'post')

const renderHome = () =>
  render(
    <SettingsProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </SettingsProvider>,
  )

const typeText = (text) =>
  fireEvent.change(screen.getByPlaceholderText('Enter text to translate...'), { target: { value: text } })

const clickTranslate = () => fireEvent.click(screen.getByRole('button', { name: 'Click to translate' }))

// Status text must sit in a polite live region so a screen reader reads it out.
const expectAnnounced = async (text) => {
  const node = await screen.findByText(text)
  expect(node.closest('[aria-live="polite"]')).not.toBeNull()
}

const toFileMode = () => fireEvent.click(screen.getByRole('tab', { name: 'File' }))

const chooseFile = (name = 'a.json') =>
  fireEvent.change(screen.getByLabelText('Choose a file'), {
    target: { files: [new File(['{"a": "Hello"}'], name, { type: 'application/json' })] },
  })

// jsdom has no object URLs; record what the download made and revoked.
const mockDownload = () => {
  const created = []
  URL.createObjectURL = vi.fn((blob) => {
    created.push(blob)
    return `blob:mock/${created.length}`
  })
  URL.revokeObjectURL = vi.fn()
  const clicked = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    clicked.push({ href: this.href, download: this.download })
  })
  return { created, clicked }
}

describe('Home', () => {
  it('translates on /v1 and stores the translation in history', async () => {
    localStorage.setItem('settings', JSON.stringify({ aiProvider: 'groq', historyEnabled: true, maxHistoryItems: 50 }))
    renderHome()

    typeText('Hello, world!')
    clickTranslate()

    expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
    expect(screen.getByText('Translated with gpt-4o-mini')).toBeInTheDocument()

    const history = JSON.parse(localStorage.getItem('translationHistory'))
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({
      sourceText: 'Hello, world!',
      translatedText: '¡Hola, mundo!',
      targetLang: 'Spanish',
      model: 'gpt-4o-mini',
    })

    // No provider in the body.
    expect(posts()).toEqual([
      { method: 'post', url: '/v1/translate', data: { text: 'Hello, world!', from_lang: 'Auto-detect', to_lang: 'Spanish' } },
    ])
  })

  it.each([
    ['a /v1 item', { model: 'gpt-4o-mini' }],
    ['an item saved before /v1', { service_used: 'openai', model_used: 'gpt-4o-mini' }],
  ])('shows the model of %s opened from history', async (_, fields) => {
    sessionStorage.setItem('selectedHistoryItem', JSON.stringify({
      sourceText: 'Hello', translatedText: 'Hola', sourceLang: 'English', targetLang: 'Spanish', ...fields,
    }))
    renderHome()

    expect(await screen.findByDisplayValue('Hola')).toBeInTheDocument()
    expect(screen.getByText('Translated with gpt-4o-mini')).toBeInTheDocument()
    expect(posts()).toEqual([])
  })

  it('sends the saved glossary and style guide and lists the glossary misses', async () => {
    localStorage.setItem('translationOptions', JSON.stringify({
      glossary: [{ sourceTerm: 'Dashboard', targetTerm: 'Panel', note: '', doNotTranslate: false }],
      styleGuide: { tone: 'friendly', formality: '', audience: '', notes: '' },
    }))
    routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, glossary_misses: [{ term: 'Dashboard', expected: 'Panel' }] })
    renderHome()

    typeText('Open the Dashboard')
    clickTranslate()

    const misses = await screen.findByRole('list', { name: 'Glossary terms missing from the translation' })
    expect(misses).toHaveTextContent('Dashboard')
    expect(misses).toHaveTextContent('Panel')
    expect(posts()[0].data).toEqual({
      text: 'Open the Dashboard',
      from_lang: 'Auto-detect',
      to_lang: 'Spanish',
      glossary: [{ source_term: 'Dashboard', target_term: 'Panel' }],
      style_guide: { tone: 'friendly' },
    })
  })

  it('saves glossary edits in this browser and does not reuse a translation made with another glossary', async () => {
    renderHome()
    typeText('Open the Dashboard')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')
    expect(screen.queryByRole('list', { name: 'Glossary terms missing from the translation' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Add term' }))
    fireEvent.change(screen.getByLabelText('Source term 1'), { target: { value: 'Dashboard' } })
    fireEvent.change(screen.getByLabelText('Translation 1'), { target: { value: 'Panel' } })
    fireEvent.change(screen.getByLabelText('Audience'), { target: { value: 'admins' } })

    expect(JSON.parse(localStorage.getItem('translationOptions'))).toMatchObject({
      glossary: [{ sourceTerm: 'Dashboard', targetTerm: 'Panel' }],
      styleGuide: { audience: 'admins' },
    })

    clickTranslate()
    await waitFor(() => expect(posts()).toHaveLength(2))
    expect(posts()[1].data.glossary).toEqual([{ source_term: 'Dashboard', target_term: 'Panel' }])

    fireEvent.click(screen.getByRole('button', { name: 'Remove term 1' }))
    expect(screen.queryByLabelText('Source term 1')).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('translationOptions')).glossary).toEqual([])
  })

  // GET / is the one request on load; a healthy backend shows nothing for it.
  it('makes no request on load but the health check', async () => {
    renderHome()
    await waitFor(() => expect(calls).toEqual([{ method: 'get', url: '/', data: undefined }]))
  })

  it('defaults the target to Spanish, so the English sample does not come back unchanged', async () => {
    renderHome()
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveTextContent('Spanish')
    fireEvent.click(screen.getByRole('button', { name: /Our office is closed on Monday/ }))
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')
    expect(posts()[0].data).toEqual({
      text: 'Our office is closed on Monday, but the online shop stays open.',
      from_lang: 'Auto-detect',
      to_lang: 'Spanish',
    })
  })
})

// Only a backend that is down is worth a word (the owner's review, 2026-11-10).
describe('the service check', () => {
  it('says nothing when GET / answers', async () => {
    renderHome()
    await waitFor(() => expect(calls).toHaveLength(1))
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(screen.queryByText(/translation service/i)).not.toBeInTheDocument()
  })

  it('shows a banner in a status region when GET / fails', async () => {
    routes['get /'] = () => { throw new Error('Network Error') }
    renderHome()
    const banner = await screen.findByText(/The translation service is unreachable/)
    expect(banner.closest('[role="status"]')).not.toBeNull()
    expect(banner).toHaveTextContent('Check that the backend is running')
  })
})

describe('swap', () => {
  const pick = (picker, language) => {
    fireEvent.mouseDown(screen.getByRole('combobox', { name: picker }))
    fireEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: language }))
  }

  it('is one button between the pickers, with no separate text or language swaps', () => {
    renderHome()
    expect(screen.getAllByRole('button', { name: /swap/i })).toHaveLength(1)
    // Auto-detect has no language to swap to.
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
  })

  it('swaps the languages, moves the translation into the input and clears the output', async () => {
    renderHome()
    pick(/Translate From:/, 'English')
    typeText('Hello, world!')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')

    fireEvent.click(screen.getByRole('button', { name: 'Swap languages' }))

    expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveTextContent('Spanish')
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveTextContent('English')
    expect(screen.getByRole('textbox', { name: 'Text to translate' })).toHaveValue('¡Hola, mundo!')
    // The old source is not a translation into the new target; the output starts empty.
    expect(screen.getByRole('textbox', { name: 'Translation' })).toHaveValue('')
  })

  it('swaps only the languages when there is no translation yet', () => {
    renderHome()
    pick(/Translate From:/, 'English')
    typeText('Hello')
    fireEvent.click(screen.getByRole('button', { name: 'Swap languages' }))
    expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveTextContent('Spanish')
    expect(screen.getByRole('textbox', { name: 'Text to translate' })).toHaveValue('Hello')
    expect(screen.getByRole('textbox', { name: 'Translation' })).toHaveValue('')
  })

  it('is off when both languages are the same', () => {
    renderHome()
    pick(/Translate From:/, 'Spanish')
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
  })

  // The reason a disabled swap reads out, via its aria-describedby text.
  const swapReason = () => {
    const swap = screen.getByRole('button', { name: 'Swap languages' })
    const id = swap.getAttribute('aria-describedby')
    expect(id).toBeTruthy()
    return document.getElementById(id)
  }

  it('before any translation, Auto-detect stays disabled and says why', () => {
    renderHome()
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
    expect(swapReason()).toHaveTextContent('Translate first, or pick a source language.')
  })

  it('after an Auto-detect translation, swaps into the detected language and moves the text', async () => {
    // The owner's example: Auto-detect, English text, Hebrew target.
    routes['post /v1/translate'] = () => ({
      ...V1_RESPONSE, translation: 'שלום עולם', from_lang: 'Auto-detect', detected_lang: 'English', to_lang: 'Hebrew',
    })
    renderHome()
    pick(/Translate To:/, 'Hebrew')
    typeText('Hello world')
    clickTranslate()
    await screen.findByDisplayValue('שלום עולם')

    const swap = screen.getByRole('button', { name: 'Swap languages' })
    expect(swap).toBeEnabled()
    expect(swap).not.toHaveAttribute('aria-describedby')
    fireEvent.click(swap)

    expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveTextContent('Hebrew')
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveTextContent('English')
    expect(screen.getByRole('textbox', { name: 'Text to translate' })).toHaveValue('שלום עולם')
    expect(screen.getByRole('textbox', { name: 'Translation' })).toHaveValue('')
  })

  it('stays disabled when the detected language is the target, and says the languages are the same', async () => {
    routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, from_lang: 'Auto-detect', detected_lang: 'Spanish' })
    renderHome()
    typeText('Hola')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')

    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
    expect(swapReason()).toHaveTextContent('The two languages are the same')
  })

  it('forgets the detected language after a swap, so Auto-detect again needs a new translation', async () => {
    routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, from_lang: 'Auto-detect', detected_lang: 'English' })
    renderHome()
    typeText('Hello')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')
    fireEvent.click(screen.getByRole('button', { name: 'Swap languages' }))

    pick(/Translate From:/, 'Auto-detect')
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
    expect(swapReason()).toHaveTextContent('Translate first, or pick a source language.')
  })

  it('clearing the text forgets the detected language', async () => {
    routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, from_lang: 'Auto-detect', detected_lang: 'English' })
    renderHome()
    typeText('Hello')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Clear text' }))
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
    expect(swapReason()).toHaveTextContent('Translate first, or pick a source language.')
  })

  it('is disabled while translating, even once a language was detected', async () => {
    const pending = deferred()
    routes['post /v1/translate'] = () => pending.promise
    renderHome()
    typeText('Hello')
    clickTranslate()
    await screen.findByText(/Translating your text into Spanish/)
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()

    pending.resolve({ ...V1_RESPONSE, from_lang: 'Auto-detect', detected_lang: 'English' })
    await screen.findByDisplayValue('¡Hola, mundo!')
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeEnabled()
  })

  it('saves the detected language in history and swaps with it after a restore', async () => {
    localStorage.setItem('settings', JSON.stringify({ historyEnabled: true }))
    routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, from_lang: 'Auto-detect', detected_lang: 'English' })
    const { unmount } = renderHome()
    typeText('Hello')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')
    const [item] = JSON.parse(localStorage.getItem('translationHistory'))
    expect(item).toMatchObject({ sourceLang: 'Auto-detect', detectedLang: 'English' })

    // Restore the item the way the History page hands it over.
    unmount()
    sessionStorage.setItem('selectedHistoryItem', JSON.stringify(item))
    renderHome()
    await screen.findByDisplayValue('¡Hola, mundo!')
    const swap = screen.getByRole('button', { name: 'Swap languages' })
    expect(swap).toBeEnabled()
    fireEvent.click(swap)
    expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveTextContent('Spanish')
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveTextContent('English')
    expect(screen.getByRole('textbox', { name: 'Text to translate' })).toHaveValue('¡Hola, mundo!')
    expect(screen.getByRole('textbox', { name: 'Translation' })).toHaveValue('')
  })

  it('a history item without a detected language stays disabled and says why', async () => {
    sessionStorage.setItem('selectedHistoryItem', JSON.stringify({
      sourceText: 'Hello', translatedText: 'Hola', sourceLang: 'Auto-detect', targetLang: 'Spanish', model: 'm',
    }))
    renderHome()
    await screen.findByDisplayValue('Hola')
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled()
    expect(swapReason()).toHaveTextContent('Translate first, or pick a source language.')
  })

  it('a detected language outside the picker list still swaps and shows in the target picker', async () => {
    routes['post /v1/translate'] = () => ({
      ...V1_RESPONSE, translation: 'سلام', from_lang: 'Auto-detect', detected_lang: 'Persian', to_lang: 'Spanish',
    })
    renderHome()
    typeText('Hello')
    clickTranslate()
    await screen.findByDisplayValue('سلام')
    fireEvent.click(screen.getByRole('button', { name: 'Swap languages' }))

    expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveTextContent('Spanish')
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveTextContent('Persian')
    expect(screen.getByRole('textbox', { name: 'Text to translate' })).toHaveValue('سلام')
  })

  it('matches a detected name to the picker regardless of case', async () => {
    routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, from_lang: 'Auto-detect', detected_lang: 'english' })
    renderHome()
    typeText('Hello')
    clickTranslate()
    await screen.findByDisplayValue('¡Hola, mundo!')
    fireEvent.click(screen.getByRole('button', { name: 'Swap languages' }))
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveTextContent('English')
  })
})

describe('text mode', () => {
  describe('empty', () => {
    it('says what to do first and offers an example sentence that fills the box without translating', async () => {
      renderHome()
      const start = screen.getByRole('region', { name: 'Start here' })
      expect(start).toHaveTextContent('Type or paste text')
      expect(start).toHaveTextContent('press Translate (or Ctrl+Enter)')
      expect(screen.getByRole('button', { name: 'No text to translate' })).toBeDisabled()

      fireEvent.click(within(start).getByRole('button', { name: /Our office is closed on Monday/ }))

      const box = screen.getByPlaceholderText('Enter text to translate...')
      expect(box).toHaveValue('Our office is closed on Monday, but the online shop stays open.')
      expect(box).toHaveFocus()
      expect(screen.queryByRole('region', { name: 'Start here' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Click to translate' })).toBeEnabled()
      await waitFor(() => expect(calls).toHaveLength(1))
      expect(posts()).toEqual([])
    })

    it('labels the source and result boxes', () => {
      renderHome()
      expect(screen.getByRole('textbox', { name: 'Text to translate' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Translation' })).toHaveAttribute('readonly')
    })
  })

  describe('loading', () => {
    it('names what is happening and disables the button, the pickers and the review switch', async () => {
      const pending = deferred()
      routes['post /v1/translate'] = () => pending.promise
      renderHome()
      typeText('Hello, world!')
      clickTranslate()

      await expectAnnounced('Translating your text into Spanish')
      expect(screen.getByRole('button', { name: 'Click to translate' })).toBeDisabled()
      expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveAttribute('aria-disabled', 'true')
      expect(screen.getByLabelText('Review the translation')).toBeDisabled()

      pending.resolve(V1_RESPONSE)
      await expectAnnounced('Translation ready.')
      expect(screen.getByRole('button', { name: 'Click to translate' })).toBeEnabled()
    })

    it('says a review takes longer', async () => {
      routes['post /v1/translate'] = () => deferred().promise
      renderHome()
      fireEvent.click(screen.getByLabelText('Review the translation'))
      typeText('Hello')
      clickTranslate()
      await expectAnnounced('Translating your text into Spanish and reviewing it. A review takes longer.')
    })
  })

  describe('error', () => {
    it('shows the server message once and retries', async () => {
      let attempts = 0
      routes['post /v1/translate'] = () => {
        attempts += 1
        if (attempts === 1) throw failure(502, { error: { type: 'upstream_error', message: 'The model provider is unavailable' } })
        return V1_RESPONSE
      }
      renderHome()
      typeText('Hello, world!')
      clickTranslate()

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Translation failed')
      expect(alert).toHaveTextContent('The model provider is unavailable')
      expect(screen.getAllByText('The model provider is unavailable')).toHaveLength(1)
      expect(posts()).toHaveLength(1)

      fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
      expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(posts()).toHaveLength(2)
    })

    it('says plainly when no model key is set', async () => {
      routes['post /v1/translate'] = () => { throw failure(401, { error: { type: 'authentication_error', message: NO_KEY } }) }
      renderHome()
      typeText('Hello')
      clickTranslate()
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('No model key set')
      expect(alert).toHaveTextContent(NO_KEY)
    })

    it('never shows a raw status', async () => {
      routes['post /v1/translate'] = () => { throw failure(502, '<html>Bad Gateway</html>') }
      renderHome()
      typeText('Hello')
      clickTranslate()
      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('The translation service had a problem and sent no details. Try again.')
      expect(alert.textContent).not.toMatch(/status code|502/)
    })

    it('reads the messages of a 422', async () => {
      routes['post /v1/translate'] = () => {
        throw failure(422, { detail: [{ msg: 'String should have at most 1024 characters' }] })
      }
      renderHome()
      typeText('Hello')
      clickTranslate()
      expect(await screen.findByRole('alert')).toHaveTextContent('String should have at most 1024 characters')
    })
  })

  describe('success', () => {
    it('shows the result with copy and download, and the review report when asked', async () => {
      routes['post /v1/translate'] = () => ({ ...V1_RESPONSE, review: REVIEW })
      const { created, clicked } = mockDownload()
      renderHome()
      fireEvent.click(screen.getByLabelText('Review the translation'))
      typeText('Hello, world!')
      clickTranslate()

      expect(await screen.findByDisplayValue('¡Hola, mundo!')).toBeInTheDocument()
      await expectAnnounced('Translation ready.')
      expect(posts()[0].data.review).toBe('on')
      expect(screen.getByRole('region', { name: 'Review' })).toHaveTextContent('too casual')
      expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeEnabled()

      fireEvent.click(screen.getByRole('button', { name: 'Download translation' }))
      expect(clicked).toEqual([{ href: 'blob:mock/1', download: 'translation.spanish.txt' }])
      expect(await created[0].text()).toBe('¡Hola, mundo!')
      // Revoked after the click, not before: the browser may not have read the blob yet.
      await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock/1'))
    })

    it('has no download before there is a translation', () => {
      renderHome()
      expect(screen.getByRole('button', { name: 'Download translation' })).toBeDisabled()
    })
  })
})

describe('file mode', () => {
  it('empty: says what to do first and cannot translate yet', () => {
    renderHome()
    toFileMode()
    expect(screen.getByRole('group', { name: 'File to translate' })).toHaveTextContent(
      'Choose or drop a file, pick the languages, then press Translate file.',
    )
    expect(screen.getByRole('button', { name: 'Translate file' })).toBeDisabled()
  })

  it('loading: names the file and disables the button, the file picker, the language pickers and the review switch', async () => {
    const pending = deferred()
    routes['post /v1/translate/file'] = () => pending.promise
    renderHome()
    toFileMode()
    chooseFile()
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))

    await expectAnnounced('Translating a.json into Spanish')
    expect(screen.getByRole('button', { name: 'Translating…' })).toBeDisabled()
    expect(screen.getByLabelText('Choose a file')).toBeDisabled()
    expect(screen.getByRole('combobox', { name: /Translate From:/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('combobox', { name: /Translate To:/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByLabelText('Review the translation')).toBeDisabled()

    pending.resolve(FILE_RESPONSE)
    await expectAnnounced('a.json is translated into English.')
    // The page hears the end of the request from an effect, one render after the status.
    await waitFor(() => expect(screen.getByLabelText('Review the translation')).toBeEnabled())
  })

  it('unlocks the review switch when the visitor leaves file mode during a request', async () => {
    routes['post /v1/translate/file'] = () => deferred().promise
    renderHome()
    toFileMode()
    chooseFile()
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))
    await expectAnnounced('Translating a.json into Spanish')
    expect(screen.getByLabelText('Review the translation')).toBeDisabled()

    fireEvent.click(screen.getByRole('tab', { name: 'Text' }))
    expect(screen.getByLabelText('Review the translation')).toBeEnabled()
  })

  it('error: shows the message and the failed segments, and retries', async () => {
    let attempts = 0
    routes['post /v1/translate/file'] = () => {
      attempts += 1
      if (attempts === 1) {
        throw failure(500, {
          error: {
            type: 'api_error',
            message: '1 of 2 segments failed, so the file was not translated',
            segment_errors: [{ segment: 1, type: 'api_error', message: 'Segment /a lost its placeholders' }],
          },
        })
      }
      return FILE_RESPONSE
    }
    renderHome()
    toFileMode()
    chooseFile()
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('1 of 2 segments failed, so the file was not translated')
    expect(alert).toHaveTextContent('Segment /a lost its placeholders')
    expect(screen.queryByRole('button', { name: 'Download translated file' })).toBeNull()

    fireEvent.click(within(alert).getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('button', { name: 'Download translated file' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('error: says plainly when no model key is set, never a raw status', async () => {
    routes['post /v1/translate/file'] = () => { throw failure(401, { error: { type: 'authentication_error', message: NO_KEY } }) }
    renderHome()
    toFileMode()
    chooseFile()
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No model key set')
    expect(alert.textContent).not.toMatch(/status code|401/)
  })

  it('success: download, copy, report and the review report', async () => {
    routes['post /v1/translate/file'] = () => ({ ...FILE_RESPONSE, report: { ...FILE_RESPONSE.report, review: REVIEW } })
    const { created, clicked } = mockDownload()
    renderHome()
    toFileMode()
    fireEvent.click(screen.getByLabelText('Review the translation'))
    chooseFile()
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))

    await expectAnnounced('a.json is translated into English.')
    expect(posts()[0].data.get('review')).toBe('on')
    expect(screen.getByRole('region', { name: 'Report' })).toHaveTextContent('gpt-4o-mini')
    expect(screen.getByRole('region', { name: 'Review' })).toHaveTextContent('too casual')
    expect(screen.getByRole('button', { name: 'Copy to clipboard' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Download translated file' }))
    expect(clicked).toEqual([{ href: 'blob:mock/1', download: 'a.english.json' }])
    expect(await created[0].text()).toBe('{"a": "Hola"}')
    await waitFor(() => expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock/1'))
  })
})
