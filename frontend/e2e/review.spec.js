import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'

const SOURCE = readFileSync(new URL('./fixtures/messages.json', import.meta.url), 'utf8')
const TRANSLATED = readFileSync(new URL('./fixtures/messages.es.json', import.meta.url), 'utf8')

const usage = (prompt, completion) => ({
  prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion,
})

// The report epic 04 returns with `review=on` (README "The review pass"), one segment flagged.
const reviewReport = (flags) => ({
  flags,
  steps: [
    { step: 'translation', model: 'gpt-4o-mini', usage: usage(118, 14) },
    { step: 'back_translation', model: 'gpt-4o-mini', usage: usage(96, 30) },
    { step: 'review', model: 'o4-mini', usage: usage(180, 120) },
    { step: 'revision', model: 'o4-mini', usage: usage(66, 46) },
  ],
  usage: usage(460, 210),
})

const textResponse = (review) => ({
  translation: 'Abra el tablero.',
  from_lang: 'English',
  to_lang: 'Spanish',
  model: 'gpt-4o-mini',
  usage: review ? usage(460, 210) : usage(118, 14),
  glossary_misses: [],
  cached: false,
  ...(review && {
    review: reviewReport([
      {
        segment: 1,
        reason: 'still wrong after revision: major meaning error: "open" rendered as "abrir" loses the UI-imperative sense',
        severity: 'major',
        source: 'Open the dashboard.',
        translation: 'Abra el tablero.',
      },
    ]),
  }),
})

const pickLanguage = async (page, label, language) => {
  await page.getByRole('combobox', { name: label }).first().click()
  await page.getByRole('option', { name: language, exact: true }).click()
}

test('text mode: review is off by default; switched on, it sends review=on and shows the flag beside the source', async ({ page }) => {
  const bodies = []
  await page.route('**/v1/translate', async (route) => {
    const body = route.request().postDataJSON()
    bodies.push(body)
    await route.fulfill({ json: textResponse(body.review === 'on') })
  })

  await page.goto('/')
  const reviewSwitch = page.getByLabel('Review the translation')
  await expect(reviewSwitch).not.toBeChecked()

  await pickLanguage(page, 'Translate From:', 'English')
  await page.getByPlaceholder('Enter text to translate...').fill('Open the dashboard.')
  await page.getByRole('button', { name: 'Click to translate' }).click()
  await expect(page.getByPlaceholder('Translation will appear here...')).toHaveValue('Abra el tablero.')
  expect(bodies[0]).not.toHaveProperty('review')
  await expect(page.getByRole('region', { name: 'Review', exact: true })).toHaveCount(0)

  await reviewSwitch.check()
  await page.getByRole('button', { name: 'Click to translate' }).click()

  const review = page.getByRole('region', { name: 'Review', exact: true })
  const flag = review.getByRole('list', { name: 'Flagged segments' }).getByRole('listitem')
  await expect(flag).toHaveCount(1)
  await expect(flag.getByText('Segment 1')).toBeVisible()
  await expect(flag.getByTestId('flag-severity')).toHaveText('major')
  await expect(flag.getByTestId('flag-reason')).toHaveText(
    'still wrong after revision: major meaning error: "open" rendered as "abrir" loses the UI-imperative sense',
  )
  await expect(flag.getByTestId('flag-source')).toHaveText('Open the dashboard.')
  await expect(flag.getByTestId('flag-translation')).toHaveText('Abra el tablero.')

  // Source and translation sit side by side on a desktop screen.
  const source = await flag.getByTestId('flag-source').boundingBox()
  const translation = await flag.getByTestId('flag-translation').boundingBox()
  expect(translation.x).toBeGreaterThan(source.x + source.width - 1)
  expect(Math.abs(translation.y - source.y)).toBeLessThan(5)

  const cost = review.getByRole('table', { name: 'Models and cost' })
  await expect(cost.getByRole('row', { name: /Review/ })).toContainText('o4-mini')
  await expect(cost.getByRole('row', { name: /Back-translation/ })).toContainText('126 (96 prompt, 30 completion)')
  await expect(cost.getByRole('row', { name: /Total/ })).toContainText('670 (460 prompt, 210 completion)')

  expect(bodies).toHaveLength(2)
  expect(bodies[1].review).toBe('on')
})

