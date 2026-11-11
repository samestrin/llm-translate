import { test, expect } from '@playwright/test'

// The family look (shared with llm-pdf-chatbot) and the owner's review findings of 2026-11-10.

const routeHealth = (page) =>
  page.route((url) => url.port === '8000' && url.pathname === '/',
    (route) => route.fulfill({ json: { message: 'llm-translate is running' } }))

test.beforeEach(async ({ page }) => {
  await routeHealth(page)
})

for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }]) {
  test(`the Translate button is on screen without scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await expect(page.getByRole('region', { name: 'Start here' })).toBeVisible()
    const button = page.getByRole('button', { name: 'No text to translate' })
    await expect(button).toBeInViewport({ ratio: 1 })
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  })
}

test('a focused text box shows one focus ring, its border', async ({ page }) => {
  await page.goto('/')
  const box = page.getByRole('textbox', { name: 'Text to translate' })
  await expect(box).toBeFocused()
  expect(await box.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')
  const border = await box.evaluate((el) => {
    const s = getComputedStyle(el.closest('.MuiOutlinedInput-root').querySelector('fieldset'))
    return { width: s.borderTopWidth, color: s.borderTopColor }
  })
  expect(border).toEqual({ width: '2px', color: 'rgb(15, 118, 110)' })
  // Only the border: the field root has no outline of its own either.
  expect(await box.evaluate((el) => getComputedStyle(el.closest('.MuiOutlinedInput-root')).outlineStyle)).toBe('none')
})

test('one swap button between the pickers, named, with a tooltip', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: /swap/i })).toHaveCount(1)
  await page.getByRole('combobox', { name: 'Translate From:' }).click()
  await page.getByRole('option', { name: 'English', exact: true }).click()
  const swap = page.getByRole('button', { name: 'Swap languages and text' })
  await expect(swap).toBeEnabled()
  await swap.hover()
  await expect(page.getByRole('tooltip')).toHaveText('Swap languages and text')
  await swap.click()
  await expect(page.getByRole('combobox', { name: 'Translate From:' })).toHaveText('Spanish')
  await expect(page.getByRole('combobox', { name: 'Translate To:' })).toHaveText('English')
})

test('the tab title, the favicon and the header mark', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('LLM Translate')
  const href = await page.locator('link[rel="icon"]').getAttribute('href')
  expect(href).toBe('/favicon.svg')
  const icon = await page.request.get(href)
  expect(icon.ok()).toBe(true)
  expect(await icon.text()).toContain('prefers-color-scheme: dark')
  await expect(page.getByRole('link', { name: 'LLM Translate home' }).locator('svg.logo-mark')).toBeVisible()
})

test('a healthy backend shows nothing; no developer pill', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Text to translate' })).toBeFocused()
  await expect(page.getByText(/translation service/i)).toHaveCount(0)
})

test('an unreachable backend shows a banner', async ({ page }) => {
  await page.unroute((url) => url.port === '8000' && url.pathname === '/')
  await page.route((url) => url.port === '8000' && url.pathname === '/', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByText(/The translation service is unreachable/)).toBeVisible()
})

test('while translating, the dots come after the words', async ({ page }) => {
  let release
  await page.route('**/v1/translate', async (route) => {
    await new Promise((resolve) => { release = resolve })
    await route.fulfill({
      json: {
        translation: 'Hola', from_lang: 'English', to_lang: 'Spanish', model: 'm',
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, glossary_misses: [], cached: false,
      },
    })
  })
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Text to translate' }).fill('Hello')
  await page.getByRole('button', { name: 'Click to translate' }).click()
  const thinking = page.locator('.thinking')
  await expect(thinking.locator('.thinking-label')).toHaveText('Translating your text into Spanish')
  await expect(thinking.locator('.thinking-dot')).toHaveCount(3)
  const order = await thinking.evaluate((el) => [...el.children].map((c) => c.className))
  expect(order).toEqual(['thinking-label', 'visually-hidden', 'thinking-dots'])
  await expect.poll(() => typeof release).toBe('function')
  release()
  await expect(page.getByText('Translation ready.')).toBeVisible()
})
