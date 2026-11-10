import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'

// The translation page with the keyboard only, and its states at phone width.

const SOURCE = readFileSync(new URL('./fixtures/messages.json', import.meta.url), 'utf8')
const TRANSLATED = readFileSync(new URL('./fixtures/messages.es.json', import.meta.url), 'utf8')

const TEXT_RESPONSE = {
  translation: '¡Hola, mundo!', from_lang: 'English', to_lang: 'Spanish', model: 'gpt-4o-mini',
  usage: { prompt_tokens: 42, completion_tokens: 6, total_tokens: 48 }, glossary_misses: [], cached: false,
}

const FILE_RESPONSE = {
  content: TRANSLATED, format: 'json', from_lang: 'English', to_lang: 'Spanish',
  report: { segments: 2, model: 'gpt-4o-mini', usage: { prompt_tokens: 84, completion_tokens: 12, total_tokens: 96 } },
}

const NO_KEY = 'No model API key is set, and the model endpoint requires one. Set LLM_API_KEY (in the .env file next to docker-compose.yml, or in backend/.env) and restart the backend.'

// The health check, on the API's origin, not the page's.
// Any host on port 8000: the code's default is 127.0.0.1, the README's `frontend/.env` says localhost.
const routeHealth = (page) =>
  page.route((url) => url.port === '8000' && url.pathname === '/',
    (route) => route.fulfill({ json: { message: 'llm-translate is running' } }))

// Moves focus with Tab (or Shift+Tab) until `target` has it: what a keyboard user does.
const tabTo = async (page, target, { back = false, max = 40 } = {}) => {
  for (let i = 0; i < max; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab')
  }
  await expect(target).toBeFocused()
}

// Opens a language picker from the keyboard and walks the list down to `language`.
const pickWithKeyboard = async (page, picker, language) => {
  await page.keyboard.press('Enter')
  const option = page.getByRole('option', { name: language, exact: true })
  await expect(page.getByRole('listbox')).toBeVisible()
  for (let i = 0; i < 30 && !(await option.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('ArrowDown')
  }
  await page.keyboard.press('Enter')
  await expect(picker).toHaveText(language)
  await expect(picker).toBeFocused()
}

const noHorizontalScroll = async (page) => {
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
}

test.beforeEach(async ({ page }) => {
  await routeHealth(page)
})

test('text mode, keyboard only: review switch, language picker, text and translate', async ({ page }) => {
  const bodies = []
  await page.route('**/v1/translate', async (route) => {
    bodies.push(route.request().postDataJSON())
    await route.fulfill({ json: TEXT_RESPONSE })
  })
  await page.goto('/')
  await expect(page.getByText('Translation service reachable')).toBeVisible()

  const box = page.getByRole('textbox', { name: 'Text to translate' })
  await expect(box).toBeFocused() // the page opens on the text box

  const review = page.getByLabel('Review the translation')
  await tabTo(page, review, { back: true })
  await page.keyboard.press('Space')
  await expect(review).toBeChecked()

  const target = page.getByRole('combobox', { name: /Translate To:/ })
  await tabTo(page, target)
  await pickWithKeyboard(page, target, 'Spanish')

  await tabTo(page, box, { back: true })
  await page.keyboard.type('Hello, world!')

  await tabTo(page, page.getByRole('button', { name: 'Click to translate' }))
  await page.keyboard.press('Enter')

  await expect(page.getByRole('textbox', { name: 'Translation' })).toHaveValue('¡Hola, mundo!')
  await expect(page.getByText('Translation ready.')).toBeVisible()
  expect(bodies).toEqual([{ text: 'Hello, world!', from_lang: 'Auto-detect', to_lang: 'Spanish', review: 'on' }])
})

test('file mode, keyboard only: tab, file picker, translate and download', async ({ page }) => {
  await page.route('**/v1/translate/file', (route) => route.fulfill({ json: FILE_RESPONSE }))
  await page.goto('/')

  const textTab = page.getByRole('tab', { name: 'Text' })
  await tabTo(page, textTab, { back: true })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'File' })).toHaveAttribute('aria-selected', 'true')

  const input = page.getByLabel('Choose a file')
  await tabTo(page, input)
  // The input is visually hidden, so the drop zone shows the focus ring.
  const ring = await page.getByTestId('file-drop-zone').evaluate((el) => getComputedStyle(el).outlineStyle)
  expect(ring).not.toBe('none')

  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Space')])
  await chooser.setFiles({ name: 'messages.json', mimeType: 'application/json', buffer: Buffer.from(SOURCE) })
  await expect(page.getByText('messages.json')).toBeVisible()

  const target = page.getByRole('combobox', { name: /Translate To:/ })
  await tabTo(page, target)
  await pickWithKeyboard(page, target, 'Spanish')

  await tabTo(page, page.getByRole('button', { name: 'Translate file' }))
  await page.keyboard.press('Enter')
  await expect(page.getByText('messages.json is translated into Spanish.')).toBeVisible()

  await tabTo(page, page.getByRole('button', { name: 'Download translated file' }))
  const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Enter')])
  expect(download.suggestedFilename()).toBe('messages.spanish.json')
})

test.describe('at 375 px', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const theme of ['light', 'dark']) {
    test(`${theme}: empty, error, success and file success all fit`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
      let fail = true
      await page.route('**/v1/translate', (route) =>
        fail
          ? route.fulfill({ status: 401, json: { error: { type: 'authentication_error', message: NO_KEY, details: null } } })
          : route.fulfill({ json: TEXT_RESPONSE }),
      )
      await page.route('**/v1/translate/file', (route) => route.fulfill({ json: FILE_RESPONSE }))
      await page.goto('/')

      await expect(page.getByRole('region', { name: 'Start here' })).toBeVisible()
      await noHorizontalScroll(page)

      await page.getByRole('button', { name: /Our office is closed on Monday/ }).click()
      await page.getByRole('button', { name: 'Click to translate' }).click()
      const alert = page.getByRole('alert').filter({ hasText: 'No model key set' })
      await expect(alert).toContainText('Set LLM_API_KEY')
      await noHorizontalScroll(page)

      fail = false
      await alert.getByRole('button', { name: 'Try again' }).click()
      await expect(page.getByRole('textbox', { name: 'Translation' })).toHaveValue('¡Hola, mundo!')
      await noHorizontalScroll(page)

      await page.getByRole('tab', { name: 'File' }).click()
      await page.getByLabel('Choose a file').setInputFiles({
        name: 'messages.json', mimeType: 'application/json', buffer: Buffer.from(SOURCE),
      })
      await page.getByRole('button', { name: 'Translate file' }).click()
      await expect(page.getByRole('region', { name: 'Report' })).toBeVisible()
      await noHorizontalScroll(page)
    })
  }
})