test('file mode: review=on goes in the form, and a flagged key shows its source and translated value', async ({ page }) => {
  const forms = []
  await page.route('**/v1/translate/file', async (route) => {
    forms.push(route.request().postDataBuffer().toString('utf8'))
    await route.fulfill({
      json: {
        content: TRANSLATED,
        format: 'json',
        from_lang: 'English',
        to_lang: 'Spanish',
        report: {
          segments: 2,
          model: 'gpt-4o-mini',
          usage: usage(460, 210),
          review: reviewReport([
            {
              segment: '/greeting',
              reason: 'still wrong after revision: critical format error: %d was moved',
              severity: 'critical',
              source: 'Hello {name}, you have %d messages',
              translation: 'Hola {name}, tienes %d mensajes',
            },
          ]),
        },
      },
    })
  })

  await page.goto('/')
  await page.getByLabel('Review the translation').check()
  await page.getByRole('tab', { name: 'File' }).click()
  await expect(page.getByLabel('Review the translation')).toBeChecked()

  await page.getByLabel('Choose a file').setInputFiles({
    name: 'messages.json', mimeType: 'application/json', buffer: Buffer.from(SOURCE),
  })
  await pickLanguage(page, 'Translate From:', 'English')
  await pickLanguage(page, 'Translate To:', 'Spanish')
  await page.getByRole('button', { name: 'Translate file' }).click()

  const review = page.getByRole('region', { name: 'Review', exact: true })
  const flag = review.getByRole('list', { name: 'Flagged segments' }).getByRole('listitem')
  await expect(flag).toHaveCount(1)
  await expect(flag.getByText('/greeting')).toBeVisible()
  await expect(flag.getByTestId('flag-severity')).toHaveText('critical')
  await expect(flag.getByTestId('flag-reason')).toHaveText('still wrong after revision: critical format error: %d was moved')
  await expect(flag.getByTestId('flag-source')).toHaveText('Hello {name}, you have %d messages')
  await expect(flag.getByTestId('flag-translation')).toHaveText('Hola {name}, tienes %d mensajes')
  await expect(review.getByRole('table', { name: 'Models and cost' })).toContainText('o4-mini')

  expect(forms).toHaveLength(1)
  expect(forms[0]).toMatch(/name="review"\r\n\r\non\r\n/)
})

test('file mode: a flag in a YAML file shows its reason beside its source and translation', async ({ page }) => {
  await page.route('**/v1/translate/file', (route) =>
    route.fulfill({
      json: {
        content: 'greeting: Hola\n',
        format: 'yaml',
        from_lang: 'English',
        to_lang: 'Spanish',
        report: {
          segments: 1,
          model: 'gpt-4o-mini',
          usage: usage(460, 210),
          review: reviewReport([
            { segment: '/greeting', reason: 'review could not be read', severity: null, source: 'Hello', translation: 'Hola' },
          ]),
        },
      },
    }),
  )

  await page.goto('/')
  await page.getByLabel('Review the translation').check()
  await page.getByRole('tab', { name: 'File' }).click()
  await page.getByLabel('Choose a file').setInputFiles({
    name: 'messages.yaml', mimeType: 'application/yaml', buffer: Buffer.from('greeting: Hello\n'),
  })
  await page.getByRole('button', { name: 'Translate file' }).click()

  const flag = page.getByRole('region', { name: 'Review', exact: true })
    .getByRole('list', { name: 'Flagged segments' }).getByRole('listitem')
  await expect(flag).toHaveCount(1)
  await expect(flag.getByText('/greeting')).toBeVisible()
  await expect(flag.getByTestId('flag-severity')).toHaveText('not rated')
  await expect(flag.getByTestId('flag-reason')).toHaveText('review could not be read')
  await expect(flag.getByTestId('flag-source')).toHaveText('Hello')
  await expect(flag.getByTestId('flag-translation')).toHaveText('Hola')
})

test('text mode: a flag shows the source of the server\'s own split, whatever its segment size', async ({ page }) => {
  // A server with a small LLM_SEGMENT_MAX_CHARS splits this short text in two; the page does not re-split it.
  const text = 'Open the dashboard.\n\nClose the menu.'
  await page.route('**/v1/translate', (route) =>
    route.fulfill({
      json: {
        ...textResponse(true),
        translation: 'Abra el tablero.\n\nCierre el menú.',
        review: reviewReport([
          { segment: 2, reason: 'review could not be read', severity: null, source: 'Close the menu.', translation: 'Cierre el menú.' },
        ]),
      },
    }),
  )

  await page.goto('/')
  await page.getByLabel('Review the translation').check()
  await pickLanguage(page, 'Translate From:', 'English')
  await page.getByPlaceholder('Enter text to translate...').fill(text)
  await page.getByRole('button', { name: 'Click to translate' }).click()

  const flag = page.getByRole('region', { name: 'Review', exact: true })
    .getByRole('list', { name: 'Flagged segments' }).getByRole('listitem')
  await expect(flag.getByText('Segment 2')).toBeVisible()
  await expect(flag.getByTestId('flag-source')).toHaveText('Close the menu.')
  await expect(flag.getByTestId('flag-translation')).toHaveText('Cierre el menú.')
})
