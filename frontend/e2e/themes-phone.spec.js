import { test, expect } from '@playwright/test'

const pages = ['/', '/history', '/about', '/terms', '/privacy', '/tts-info', '/llm-info', '/settings', '/no-such-page']

const viewports = [
  { width: 375, height: 812 },
  { width: 1280, height: 800 },
]

for (const viewport of viewports) {
for (const theme of ['light', 'dark']) {
  test.describe(`${theme} theme at ${viewport.width} px`, () => {
    test.use({ viewport })

    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
    })

    for (const path of pages) {
      test(`${path} has no horizontal scroll`, async ({ page }) => {
        await page.goto(path)
        await expect(page.locator('#root')).not.toBeEmpty()
        const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
        expect(isDark).toBe(theme === 'dark')
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }))
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
      })
    }
  })
}
}

test.use({ viewport: { width: 375, height: 812 } })

test('the toggle switches theme on a phone and the page still fits', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'))
  await page.goto('/')
  await page.getByRole('button', { name: 'Switch to dark mode' }).first().click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  const fits = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )
  expect(fits).toBe(true)
})
