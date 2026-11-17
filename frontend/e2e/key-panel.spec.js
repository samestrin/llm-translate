/* global Buffer */
import { test, expect } from '@playwright/test'

// Epic 08 T4, proven in CI with mocked `/v1/presets` (plan AC2): in the public demo no
// model call goes out without a key or code, the credential travels in request headers
// only, clear wipes it, and the speak button is hidden with a one-line reason for a
// preset without speech.

const FAKE_KEY = 'sk-test-FAKE-KEY-1234567890'
const DEMO_CODE = 'demo-code-FAKE-9876543210'
const NOTICE = 'Public demo: do not upload private files. Files are translated in memory and not stored.'

const PRESETS = {
  public_demo: true,
  presets: [
    { id: 'openai', label: 'OpenAI', speech: true },
    { id: 'openrouter', label: 'OpenRouter', speech: false },
    { id: 'synthetic', label: 'Synthetic', speech: false },
    { id: 'alibaba', label: 'Alibaba (DashScope intl)', speech: false },
    { id: 'demo', label: 'Demo code', speech: false },
  ],
}

const TRANSLATION = {
  translation: 'Hola', from_lang: 'English', to_lang: 'Spanish', model: 'gpt-5-nano',
  usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, glossary_misses: [], cached: false,
}

const FILE_RESULT = {
  content: '{"a": "Hola"}', format: 'json', from_lang: 'English', to_lang: 'Spanish',
  report: { segments: 1, model: 'gpt-5-nano', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } },
}

// A tiny valid WAV for /v1/speak.
const WAV = Buffer.from(
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=', 'base64'
)

// Mock the backend and record every model request (headers, URL, body).
const mockBackend = async (page, { presets = PRESETS } = {}) => {
  const modelRequests = []
  const record = (route, kind) => {
    const request = route.request()
    modelRequests.push({ kind, headers: request.headers(), url: request.url(), body: request.postData() ?? '' })
  }
  await page.route('**/v1/presets', (route) => route.fulfill({ json: presets }))
  await page.route('**/v1/translate', async (route) => {
    record(route, 'translate')
    await route.fulfill({ json: TRANSLATION })
  })
  await page.route('**/v1/translate/file', async (route) => {
    record(route, 'file')
    await route.fulfill({ json: FILE_RESULT })
  })
  await page.route('**/v1/speak', async (route) => {
    record(route, 'speak')
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: WAV })
  })
  return modelRequests
}

const typeAndTranslate = async (page, text = 'Hello') => {
  await page.getByPlaceholder('Enter text to translate...').fill(text)
  await page.getByRole('button', { name: 'Click to translate' }).click()
}

const pickPreset = async (page, label) => {
  await page.getByRole('combobox', { name: 'Provider' }).click()
  await page.getByRole('option', { name: label, exact: true }).click()
}

// The key field is the panel's only password input; the dropdown's own value can share
// the field's label text ("Demo code"), so target the input itself.
const keyField = (page) => page.locator('#model-key-input')

const storageKeys = (page) =>
  page.evaluate(() => ({
    local: localStorage.getItem('modelAccessKey'),
    session: sessionStorage.getItem('modelAccessKey'),
  }))

const expectNoKeyInRequests = (requests, secret) => {
  for (const r of requests) {
    expect(r.url).not.toContain(secret)
    expect(r.body).not.toContain(secret)
  }
}

test('no model call goes out without a key or code; translate asks for one', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  await expect(page.getByText(NOTICE)).toBeVisible()

  await typeAndTranslate(page)
  await expect(page.getByText('Key or demo code needed')).toBeVisible()
  await expect(page.getByText('Enter a demo code or your own API key above to translate or listen.')).toBeVisible()
  expect(requests).toHaveLength(0)

  // File mode asks too.
  await page.getByRole('tab', { name: 'File' }).click()
  await page.setInputFiles('input[type="file"]', { name: 'a.json', mimeType: 'application/json', buffer: Buffer.from('{"a": "Hello"}') })
  await page.getByRole('button', { name: 'Translate file' }).click()
  await expect(page.getByText('Key or demo code needed')).toBeVisible()
  expect(requests).toHaveLength(0)
})

