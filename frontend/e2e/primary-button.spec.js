import { test, expect } from '@playwright/test'

// The primary action is the shell's filled accent 42 px button; small buttons are 32 px, 44 px on a phone.

const routeHealth = (page) =>
  page.route((url) => url.port === '8000' && url.pathname === '/',
    (route) => route.fulfill({ json: { message: 'llm-translate is running' } }))

// A CSS variable resolved to the computed colour the browser paints.
const tokenColor = (page, name) => page.evaluate((n) => {
  const probe = document.createElement('div')
  probe.style.backgroundColor = `var(${n})`
  document.body.append(probe)
  const value = getComputedStyle(probe).backgroundColor
  probe.remove()
  return value
}, name)

const look = (locator) => locator.evaluate((el) => {
  const s = getComputedStyle(el)
  return { bg: s.backgroundColor, height: el.getBoundingClientRect().height, fontSize: s.fontSize, cursor: s.cursor }
})

test.beforeEach(async ({ page }) => {
  await routeHealth(page)
})

for (const scheme of ['light', 'dark']) {
  test(`the Translate button is the filled accent at 42 px, and neutral when disabled (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme })
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/')
    const primary = await tokenColor(page, '--color-primary')
    const disabled = await tokenColor(page, '--color-disabled')
    expect(primary).not.toBe(disabled)

    const off = page.getByRole('button', { name: 'No text to translate' })
    await expect(off).toBeDisabled()
    expect(await look(off)).toEqual({ bg: disabled, height: 42, fontSize: '16px', cursor: 'not-allowed' })

    await page.getByRole('textbox', { name: 'Text to translate' }).fill('Hello')
    const on = page.getByRole('button', { name: 'Click to translate' })
    await expect(on).toBeEnabled()
    expect(await look(on)).toEqual({ bg: primary, height: 42, fontSize: '16px', cursor: 'pointer' })
  })
}

for (const [width, height] of [[1280, 32], [375, 44]]) {
  test(`small buttons are ${height} px at ${width} px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.goto('/')
    // Native `.button.small`: the theme toggle in the header.
    const toggle = page.locator('header .theme-toggle')
    expect(await toggle.evaluate((el) => el.getBoundingClientRect().height)).toBe(height)
    // MUI `size="small"`: Choose a file.
    await page.getByRole('tab', { name: 'File' }).click()
    const choose = page.getByText('Choose a file', { exact: true })
    expect(await look(choose)).toMatchObject({ height, fontSize: '14px' })
    // The swap control is an IconButton and stays 40 px.
    await page.getByRole('tab', { name: 'Text' }).click()
    expect(await page.getByRole('button', { name: 'Swap languages' }).evaluate((el) => el.getBoundingClientRect().height)).toBe(40)
  })
}
