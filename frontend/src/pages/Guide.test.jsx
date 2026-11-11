import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Guide from './Guide'
import examples from './guide-examples.json'
import { toRequestGlossary, toRequestStyleGuide } from '../services/translationOptions'

const renderGuide = () =>
  render(
    <MemoryRouter>
      <Guide />
    </MemoryRouter>,
  )

const json = (value) => JSON.stringify(value, null, 2)

// The page's contents list marks the section in view; jsdom has no IntersectionObserver.
let observers
class FakeIntersectionObserver {
  constructor(callback) {
    this.callback = callback
    this.observed = []
    this.disconnected = false
    observers.push(this)
  }
  observe(element) {
    this.observed.push(element)
  }
  disconnect() {
    this.disconnected = true
  }
}

let writeText

beforeEach(() => {
  observers = []
  globalThis.IntersectionObserver = FakeIntersectionObserver
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

afterEach(() => {
  delete globalThis.IntersectionObserver
  vi.restoreAllMocks()
})

describe('Guide', () => {
  it('names the page and links to each section', () => {
    renderGuide()
    expect(screen.getByRole('heading', { level: 1, name: 'Glossary and style guide' })).toBeInTheDocument()
    const contents = screen.getByRole('navigation', { name: 'On this page' })
    for (const [name, href] of [
      ['The glossary', '#glossary'],
      ['A worked example', '#example'],
      ['The style guide', '#style-guide'],
      ['Text and file mode', '#modes'],
    ]) {
      expect(within(contents).getByRole('link', { name })).toHaveAttribute('href', href)
    }
    for (const id of ['glossary', 'example', 'style-guide', 'modes']) {
      expect(document.getElementById(id)).toBeInTheDocument()
    }
  })

  it('documents the glossary fields the API takes, with their API names', () => {
    renderGuide()
    for (const field of examples.glossary.fields) {
      const row = screen.getByText(field.key, { selector: 'code' }).closest('div')
      expect(row).toHaveTextContent(field.label)
      expect(row).toHaveTextContent(field.summary)
      expect(row).toHaveTextContent(field.required)
    }
  })

  it('documents the style guide fields the API takes, with their API names', () => {
    renderGuide()
    for (const field of examples.styleGuide.fields) {
      const row = screen.getByText(field.key, { selector: 'code' }).closest('div')
      expect(row).toHaveTextContent(field.label)
      expect(row).toHaveTextContent(field.summary)
    }
    expect(screen.getByText(/every field is optional/i)).toBeInTheDocument()
  })

  it('shows the worked example as the rows a visitor types', () => {
    renderGuide()
    const example = examples.glossary.example
    expect(screen.getByText(example.text)).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'The example glossary rows' })
    for (const heading of ['Source term', 'Translation', 'Note', 'Keep as is']) {
      expect(within(table).getByRole('columnheader', { name: heading })).toBeInTheDocument()
    }
    expect(within(table).getAllByRole('row')).toHaveLength(example.rows.length + 1)
    expect(within(table).getByRole('cell', { name: 'Dashboard' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'Panel' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'the home screen' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'LLM Translate' })).toBeInTheDocument()
    expect(within(table).getByRole('cell', { name: 'Not needed' })).toBeInTheDocument()
    expect(within(table).getAllByRole('cell', { name: 'Yes' })).toHaveLength(1)
    expect(within(table).getAllByRole('cell', { name: 'No' })).toHaveLength(1)
  })

  it('shows the glossary, style guide and misses JSON exactly as the API takes them', () => {
    renderGuide()
    const example = examples.glossary.example
    expect(screen.getByTestId('glossary-json').textContent).toBe(json(example.request))
    expect(screen.getByTestId('style-guide-json').textContent).toBe(json(examples.styleGuide.example))
    expect(screen.getByTestId('misses-json').textContent).toBe(json(example.misses))
    expect(screen.getByText(example.translation)).toBeInTheDocument()
  })

  it('explains what glossary_misses means when a term is missing', () => {
    renderGuide()
    expect(screen.getByTestId('misses-json')).toBeInTheDocument()
    expect(screen.getByText(/never an error/i)).toBeInTheDocument()
    expect(screen.getAllByText(/case-insensitive/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/exactly as written/i).length).toBeGreaterThan(0)
  })

  it('says how the glossary and style guide apply to text and file mode', () => {
    renderGuide()
    const text = screen.getByRole('article', { name: 'Text mode' })
    expect(within(text).getByText(/saved in this browser/i)).toBeInTheDocument()
    expect(within(text).getByText(/\/v1\/translate/)).toBeInTheDocument()
    const file = screen.getByRole('article', { name: 'File mode' })
    expect(within(file).getByText(/does not take a glossary or style guide/i)).toBeInTheDocument()
    expect(within(file).getByText(/\/v1\/translate\/file/)).toBeInTheDocument()
    expect(within(file).getByText(/summarized first/i)).toBeInTheDocument()
  })

  it('links back to the translator and to the API docs', () => {
    renderGuide()
    expect(screen.getByRole('link', { name: 'Start translating' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /the HTTP API/i })).toHaveAttribute(
      'href',
      'https://github.com/samestrin/llm-translate/blob/main/docs/api.md',
    )
  })

  // The backend's test_guide_examples.py validates this same JSON with GlossaryEntry.
  it('maps the page’s example rows to the JSON the page shows', () => {
    renderGuide()
    const example = examples.glossary.example
    expect(toRequestGlossary(example.rows)).toEqual(example.request)
    expect(toRequestGlossary(example.rows)).toEqual(JSON.parse(screen.getByTestId('glossary-json').textContent))
    expect(toRequestStyleGuide(examples.styleGuide.example)).toEqual(
      JSON.parse(screen.getByTestId('style-guide-json').textContent),
    )
  })

  it('marks the section in view in the contents list', () => {
    renderGuide()
    const contents = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(contents).getByRole('link', { name: 'The glossary' })).toHaveAttribute('aria-current', 'location')
    const observer = observers[0]
    expect(observer.observed.map((element) => element.id)).toEqual(['glossary', 'example', 'style-guide', 'modes'])
    act(() => {
      observer.callback([
        { target: document.getElementById('glossary'), isIntersecting: false },
        { target: document.getElementById('style-guide'), isIntersecting: true },
      ])
    })
    expect(within(contents).getByRole('link', { name: 'The style guide' })).toHaveAttribute('aria-current', 'location')
    expect(within(contents).getByRole('link', { name: 'The glossary' })).not.toHaveAttribute('aria-current')
  })

  it('stops watching when the page unmounts', () => {
    const { unmount } = renderGuide()
    unmount()
    expect(observers[0].disconnected).toBe(true)
  })

  it('still lists the sections when the browser has no IntersectionObserver', () => {
    delete globalThis.IntersectionObserver
    renderGuide()
    const contents = screen.getByRole('navigation', { name: 'On this page' })
    expect(within(contents).getAllByRole('link')).toHaveLength(4)
    expect(within(contents).getByRole('link', { name: 'The glossary' })).toHaveAttribute('aria-current', 'location')
  })

  it('copies a JSON block to the clipboard and says so', async () => {
    renderGuide()
    const block = screen.getByTestId('glossary-json').closest('figure')
    fireEvent.click(screen.getByRole('button', { name: 'Copy the glossary JSON' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy the glossary JSON' })).toHaveTextContent('Copied'))
    expect(writeText).toHaveBeenCalledWith(json(examples.glossary.example.request))
    expect(within(block).getByRole('status')).toHaveTextContent('Copied the glossary JSON')
  })

  it('says when the clipboard refused the copy', async () => {
    writeText.mockRejectedValue(new Error('denied'))
    renderGuide()
    const block = screen.getByTestId('style-guide-json').closest('figure')
    fireEvent.click(screen.getByRole('button', { name: 'Copy the style guide JSON' }))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Copy the style guide JSON' })).toHaveTextContent('Copy failed'),
    )
    expect(within(block).getByRole('status')).toHaveTextContent('Could not copy the style guide JSON')
  })
})