test('the key travels in request headers only, and lives in session storage by default', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  await pickPreset(page, 'OpenAI')
  await keyField(page).fill(FAKE_KEY)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')

  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-model-preset']).toBe('openai')
  expect(requests[0].headers['x-model-key']).toBe(FAKE_KEY)
  expectNoKeyInRequests(requests, FAKE_KEY)
  expect(await storageKeys(page)).toEqual({ local: null, session: FAKE_KEY })
})

test('a demo code goes in X-Demo-Code, never in X-Model-Key', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  await keyField(page).fill(DEMO_CODE)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')

  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-demo-code']).toBe(DEMO_CODE)
  expect(requests[0].headers['x-model-key']).toBeUndefined()
  expectNoKeyInRequests(requests, DEMO_CODE)
})

test('remember keeps the key on this device; clear wipes it and translate asks again', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  await pickPreset(page, 'OpenAI')
  await keyField(page).fill(FAKE_KEY)
  await page.getByRole('checkbox', { name: 'Remember on this device' }).check()
  expect(await storageKeys(page)).toEqual({ local: FAKE_KEY, session: null })

  // Remembered: a reload restores the preset and the key.
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Provider' })).toContainText('OpenAI')
  await expect(keyField(page)).toHaveValue(FAKE_KEY)

  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(1)

  // Clear wipes both storages and the field; the next translate asks instead of sending.
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(keyField(page)).toHaveValue('')
  expect(await storageKeys(page)).toEqual({ local: null, session: null })
  await typeAndTranslate(page)
  await expect(page.getByText('Key or demo code needed')).toBeVisible()
  expect(requests).toHaveLength(1)
})

test('speak is hidden with a one-line reason for a preset without speech, shown with speech', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')

  // OpenRouter has no speech model: no Speak button, one line saying why.
  await pickPreset(page, 'OpenRouter')
  await keyField(page).fill(FAKE_KEY)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  await expect(page.getByRole('button', { name: 'Listen to translation' })).toHaveCount(0)
  await expect(page.getByText('Speech is not available for OpenRouter.')).toBeVisible()

  // OpenAI has one: the button is back, and its call carries the credential in headers.
  // Switching preset wiped the OpenRouter key, so enter the OpenAI one.
  await pickPreset(page, 'OpenAI')
  await expect(keyField(page)).toHaveValue('')
  await keyField(page).fill(FAKE_KEY)
  await typeAndTranslate(page)
  await expect(page.getByText('Speech is not available for OpenRouter.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Listen to translation' }).click()
  await expect.poll(() => requests.filter((r) => r.kind === 'speak').length).toBe(1)
  const speak = requests.find((r) => r.kind === 'speak')
  expect(speak.headers['x-model-key']).toBe(FAKE_KEY)
  expectNoKeyInRequests(requests, FAKE_KEY)
})

test('the public notice shows the exact shared-design text', async ({ page }) => {
  await mockBackend(page)
  await page.goto('/')
  await expect(page.getByText(NOTICE, { exact: true })).toBeVisible()
})

test('env-key mode keeps today\'s page: no panel, no notice, translate without a key', async ({ page }) => {
  const requests = await mockBackend(page, { presets: { public_demo: false, presets: [] } })
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'Provider' })).toHaveCount(0)
  await expect(page.getByText(NOTICE)).toHaveCount(0)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-model-key']).toBeUndefined()
  expect(requests[0].headers['x-demo-code']).toBeUndefined()
})

test('an unreachable presets list keeps the env-key page working', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.route('**/v1/presets', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('combobox', { name: 'Provider' })).toHaveCount(0)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(1)
})
