// Captures docs/images/translation-page.png (light), translation-page-dark.png and translation-page-phone.png: the built page, translating through the real backend whose
// model endpoint is the fake OpenAI server (backend/scripts/serve_fake.py), so no key is ever on screen.
// Run from frontend/ with the backend's Python dependencies installed: `node scripts/screenshot.mjs`
// (set PYTHON to pick the interpreter). Needs `npx playwright install chromium` once.
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { chromium } from '@playwright/test'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const images = path.resolve(frontend, '../docs/images')
const shots = [
  { file: 'translation-page.png', viewport: { width: 1200, height: 800 }, colorScheme: 'light' },
  { file: 'translation-page-dark.png', viewport: { width: 1200, height: 800 }, colorScheme: 'dark' },
  { file: 'translation-page-phone.png', viewport: { width: 375, height: 1500 }, colorScheme: 'light' },
]
const python = process.env.PYTHON || 'python3'

async function waitFor(url, what) {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(url)).ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`${what} did not start at ${url}`)
}

const build = spawnSync('npm', ['run', 'build'], { cwd: frontend, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)

const children = [
  spawn(python, ['scripts/serve_fake.py'], { cwd: path.resolve(frontend, '../backend'), stdio: 'inherit' }),
  spawn('npm', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { cwd: frontend, stdio: 'ignore' }),
]
let browser
try {
  await waitFor('http://127.0.0.1:8000/', 'the backend')
  await waitFor('http://127.0.0.1:4173/', 'the preview server')
  browser = await chromium.launch()
for (const shot of shots) {
  const context = await browser.newContext({ viewport: shot.viewport, colorScheme: shot.colorScheme })
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('settings', JSON.stringify({ aiProvider: 'groq', historyEnabled: true, maxHistoryItems: 50 }))
  })
  await page.goto('http://127.0.0.1:4173/')
  for (const [label, language] of [['Translate From:', 'English'], ['Translate To:', 'Spanish']]) {
    await page.getByRole('combobox', { name: label }).click()
    await page.getByRole('option', { name: language, exact: true }).click()
  }
  await page.getByPlaceholder('Enter text to translate...').fill('Open the dashboard to see your translation history.')
  await page.getByRole('button', { name: 'Click to translate' }).click()
  await page.getByText('Translated with demo-model').waitFor()
  await page.evaluate(() => window.scrollTo(0, 0))
  const out = path.join(images, shot.file)
  await page.screenshot({ path: out })
  console.log(`Wrote ${out}`)
  await context.close()
}
} finally {
  await browser?.close()
  children.forEach((c) => c.kill())
}
