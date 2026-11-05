import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ReviewReport from './ReviewReport'

const usage = (prompt, completion) => ({
  prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion,
})

const report = {
  flags: [
    { segment: '/greeting', reason: 'still wrong after revision: critical meaning error: the count is dropped' },
    { segment: '/farewell', reason: 'review could not be read' },
    { segment: '/menu/0', reason: 'still wrong after revision: major style error: too casual' },
  ],
  steps: [
    { step: 'translation', model: 'gpt-4o-mini', usage: usage(100, 20) },
    { step: 'back_translation', model: 'gpt-4o-mini', usage: usage(80, 25) },
    { step: 'review', model: 'o4-mini', usage: usage(150, 90) },
    { step: 'revision', model: 'o4-mini', usage: usage(60, 40) },
  ],
  usage: usage(390, 175),
}

const segments = {
  '/greeting': { source: 'Hello {name}, you have %d messages', translation: 'Hola {name}' },
  '/farewell': { source: 'Goodbye', translation: 'Adiós' },
}

describe('ReviewReport', () => {
  it('shows each flag with its severity and reason beside its source and translation', () => {
    render(<ReviewReport report={report} segments={segments} />)
    const flags = within(screen.getByRole('list', { name: 'Flagged segments' })).getAllByRole('listitem')
    expect(flags).toHaveLength(3)

    expect(within(flags[0]).getByText('/greeting')).toBeInTheDocument()
    expect(within(flags[0]).getByTestId('flag-severity')).toHaveTextContent('critical')
    expect(within(flags[0]).getByTestId('flag-reason')).toHaveTextContent(
      'still wrong after revision: critical meaning error: the count is dropped',
    )
    expect(within(flags[0]).getByTestId('flag-source')).toHaveTextContent('Hello {name}, you have %d messages')
    expect(within(flags[0]).getByTestId('flag-translation')).toHaveTextContent('Hola {name}')

    expect(within(flags[1]).getByTestId('flag-severity')).toHaveTextContent('not rated')
    expect(within(flags[2]).getByTestId('flag-severity')).toHaveTextContent('major')
  })

  it('says so when the source of a flagged segment is not known', () => {
    render(<ReviewReport report={report} segments={segments} />)
    const flags = within(screen.getByRole('list', { name: 'Flagged segments' })).getAllByRole('listitem')
    expect(within(flags[2]).getByTestId('flag-source')).toHaveTextContent('Not available for this segment')
    expect(within(flags[2]).queryByTestId('flag-translation')).toBeNull()
  })

  it('names a numbered segment', () => {
    render(<ReviewReport report={{ ...report, flags: [{ segment: 2, reason: 'review could not be read' }] }} segments={{}} />)
    expect(screen.getByText('Segment 2')).toBeInTheDocument()
  })

  it('shows the model and tokens of every step, and the total', () => {
    render(<ReviewReport report={report} segments={segments} />)
    const table = screen.getByRole('table', { name: 'Models and cost' })
    const rows = within(table).getAllByRole('row').slice(1).map((row) =>
      within(row).getAllByRole('cell').map((cell) => cell.textContent),
    )
    expect(rows).toEqual([
      ['Translation', 'gpt-4o-mini', '120 (100 prompt, 20 completion)'],
      ['Back-translation', 'gpt-4o-mini', '105 (80 prompt, 25 completion)'],
      ['Review', 'o4-mini', '240 (150 prompt, 90 completion)'],
      ['Revision', 'o4-mini', '100 (60 prompt, 40 completion)'],
      ['Total', '', '565 (390 prompt, 175 completion)'],
    ])
  })

  it('says no segment was flagged when there are no flags', () => {
    render(<ReviewReport report={{ ...report, flags: [] }} segments={{}} />)
    expect(screen.getByText('No segment was flagged.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Flagged segments' })).toBeNull()
  })

  it('shows "none" for a step no model answered', () => {
    render(<ReviewReport report={{ flags: [], steps: [{ step: 'translation', model: null, usage: usage(0, 0) }], usage: usage(0, 0) }} />)
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('none')
  })
})
