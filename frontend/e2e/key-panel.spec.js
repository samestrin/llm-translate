/* global Buffer */
import { test, expect } from '@playwright/test'

// Epic 08 T4, proven in CI with mocked `/v1/presets` (plan AC2): in the public demo no
// model call goes out without a key or code, the credential travels in request headers
// only, clear wipes it, and the speak button is hidden with a one-line reason for a
// preset without speech. EST-9222: each provider keeps its own key, so switching
// provider and back restores that provider's key or demo code.

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
  page.evaluate(() => {
    const parse = (raw) => (raw ? JSON.parse(raw) : null)
    return {
      local: parse(localStorage.getItem('modelAccessKeys')),
      session: parse(sessionStorage.getItem('modelAccessKeys')),
    }
  })

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
  expect(await storageKeys(page)).toEqual({ local: null, session: { openai: FAKE_KEY } })
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
  expect(await storageKeys(page)).toEqual({ local: { openai: FAKE_KEY }, session: null })

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
  // OpenAI has no key of its own yet (the OpenRouter key stays under OpenRouter), so
  // enter the OpenAI one.
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

test('switching demo -> other -> demo restores the demo code, remembered (EST-9222)', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  await keyField(page).fill(DEMO_CODE)
  await page.getByRole('checkbox', { name: 'Remember on this device' }).check()

  // Switch away: the OpenAI field is empty, the demo code stays stored under demo.
  await pickPreset(page, 'OpenAI')
  await expect(keyField(page)).toHaveValue('')
  expect(await storageKeys(page)).toEqual({ local: { demo: DEMO_CODE }, session: null })

  // A call on OpenAI without its own key asks for one; the demo code never goes with it.
  await typeAndTranslate(page)
  await expect(page.getByText('Key or demo code needed')).toBeVisible()
  expect(requests).toHaveLength(0)

  // Its own key travels only with its own preset's headers.
  await keyField(page).fill(FAKE_KEY)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-model-preset']).toBe('openai')
  expect(requests[0].headers['x-model-key']).toBe(FAKE_KEY)
  expect(requests[0].headers['x-demo-code']).toBeUndefined()

  // Switch back: the demo code is restored, even across a reload, and goes only in X-Demo-Code.
  await pickPreset(page, 'Demo code')
  await expect(keyField(page)).toHaveValue(DEMO_CODE)
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Provider' })).toContainText('Demo code')
  await expect(keyField(page)).toHaveValue(DEMO_CODE)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(2)
  expect(requests[1].headers['x-demo-code']).toBe(DEMO_CODE)
  expect(requests[1].headers['x-model-key']).toBeUndefined()
  expectNoKeyInRequests(requests, DEMO_CODE)
  expectNoKeyInRequests(requests, FAKE_KEY)

  // And the OpenAI key is still there when switching to it again.
  await pickPreset(page, 'OpenAI')
  await expect(keyField(page)).toHaveValue(FAKE_KEY)

  // Clear wipes every stored key in both storages, not just the selected one.
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(keyField(page)).toHaveValue('')
  expect(await storageKeys(page)).toEqual({ local: null, session: null })
  await pickPreset(page, 'Demo code')
  await expect(keyField(page)).toHaveValue('')
  await typeAndTranslate(page)
  await expect(page.getByText('Key or demo code needed')).toBeVisible()
  expect(requests).toHaveLength(2)
})

test('switching demo -> other -> demo restores the demo code within the session, remember off (EST-9222)', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  await keyField(page).fill(DEMO_CODE)
  await pickPreset(page, 'OpenAI')
  await expect(keyField(page)).toHaveValue('')
  expect(await storageKeys(page)).toEqual({ local: null, session: { demo: DEMO_CODE } })
  await pickPreset(page, 'Demo code')
  await expect(keyField(page)).toHaveValue(DEMO_CODE)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-demo-code']).toBe(DEMO_CODE)
  expect(requests[0].headers['x-model-key']).toBeUndefined()
  expectNoKeyInRequests(requests, DEMO_CODE)
})

