import { test, expect } from '@playwright/test'

// T3 (epic 07.1): the "?" help popovers beside Glossary and Style guide.
// The Done-when check: at 375 px the open popover sits inside the viewport.

const routeHealth = (page) =>
  page.route((url) => url.port === '8000' && url.pathname === '/',
    (route) => route.fulfill({ json: { message: 'llm-translate is running' } }))

const openOptions = async (page) => {
  await page.goto('/')
  await page.getByText('Glossary and style guide').click()
}

// Put the help button mid-screen, where a reader who scrolled to the panel sees it.
const centerOn = (locator) => locator.evaluate((el) => el.scrollIntoView({ block: 'center' }))

const expectInsideViewport = async (dialog, viewport) => {
  const box = await dialog.boundingBox()
  expect(box).not.toBeNull()
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
}

test.beforeEach(async ({ page }) => {
  await routeHealth(page)
})

for (const field of ['Glossary', 'Style guide']) {
  test(`the ${field} help popover stays inside a 375 px viewport and closes on Escape`, async ({ page }) => {
    const viewport = { width: 375, height: 667 }
    await page.setViewportSize(viewport)
    await openOptions(page)

    const button = page.getByRole('button', { name: `${field} help` })
    await centerOn(button)
    await button.click()

    const dialog = page.getByRole('dialog', { name: `${field} help` })
    await expect(dialog).toBeVisible()
    await expectInsideViewport(dialog, viewport)
    await expect(dialog.getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guide')

    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(button).toBeFocused()
  })
}

test('the Glossary help opens on Enter and fits a 375 px viewport in dark mode', async ({ page }) => {
  const viewport = { width: 375, height: 667 }
  await page.setViewportSize(viewport)
  await page.emulateMedia({ colorScheme: 'dark' })
  await openOptions(page)

  const button = page.getByRole('button', { name: 'Glossary help' })
  await centerOn(button)
  await button.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Glossary help' })
  await expect(dialog).toBeVisible()
  await expectInsideViewport(dialog, viewport)
})

test('the Style guide help fits beside the field at 1280 px', async ({ page }) => {
  const viewport = { width: 1280, height: 800 }
  await page.setViewportSize(viewport)
  await openOptions(page)

  const button = page.getByRole('button', { name: 'Style guide help' })
  await centerOn(button)
  await button.click()
  const dialog = page.getByRole('dialog', { name: 'Style guide help' })
  await expect(dialog).toBeVisible()
  await expectInsideViewport(dialog, viewport)
})
