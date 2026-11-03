import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'

const SOURCE = readFileSync(new URL('./fixtures/messages.json', import.meta.url), 'utf8')
const TRANSLATED = readFileSync(new URL('./fixtures/messages.es.json', import.meta.url), 'utf8')

const fileResponse = {
  content: TRANSLATED,
  format: 'json',
  from_lang: 'English',
  to_lang: 'Spanish',
  report: {
    segments: 2,
    model: 'gpt-4o-mini',
    usage: { prompt_tokens: 84, completion_tokens: 12, total_tokens: 96 },
  },
}

// Drops `messages.json` on the drop zone the way a browser does: a `drop` event carrying a DataTransfer.
const dropFile = async (page, target) => {
  const dataTransfer = await page.evaluateHandle((text) => {
    const dt = new DataTransfer()
    dt.items.add(new File([text], 'messages.json', { type: 'application/json' }))
    return dt
  }, SOURCE)
  await target.dispatchEvent('dragenter', { dataTransfer })
  await target.dispatchEvent('dragover', { dataTransfer })
  await target.dispatchEvent('drop', { dataTransfer })
}

const pickLanguage = async (page, label, language) => {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: language, exact: true }).click()
}

test('file mode: drop a JSON file, pick languages, see the report and download the translation', async ({ page }) => {
  const requests = []
  await page.route('**/v1/translate/file', async (route) => {
    const request = route.request()
    requests.push({ method: request.method(), body: request.postDataBuffer().toString('utf8') })
    await route.fulfill({ json: fileResponse })
  })

  await page.goto('/')
  await page.getByRole('tab', { name: 'File' }).click()

  await dropFile(page, page.getByTestId('file-drop-zone'))
  await expect(page.getByText('messages.json')).toBeVisible()

  await pickLanguage(page, 'Translate From:', 'English')
  await pickLanguage(page, 'Translate To:', 'Spanish')
  await page.getByRole('button', { name: 'Translate file' }).click()

  const report = page.getByRole('region', { name: 'Report' })
  await expect(report).toContainText('json')
  await expect(report.getByTestId('report-segments')).toHaveText('2')
  await expect(report.getByTestId('report-model')).toHaveText('gpt-4o-mini')
  await expect(report.getByTestId('report-tokens')).toHaveText('96 (84 prompt, 12 completion)')

  // One multipart POST with the file and both languages.
  expect(requests).toHaveLength(1)
  expect(requests[0].method).toBe('POST')
  expect(requests[0].body).toContain('filename="messages.json"')
  expect(requests[0].body).toContain(SOURCE)
  expect(requests[0].body).toMatch(/name="from_lang"\r\n\r\nEnglish\r\n/)
  expect(requests[0].body).toMatch(/name="to_lang"\r\n\r\nSpanish\r\n/)

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('messages.spanish.json')
  const path = await download.path()
  expect(readFileSync(path, 'utf8')).toBe(TRANSLATED)
})

test('file mode: a file chosen with the picker works too, and a failed segment is shown', async ({ page }) => {
  await page.route('**/v1/translate/file', (route) =>
    route.fulfill({
      status: 500,
      json: {
        error: {
          type: 'api_error',
          message: '1 of 2 segments failed, so the file was not translated',
          details: null,
          segment_errors: [
            { segment: 1, type: 'api_error', message: 'Segment /greeting: the translation did not keep its placeholders (missing {name}).' },
          ],
        },
      },
    }),
  )

  await page.goto('/')
  await page.getByRole('tab', { name: 'File' }).click()
  await page.getByLabel('Choose a file').setInputFiles({
    name: 'messages.json',
    mimeType: 'application/json',
    buffer: Buffer.from(SOURCE),
  })
  await page.getByRole('button', { name: 'Translate file' }).click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText('1 of 2 segments failed, so the file was not translated')
  await expect(alert).toContainText('Segment /greeting: the translation did not keep its placeholders (missing {name}).')
  await expect(page.getByRole('button', { name: 'Download' })).toHaveCount(0)
})
