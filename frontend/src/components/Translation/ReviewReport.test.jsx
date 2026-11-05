import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import ReviewReport from './ReviewReport'

const usage = (prompt, completion) => ({
  prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion,
})

// A flag as the backend sends it: severity, source and translation come with it.
const flag = (segment, reason, severity, source, translation) => ({ segment, reason, severity, source, translation })

const report = {
  flags: [
    flag('/greeting', 'still wrong after revision: critical meaning error: the count is dropped', 'critical',
      'Hello {name}, you have %d messages', 'Hola {name}'),
    flag('/farewell', 'review could not be read', null, 'Goodbye', 'Adiós'),
    flag('/menu/0', 'still wrong after revision: major style error: too casual', 'major', 'Open', 'Abre'),
  ],
  steps: [
    { step: 'translation', model: 'gpt-4o-mini', usage: usage(100, 20) },
    { step: 'back_translation', model: 'gpt-4o-mini', usage: usage(80, 25) },
    { step: 'review', model: 'o4-mini', usage: usage(150, 90) },
    { step: 'revision', model: 'o4-mini', usage: usage(60, 40) },
  ],
  usage: usage(390, 175),
}

describe('ReviewReport', () => {
  it('shows each flag with its severity and reason beside its source and translation', () => {
    render(<ReviewReport report={report} />)
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

  it('shows the source and translation of every flag, whatever the file format', () => {
    render(<ReviewReport report={report} />)
    const flags = within(screen.getByRole('list', { name: 'Flagged segments' })).getAllByRole('listitem')
    expect(flags.map((item) => within(item).getByTestId('flag-source').textContent))
      .toEqual(['Hello {name}, you have %d messages', 'Goodbye', 'Open'])
    expect(flags.map((item) => within(item).getByTestId('flag-translation').textContent))
      .toEqual(['Hola {name}', 'Adiós', 'Abre'])
  })

  it('takes the severity from the flag, not from the words of its reason', () => {
    const reason = 'still wrong after revision: major meaning error: the critical warning is softened'
    render(<ReviewReport report={{ ...report, flags: [flag(1, reason, 'minor', 'a', 'b')] }} />)
    expect(screen.getByTestId('flag-severity')).toHaveTextContent('minor')
  })

  it('names a numbered segment', () => {
    render(<ReviewReport report={{ ...report, flags: [flag(2, 'review could not be read', null, 'Hi', 'Hola')] }} />)
    expect(screen.getByText('Segment 2')).toBeInTheDocument()
  })

  it('shows the model and tokens of every step, and the total', () => {
    render(<ReviewReport report={report} />)
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
    render(<ReviewReport report={{ ...report, flags: [] }} />)
    expect(screen.getByText('No segment was flagged.')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Flagged segments' })).toBeNull()
  })

  it('shows "none" for a step no model answered', () => {
    render(<ReviewReport report={{ flags: [], steps: [{ step: 'translation', model: null, usage: usage(0, 0) }], usage: usage(0, 0) }} />)
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('none')
  })
})
