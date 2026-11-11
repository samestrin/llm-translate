/* global Buffer */
import { test, expect } from '@playwright/test'

// The owner's repro (epic 07.1, 2026-11-11): translate into Hebrew, Speak, translate the
// same sentence into French, Speak -- the Hebrew audio played again. Each translation
// must get its own audio: a new /v1/speak request and a new blob URL on the player.

// Silence as 8 kHz mono 8-bit WAV, valid for <audio>; the duration differs per text so
// the two responses are distinguishable and the first is still playing when French lands.
const wav = (seconds) => {
  const data = 8000 * seconds
  const b = Buffer.alloc(44 + data, 0x80)
  b.write('RIFF', 0); b.writeUInt32LE(36 + data, 4); b.write('WAVEfmt ', 8)
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22)
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(8000, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34)
  b.write('data', 36); b.writeUInt32LE(data, 40)
  return b
}

const TRANSLATIONS = { Hebrew: 'שלום', French: 'Bonjour' }

// Home renders the player as a hidden <audio> bound to the hook's ref and audioUrl.
const playerSrc = (page) => page.evaluate(() => document.querySelector('audio').src)
const playerPaused = (page) => page.evaluate(() => document.querySelector('audio').paused)

test('Speak plays the current translation: Hebrew then French, each with its own audio', async ({ page }) => {
  const speakBodies = []
  await page.route('**/v1/translate', async (route) => {
    const body = route.request().postDataJSON()
    await route.fulfill({
      json: {
        translation: TRANSLATIONS[body.to_lang] ?? body.text, from_lang: 'English', to_lang: body.to_lang,
        model: 'gpt-4o-mini', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        glossary_misses: [], cached: false,
      },
    })
  })
  await page.route('**/v1/speak', async (route) => {
    const body = route.request().postDataJSON()
    speakBodies.push(body)
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: wav(body.text === TRANSLATIONS.Hebrew ? 5 : 3) })
  })

  // Record every revoked object URL from inside the page.
  await page.addInitScript(() => {
    window.__revokedUrls = []
    const nativeRevoke = URL.revokeObjectURL.bind(URL)
    URL.revokeObjectURL = (url) => { window.__revokedUrls.push(url); nativeRevoke(url) }
  })

  await page.goto('/')
  await page.getByPlaceholder('Enter text to translate...').fill('Hello')
  await page.getByRole('combobox', { name: 'Translate To:' }).click()
  await page.getByRole('option', { name: 'Hebrew', exact: true }).click()
  await page.getByRole('button', { name: 'Click to translate' }).click()
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('שלום')

  // Speak the Hebrew: request 1 is for the Hebrew text, and the player loads its URL.
  await page.getByRole('button', { name: 'Listen to translation' }).click()
  await expect.poll(() => speakBodies.length).toBe(1)
  expect(speakBodies[0]).toMatchObject({ text: 'שלום', lang: 'Hebrew', response_format: 'mp3' })
  await expect.poll(() => playerSrc(page)).toMatch(/^blob:/)
  const hebrewSrc = await playerSrc(page)
  await expect.poll(() => playerPaused(page)).toBe(false)

  // The first Speak opens the "About speech" notice; dismiss it to reach the pickers.
  await page.getByRole('button', { name: 'Close dialog' }).click()

  // Translate the same sentence into French: the Hebrew audio must stop and its URL go.
  await page.getByRole('combobox', { name: 'Translate To:' }).click()
  await page.getByRole('option', { name: 'French', exact: true }).click()
  await page.getByRole('button', { name: 'Click to translate' }).click()
  await expect(page.locator('textarea:not([aria-hidden])').last()).toHaveValue('Bonjour')
  await expect.poll(() => playerPaused(page)).toBe(true)
  expect(await page.evaluate(() => window.__revokedUrls)).toContain(hebrewSrc)

  // Speak again: request 2 is for the French text, and the player's src is the new URL.
  // (On the 07 code the button still said "Playing audio" here and no request went out.)
  await page.getByRole('button', { name: 'Listen to translation' }).click()
  await expect.poll(() => speakBodies.length).toBe(2)
  expect(speakBodies[1]).toMatchObject({ text: 'Bonjour', lang: 'French', response_format: 'mp3' })
  // Wait for the new URL itself: right after the click the src is still empty, and
  // "not the old URL" would pass on that intermediate state.
  await expect.poll(async () => {
    const src = await playerSrc(page)
    return src.startsWith('blob:') && src !== hebrewSrc
  }).toBe(true)
})
