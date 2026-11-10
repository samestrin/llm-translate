import { test, expect } from '@playwright/test'

// The layout shell every page shares: skip link, landmarks, active link, focus ring,
// theme choice and contrast, at a phone and a desktop width.

const sizes = [
  ['phone', { width: 375, height: 812 }],
  ['desktop', { width: 1280, height: 900 }],
]

for (const [name, viewport] of sizes) {
  test.describe(`on a ${name}`, () => {
    test.use({ viewport })

    test('the first Tab reaches a visible skip link that moves focus to main', async ({ page }) => {
      await page.goto('/')
      await page.keyboard.press('Tab')
      const skip = page.getByRole('link', { name: 'Skip to content' })
      await expect(skip).toBeFocused()
      await expect(skip).toBeInViewport()
      await page.keyboard.press('Enter')
      await expect(page.getByRole('main')).toBeFocused()
    })

    test('the page has one banner, main and contentinfo and a named navigation', async ({ page }) => {
      await page.goto('/history')
      await expect(page.getByRole('banner')).toHaveCount(1)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('contentinfo')).toHaveCount(1)
      await expect(page.getByRole('navigation', { name: 'Footer' })).toHaveCount(1)
    })

    test('a focused control shows a focus ring', async ({ page }) => {
      await page.goto('/')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      const ring = await page.evaluate(() => {
        const s = getComputedStyle(document.activeElement)
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) }
      })
      expect(ring.style).not.toBe('none')
      expect(ring.width).toBeGreaterThanOrEqual(2)
    })
  })
}

test.describe('the main navigation', () => {
  test('marks the current page on a desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/history')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', /.*/)
  })

  test('opens from the menu button on a phone, marks the current page and closes on Escape', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/history')
    const button = page.getByRole('button', { name: 'Menu' })
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await button.click()
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    const nav = page.getByRole('navigation', { name: 'Main' })
    await expect(nav.getByRole('link', { name: 'History' })).toHaveAttribute('aria-current', 'page')
    await page.keyboard.press('Escape')
    await expect(button).toHaveAttribute('aria-expanded', 'false')
    await expect(button).toBeFocused()
    const fits = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    )
    expect(fits).toBe(true)
  })
})

test.describe('theme', () => {
  for (const scheme of ['light', 'dark']) {
    test(`a first visit follows the system ${scheme} scheme and stores nothing`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto('/')
      await expect(page.locator('html')).toHaveClass(scheme === 'dark' ? /dark/ : /^(?!.*dark).*$/)
      expect(await page.evaluate(() => localStorage.getItem('theme'))).toBeNull()
    })
  }

  test('the chosen theme survives a reload even when the system says otherwise', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await page.getByRole('button', { name: 'Switch to dark mode' }).first().click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark')
    await page.getByRole('button', { name: 'Switch to light mode' }).first().click()
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})

test('reduced motion turns transitions and animations off', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const longest = await page.evaluate(() =>
    Math.max(
      ...[...document.querySelectorAll('header *, footer *')].map((el) => {
        const s = getComputedStyle(el)
        return Math.max(parseFloat(s.transitionDuration) || 0, parseFloat(s.animationDuration) || 0)
      }),
    ),
  )
  expect(longest).toBeLessThan(0.01)
})

// WCAG relative luminance contrast of each text node in the shell against the first opaque
// background behind it. The shell uses solid backgrounds so the walk up the tree is exact.
const shellContrasts = (page) =>
  page.evaluate(() => {
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
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement
      if (!n.textContent.trim() || !el.closest('header, footer')) continue
      if (!el.checkVisibility()) continue
      const a = lum(rgb(getComputedStyle(el).color).slice(0, 3))
      const b = lum(bg(el))
      out.push({ text: n.textContent.trim(), ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) })
    }
    return out
  })

for (const theme of ['light', 'dark']) {
  test(`header and footer text meets 4.5:1 in the ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.addInitScript((t) => localStorage.setItem('theme', t), theme)
    await page.goto('/history')
    const results = await shellContrasts(page)
    expect(results.length).toBeGreaterThan(3)
    for (const r of results) expect(r.ratio, r.text).toBeGreaterThanOrEqual(4.5)
  })
}
