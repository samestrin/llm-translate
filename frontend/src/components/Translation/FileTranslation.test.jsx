import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { http } from '../../services/api'
import { translatedFileName } from '../../utils/helpers'
import FileTranslation from './FileTranslation'

describe('translatedFileName', () => {
  it.each([
    ['messages.json', 'Spanish', 'messages.spanish.json'],
    ['docs/guide.v2.md', 'French', 'docs/guide.v2.french.md'],
    ['README', 'German', 'README.german'],
    ['.env', 'Italian', '.env.italian'],
    ['subs.srt', 'Brazilian Portuguese', 'subs.brazilian-portuguese.srt'],
  ])('%s to %s is %s', (name, lang, expected) => {
    expect(translatedFileName(name, lang)).toBe(expected)
  })
})

describe('FileTranslation', () => {
  let originalAdapter

  beforeEach(() => {
    originalAdapter = http.defaults.adapter
  })

  afterEach(() => {
    http.defaults.adapter = originalAdapter
  })

  const renderIt = () =>
    render(<FileTranslation sourceLang="English" setSourceLang={() => {}} targetLang="Spanish" setTargetLang={() => {}} />)

  it('cannot translate before a file is chosen', () => {
    renderIt()
    expect(screen.getByRole('button', { name: 'Translate file' })).toBeDisabled()
  })

  it('shows an error that has no segment list, and no download', async () => {
    http.defaults.adapter = async () => {
      throw Object.assign(new Error('Network Error'), { isAxiosError: true })
    }
    renderIt()
    fireEvent.change(screen.getByLabelText('Choose a file'), {
      target: { files: [new File(['{"a": "b"}'], 'a.json', { type: 'application/json' })] },
    })
    expect(screen.getByText('a.json')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Network Error')
    expect(screen.queryByRole('listitem')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Download' })).toBeNull()
  })

  it('shows "none" for the model when no model was called', async () => {
    http.defaults.adapter = async (config) => ({
      data: {
        content: '{"a": "b"}', format: 'json', from_lang: 'English', to_lang: 'English',
        report: { segments: 1, model: null, usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 } },
      },
      status: 200, statusText: 'OK', headers: {}, config,
    })
    renderIt()
    fireEvent.drop(screen.getByTestId('file-drop-zone'), {
      dataTransfer: { files: [new File(['{"a": "b"}'], 'a.json')] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Translate file' }))

    expect(await screen.findByTestId('report-model')).toHaveTextContent('none (no model was called)')
    expect(screen.getByTestId('report-tokens')).toHaveTextContent('0 (0 prompt, 0 completion)')
  })
})
