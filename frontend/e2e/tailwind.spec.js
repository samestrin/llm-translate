import { test, expect } from '@playwright/test'

// The built stylesheet must carry the Tailwind utilities the components use:
// responsive variants, the theme colors from tailwind.config.js and dark: variants.

test('the built CSS contains a responsive rule', async ({ page, request }) => {
  await page.goto('/')
  const hrefs = await page.$$eval('link[rel="stylesheet"]', (links) => links.map((l) => l.href))
  expect(hrefs.length).toBeGreaterThan(0)
  const css = (await Promise.all(hrefs.map(async (h) => (await request.get(h)).text()))).join('\n')
  expect(css).toMatch(/@media[^{]*(min-width:\s*40rem|width>=40rem)[^{]*\{[^}]*\.sm\\:grid-cols-2/)
})

test('sm:grid-cols-2 lays the style guide out in two columns on a wide screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/')
  const styleGuide = page.locator('fieldset', { has: page.locator('legend', { hasText: 'Style guide' }) })
  const columns = await styleGuide.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(2)
})

test('sm:grid-cols-2 stays one column on a 375 px phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  const styleGuide = page.locator('fieldset', { has: page.locator('legend', { hasText: 'Style guide' }) })
  const columns = await styleGuide.evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(1)
})

for (const [theme, color] of [
  ['light', 'rgb(30, 41, 59)'], // secondary-800
  ['dark', 'rgb(226, 232, 240)'], // secondary-200
]) {
  test(`the heading uses the configured secondary color in the ${theme} theme`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
    await page.goto('/')
    const heading = page.getByRole('heading', { level: 1, name: 'Translate' })
    await expect(heading).toHaveCSS('color', color)
  })
}
