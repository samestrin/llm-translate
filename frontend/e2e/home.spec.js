import { test, expect } from '@playwright/test'

test('home page loads and renders the app', async ({ page }) => {
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(page).toHaveTitle(/.+/)
  await expect(page.locator('#root')).not.toBeEmpty()
  expect(errors).toEqual([])
})