test('the old single-key storage shape migrates: the key returns under its old preset (EST-9222)', async ({ page }) => {
  const requests = await mockBackend(page)
  await page.goto('/')
  // Seed the pre-EST-9222 shape: prefs plus one raw remembered key under the demo preset.
  await page.evaluate(([code]) => {
    localStorage.setItem('modelAccess', JSON.stringify({ preset: 'demo', remember: true }))
    localStorage.setItem('modelAccessKey', code)
  }, [DEMO_CODE])
  await page.reload()
  await expect(keyField(page)).toHaveValue(DEMO_CODE)
  await typeAndTranslate(page)
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Hola')
  expect(requests).toHaveLength(1)
  expect(requests[0].headers['x-demo-code']).toBe(DEMO_CODE)
  // The next save (here: switching preset) moves it into the per-preset map and removes
  // the old item from both storages.
  await pickPreset(page, 'OpenAI')
  expect(await storageKeys(page)).toEqual({ local: { demo: DEMO_CODE }, session: null })
  expect(await page.evaluate(() => localStorage.getItem('modelAccessKey'))).toBeNull()
  expect(await page.evaluate(() => sessionStorage.getItem('modelAccessKey'))).toBeNull()
  // Switching back still shows the migrated demo code.
  await pickPreset(page, 'Demo code')
  await expect(keyField(page)).toHaveValue(DEMO_CODE)
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

// Epic 09 T3: the key panel renders the shell values (docs/demo-shell.md "Key panel").
// The 42 px control height is set locally in KeyPanel.jsx, not in a global MuiOutlinedInput
// override, so the language pickers must keep their 40 px (also pinned in family-look).

const shellStyle = (page) =>
  page.getByRole('region', { name: 'Model access' }).evaluate((el) => {
    const s = getComputedStyle(el)
    const notice = el.firstElementChild
    const n = getComputedStyle(notice)
    return {
      display: s.display,
      direction: s.flexDirection,
      gap: s.rowGap,
      padding: s.padding,
      radius: s.borderTopLeftRadius,
      border: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`,
      bg: s.backgroundColor,
      hasShadow: s.boxShadow !== 'none',
      notice: {
        tag: notice.tagName,
        text: notice.textContent,
        fontSize: n.fontSize,
        color: n.color,
        margin: n.margin,
        bg: n.backgroundColor,
        borderWidth: n.borderTopWidth,
      },
    }
  })

const SHELL_PANEL_STYLE = {
  display: 'flex',
  direction: 'column',
  gap: '12px',
  padding: '16px',
  radius: '14px',
  border: '1px solid rgb(220, 223, 229)',
  bg: 'rgb(255, 255, 255)',
  hasShadow: true,
  notice: {
    tag: 'P',
    text: NOTICE,
    fontSize: '14px',
    color: 'rgb(84, 90, 101)',
    margin: '0px',
    bg: 'rgba(0, 0, 0, 0)',
    borderWidth: '0px',
  },
}

const controlBoxes = (page) =>
  page.evaluate(() => {
    const rect = (el) => {
      const r = el.getBoundingClientRect()
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
    }
    const row = document.querySelector('section[aria-label="Model access"]').children[1]
    const remember = [...row.querySelectorAll('label')].find((l) => l.textContent.includes('Remember on this device'))
    const clear = [...row.querySelectorAll('button')].find((b) => b.textContent === 'Clear')
    const picker = document.querySelector('#source-lang-selector')
    return {
      rowWidth: row.clientWidth,
      provider: rect(row.querySelector('#model-preset-selector').closest('.MuiOutlinedInput-root')),
      key: rect(row.querySelector('#model-key-input').closest('.MuiOutlinedInput-root')),
      remember: rect(remember),
      clear: rect(clear),
      languagePickerHeight: picker ? rect(picker.closest('.MuiOutlinedInput-root')).height : null,
    }
  })

test('the panel and notice carry the shell values; Provider, key and Clear are 42 px in one row at 1280', async ({ page }) => {
  await mockBackend(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await expect(page.getByText(NOTICE)).toBeVisible()

  expect(await shellStyle(page)).toEqual(SHELL_PANEL_STYLE)

  const boxes = await controlBoxes(page)
  for (const control of [boxes.provider, boxes.key, boxes.clear]) {
    expect(control.height).toBe(42)
  }
  // One row, in the spec's order, bottoms aligned (align-items: flex-end), gap 12.
  expect(boxes.key.x - boxes.provider.right).toBe(12)
  expect(boxes.provider.right).toBeLessThan(boxes.key.x)
  expect(boxes.key.right).toBeLessThan(boxes.remember.x)
  expect(boxes.remember.right).toBeLessThan(boxes.clear.x)
  const controls = [boxes.provider, boxes.key, boxes.remember, boxes.clear]
  for (const control of controls) {
    expect(Math.abs(control.bottom - boxes.clear.bottom)).toBeLessThanOrEqual(1)
  }
  expect(Math.max(...controls.map((c) => c.y))).toBeLessThan(Math.min(...controls.map((c) => c.bottom)))
  // The 42 px is local to the panel: the language pickers keep their 40 px.
  expect(boxes.languagePickerHeight).toBe(40)
})

test('at 375 px the controls stack full width, still 42 px tall, panel values unchanged', async ({ page }) => {
  await mockBackend(page)
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page.getByText(NOTICE)).toBeVisible()

  expect(await shellStyle(page)).toEqual(SHELL_PANEL_STYLE)

  const boxes = await controlBoxes(page)
  const controls = [boxes.provider, boxes.key, boxes.remember, boxes.clear]
  for (const control of controls) {
    expect(control.width).toBe(boxes.rowWidth)
    expect(control.x).toBeCloseTo(controls[0].x, 0)
  }
  for (const control of [boxes.provider, boxes.key, boxes.clear]) {
    expect(control.height).toBe(42)
  }
  // Stacked in the spec's order with the 12 px column gap, nothing side by side.
  expect(boxes.key.y - boxes.provider.bottom).toBe(12)
  expect(boxes.remember.y - boxes.key.bottom).toBe(12)
  expect(boxes.clear.y - boxes.remember.bottom).toBe(12)
  expect(boxes.languagePickerHeight).toBe(40)
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
