import { test, expect } from '@playwright/test'

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }

test('the glossary and style guide reach the request, a miss is shown, and both are kept on reload', async ({ page }) => {
  const bodies = []
  await page.route('**/v1/translate', async (route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    bodies.push(request.postDataJSON())
    await route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'application/json',
      body: JSON.stringify({
        translation: 'Abre el tablero de LLM Translate.',
        from_lang: 'English',
        to_lang: 'Spanish',
        model: 'gpt-4o-mini',
        usage: { prompt_tokens: 118, completion_tokens: 14, total_tokens: 132 },
        glossary_misses: [{ term: 'Dashboard', expected: 'Panel' }],
        cached: false,
      }),
    })
  })

  await page.goto('/')
  await page.getByText('Glossary and style guide').click()

  await page.getByRole('button', { name: 'Add term' }).click()
  await page.getByLabel('Source term 1').fill('Dashboard')
  await page.getByLabel('Translation 1').fill('Panel')
  await page.getByRole('button', { name: 'Add term' }).click()
  await page.getByLabel('Source term 2').fill('LLM Translate')
  await page.getByLabel('Keep term 2 as is').check()
  await page.getByLabel('Tone').fill('friendly')
  await page.getByLabel('Notes').fill('Address the reader as tú.')

  await page.getByPlaceholder('Enter text to translate...').fill('Open the Dashboard in LLM Translate.')
  await page.getByRole('button', { name: 'Click to translate' }).click()

  const misses = page.getByRole('list', { name: 'Glossary terms missing from the translation' })
  await expect(misses).toContainText('Dashboard')
  await expect(misses).toContainText('Panel')

  expect(bodies).toHaveLength(1)
  expect(bodies[0].glossary).toEqual([
    { source_term: 'Dashboard', target_term: 'Panel' },
    { source_term: 'LLM Translate', do_not_translate: true },
  ])
  expect(bodies[0].style_guide).toEqual({ tone: 'friendly', notes: 'Address the reader as tú.' })

  await page.reload()
  await page.getByText('Glossary and style guide').click()
  await expect(page.getByLabel('Source term 1')).toHaveValue('Dashboard')
  await expect(page.getByLabel('Translation 1')).toHaveValue('Panel')
  await expect(page.getByLabel('Keep term 2 as is')).toBeChecked()
  await expect(page.getByLabel('Tone')).toHaveValue('friendly')
})
