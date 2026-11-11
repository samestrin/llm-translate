import { test, expect } from '@playwright/test'

// The /guide page: the footer link reaches it, it explains both fields with the examples the
// API accepts, its contents list jumps, a JSON block copies, and it fits a phone in both themes.

const sizes = [
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1280, height: 900 }],
]

test('the footer link opens the guide', async ({ page }) => {
  await page.goto('/about')
  await page.getByRole('navigation', { name: 'Footer' }).getByRole('link', { name: 'Guide' }).click()
  await expect(page).toHaveURL(/\/guide$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Glossary and style guide' })).toBeVisible()
})

test('the guide explains both fields and shows the worked example', async ({ page }) => {
  await page.goto('/guide')
  for (const name of [
    'What the glossary is',
    'A worked example',
    'What the style guide is',
    'Text mode and file mode',
  ]) {
    await expect(page.getByRole('heading', { name })).toBeVisible()
  }
  for (const field of ['source_term', 'target_term', 'note', 'do_not_translate']) {
    await expect(page.locator('code', { hasText: field }).first()).toBeVisible()
  }
  for (const field of ['tone', 'formality', 'audience', 'notes']) {
    await expect(page.locator('#style-guide').locator('code', { hasText: field }).first()).toBeVisible()
  }
  const glossaryJson = page.getByTestId('glossary-json')
  await expect(glossaryJson).toContainText('"source_term": "Dashboard"')
  await expect(glossaryJson).toContainText('"do_not_translate": true')
  await expect(page.getByTestId('misses-json')).toContainText('"expected": "Panel"')
  await expect(page.getByTestId('style-guide-json')).toContainText('"tone": "friendly"')
})

test('the contents list jumps to a section below the sticky header', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/guide')
  await page.getByRole('navigation', { name: 'On this page' }).getByRole('link', { name: 'The style guide' }).click()
  await expect(page).toHaveURL(/#style-guide$/)
  const heading = page.getByRole('heading', { name: 'What the style guide is' })
  await expect(heading).toBeInViewport()
  const [headerBottom, headingTop] = await Promise.all([
    page.getByRole('banner').evaluate((el) => el.getBoundingClientRect().bottom),
    heading.evaluate((el) => el.getBoundingClientRect().top),
  ])
  expect(headingTop).toBeGreaterThanOrEqual(headerBottom)
})

test('a JSON block copies to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/guide')
  const button = page.getByRole('button', { name: 'Copy the glossary JSON' })
  await button.click()
  await expect(button).toHaveText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(JSON.parse(copied)).toEqual([
    { source_term: 'Dashboard', target_term: 'Panel', note: 'the home screen' },
    { source_term: 'LLM Translate', do_not_translate: true },
  ])
})

for (const [name, viewport] of sizes) {
  for (const theme of ['light', 'dark']) {
    test(`the guide fits a ${name} in the ${theme} theme, with readable text`, async ({ page }) => {
      await page.setViewportSize(viewport)
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
      await page.goto('/guide')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const fits = await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      )
      expect(fits).toBe(true)

      // WCAG relative luminance of every text node in main against the first opaque background
      // behind it. The page uses solid surfaces, so the walk up the tree is exact.
      const contrasts = await page.evaluate(() => {
        const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number)
        const lum = ([r, g, b]) => {
          const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const bg = (el) => {
          for (; el; el = el.parentElement) {
            const c = rgb(getComputedStyle(el).backgroundColor)
            if (c.length === 3 || c[3] === 1) return c.slice(0, 3)
          }
          return [255, 255, 255]
        }
        const out = []
        const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement
          if (!n.textContent.trim() || !el.checkVisibility()) continue
          const a = lum(rgb(getComputedStyle(el).color).slice(0, 3))
          const b = lum(bg(el))
          out.push({ text: n.textContent.trim().slice(0, 40), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) })
        }
        return out
      })
      expect(contrasts.length).toBeGreaterThan(20)
      for (const c of contrasts) expect(c.ratio, `${c.text} (${theme})`).toBeGreaterThanOrEqual(4.5)
    })
  }
}
