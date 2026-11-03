/* global Buffer */
import { test, expect } from '@playwright/test'

// 0.1 s of silence, 8 kHz mono 8-bit WAV: small enough to inline, valid enough for <audio>.
const wav = (() => {
  const data = 800
  const b = Buffer.alloc(44 + data, 0x80)
  b.write('RIFF', 0); b.writeUInt32LE(36 + data, 4); b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34)
  b.write('data', 36); b.writeUInt32LE(data, 40)
  return b
})()

test('a text translation is shown, spoken and saved to history', async ({ page }) => {
  const translateBodies = []
  const speakBodies = []
  await page.route('**/v1/translate', async (route) => {
    translateBodies.push(route.request().postDataJSON())
    await route.fulfill({
      json: {
        translation: '¡Hola, mundo!', from_lang: 'English', to_lang: 'Spanish', model: 'gpt-4o-mini',
        usage: { prompt_tokens: 42, completion_tokens: 6, total_tokens: 48 }, glossary_misses: [], cached: false,
      },
    })
  })
  await page.route('**/v1/speak', async (route) => {
    speakBodies.push(route.request().postDataJSON())
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: wav })
  })
  await page.addInitScript(() => {
    if (!localStorage.getItem('settings')) {
      localStorage.setItem('settings', JSON.stringify({ aiProvider: 'groq', historyEnabled: true, maxHistoryItems: 50 }))
    }
  })

  await page.goto('/')
  await page.getByPlaceholder('Enter text to translate...').fill('Hello, world!')
  await page.getByRole('button', { name: 'Click to translate' }).click()

  // Shown
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('¡Hola, mundo!')
  await expect(page.getByText('Translated with gpt-4o-mini')).toBeVisible()
  expect(translateBodies).toEqual([{ text: 'Hello, world!', from_lang: 'Auto-detect', to_lang: 'English' }])

  // Spoken
  await page.getByRole('button', { name: 'Listen to translation' }).click()
  await expect.poll(() => speakBodies.length).toBe(1)
  expect(speakBodies[0]).toMatchObject({ text: '¡Hola, mundo!', lang: 'English', response_format: 'mp3' })

  // Saved
  const history = await page.evaluate(() => JSON.parse(localStorage.getItem('translationHistory')))
  expect(history).toHaveLength(1)
  expect(history[0]).toMatchObject({ sourceText: 'Hello, world!', translatedText: '¡Hola, mundo!', model: 'gpt-4o-mini' })

  // ...and listed on the history page
  await page.goto('/history')
  await expect(page.getByText('¡Hola, mundo!').first()).toBeVisible()
})
