import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import gifenc from 'gifenc'
import { PNG } from 'pngjs'
import { gifFrameProblems } from './guards.js'

const { GIFEncoder, applyPalette, quantize } = gifenc

// Records docs/images/demo.gif from a running instance with real models (epic 07.2 AC7).
// The operator's recording step commits the GIF; this tooling only writes it, and only
// after the guards pass. Nothing is mocked: the page, the models and the answers are live.
const OUT = fileURLToPath(new URL('../../../docs/images/demo.gif', import.meta.url))
const SENTENCE = process.env.LIVE_SENTENCE ?? 'Our office is closed on Monday, but the online shop stays open.'
const FILE = fileURLToPath(new URL('./demo-file.json', import.meta.url))
const LIVE_MODEL_TIMEOUT_MS = 5 * 60 * 1000

// Clicks the button and waits for the live model's reply. A failed stream throws here,
// so the live config's retries re-record the session instead of waiting out the timeout.
async function liveReply(page, buttonName, path, what) {
  const reply = page.waitForResponse(
    (r) => r.url().endsWith(path) && r.request().method() === 'POST',
    { timeout: LIVE_MODEL_TIMEOUT_MS },
  )
  await page.getByRole('button', { name: buttonName }).click()
  const response = await reply
  if (!response.ok()) {
    const body = (await response.text()).slice(0, 200)
    throw new Error(`the live model stream failed while ${what}: HTTP ${response.status()} ${body}`)
  }
}

const pickLanguage = async (page, label, language) => {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: language, exact: true }).click()
}

test('records the README demo GIF from a live instance', async ({ page }) => {
  expect(page.viewportSize()).toEqual({ width: 1280, height: 800 })
  const frames = []
  const snap = async (delay) => frames.push({ png: await page.screenshot(), delay })
  const output = page.getByRole('textbox', { name: 'Translation' })
  const ready = async () => {
    await expect(page.locator('.thinking')).toHaveCount(0, { timeout: 30_000 })
    await expect(output).not.toHaveValue('')
    await expect(page.getByText('Translation ready.')).toBeVisible()
  }

  // 1. The page as a visitor finds it.
  await page.goto('/')
  await expect(page.getByRole('textbox', { name: 'Text to translate' })).toBeVisible()
  await snap(2000)

  // 2. The sentence, translated into Spanish.
  await pickLanguage(page, 'Translate From:', 'English')
  await pickLanguage(page, 'Translate To:', 'Spanish')
  await page.getByRole('textbox', { name: 'Text to translate' }).fill(SENTENCE)
  await snap(1500)
  await liveReply(page, 'Click to translate', '/v1/translate', 'translating into Spanish')
  await ready()
  await snap(4500)

  // 3. The same sentence, translated into French.
  await pickLanguage(page, 'Translate To:', 'French')
  await expect(page.getByRole('combobox', { name: 'Translate To:' })).toHaveText('French')
  await liveReply(page, 'Click to translate', '/v1/translate', 'translating into French')
  await ready()
  const french = await output.inputValue()
  await snap(4500)

  // 4. The glossary help popover.
  await page.getByText('Glossary and style guide').click()
  const help = page.getByRole('button', { name: 'Glossary help' })
  await help.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await help.click()
  const dialog = page.getByRole('dialog', { name: 'Glossary help' })
  await expect(dialog).toBeVisible()
  await snap(3500)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await page.getByText('Glossary and style guide').click()

  // 5. Swap: the French translation moves into the input, ready to translate back.
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('button', { name: 'Swap languages' }).click()
  await expect(page.getByRole('combobox', { name: 'Translate From:' })).toHaveText('French')
  await expect(page.getByRole('combobox', { name: 'Translate To:' })).toHaveText('English')
  await expect(page.getByRole('textbox', { name: 'Text to translate' })).toHaveValue(french)
  await snap(2500)

  // 6. File mode: an i18n JSON file, translated with a report.
  await page.getByRole('tab', { name: 'File' }).click()
  await page.getByLabel('Choose a file').setInputFiles(FILE)
  await expect(page.getByText('demo-file.json')).toBeVisible()
  await pickLanguage(page, 'Translate From:', 'English')
  await pickLanguage(page, 'Translate To:', 'Spanish')
  await snap(1500)
  await liveReply(page, 'Translate file', '/v1/translate/file', 'translating the file')
  const report = page.getByRole('region', { name: 'Report' })
  await expect(report).toBeVisible({ timeout: 30_000 })
  await expect(report.getByTestId('report-segments')).toHaveText('2')
  await snap(4000)

  // The guards see plain descriptors, the same ones the synthetic unit tests use.
  const descriptors = frames.map(({ png, delay }) => {
    const { width, height } = PNG.sync.read(png)
    return { width, height, delay }
  })
  const problems = gifFrameProblems(descriptors)
  if (problems.length) throw new Error(problems.join(' '))

  // Only now, with every guard passed, encode and write the GIF.
  const gif = GIFEncoder()
  for (const { png, delay } of frames) {
    const { data, width, height } = PNG.sync.read(png)
    const palette = quantize(data, 256)
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay })
  }
  gif.finish()
  writeFileSync(OUT, gif.bytes())
})
