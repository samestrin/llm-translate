import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import Modal from './Modal'
import Spinner from './Spinner'
import ErrorMessage from './ErrorMessage'
import { Tooltip } from './Tooltip'
import ToastProvider from './ToastProvider'

describe('Modal', () => {
  const Harness = ({ onClose = () => {}, ...props }) => (
    <>
      <button type="button">opener</button>
      <Modal isOpen onClose={onClose} title="Delete item" description="This cannot be undone" {...props}>
        <a href="#x">inside link</a>
      </Modal>
    </>
  )

  it('renders nothing while closed', () => {
    render(<Modal isOpen={false} onClose={() => {}} title="Hidden" />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('is a labelled, described modal dialog that focuses its close button', () => {
    render(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'Delete item' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('This cannot be undone')
    expect(screen.getByRole('button', { name: 'Close dialog' })).toHaveFocus()
  })

  it('closes on Escape, the close button and the backdrop, but not on a click inside', () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }))
    fireEvent.mouseDown(screen.getByTestId('modal-backdrop'))
    fireEvent.mouseDown(screen.getByRole('dialog'))
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('keeps Tab inside the dialog in both directions', () => {
    render(<Harness primaryButtonText="Delete" primaryButtonAction={() => {}} secondaryButtonText="Cancel" />)
    const close = screen.getByRole('button', { name: 'Close dialog' })
    const last = screen.getByRole('button', { name: 'Delete' })
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(last).toHaveFocus()
    screen.getByRole('link', { name: 'inside link' }).focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('link', { name: 'inside link' })).toHaveFocus()
  })

  it('runs the primary and secondary actions; secondary defaults to close', () => {
    const onClose = vi.fn()
    const primary = vi.fn()
    render(
      <Harness
        onClose={onClose}
        primaryButtonText="Delete"
        primaryButtonAction={primary}
        primaryButtonProps={{ disabled: false }}
        secondaryButtonText="Cancel"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(primary).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('returns focus to the element that opened it', () => {
    const { rerender } = render(
      <>
        <button type="button">opener</button>
        <Modal isOpen={false} onClose={() => {}} title="t" />
      </>,
    )
    const opener = screen.getByRole('button', { name: 'opener' })
    opener.focus()
    rerender(
      <>
        <button type="button">opener</button>
        <Modal isOpen onClose={() => {}} title="t" />
      </>,
    )
    expect(opener).not.toHaveFocus()
    rerender(
      <>
        <button type="button">opener</button>
        <Modal isOpen={false} onClose={() => {}} title="t" />
      </>,
    )
    expect(opener).toHaveFocus()
  })
})

describe('Spinner', () => {
  it('is a named status while shown', () => {
    render(<Spinner label="Translating" size="lg" color="white" />)
    expect(screen.getByRole('status', { name: 'Translating' })).toBeInTheDocument()
  })

  it('renders nothing when hidden', () => {
    const { container } = render(<Spinner show={false} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('ErrorMessage', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<ErrorMessage message="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a string message as an alert', () => {
    render(<ErrorMessage message="Server down" className="mt-2" />)
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Error')
    expect(alert).toHaveTextContent('Server down')
    expect(alert).toHaveClass('mt-2')
  })

  it('shows an object message as JSON', () => {
    render(<ErrorMessage message={{ code: 7 }} />)
    expect(screen.getByRole('alert')).toHaveTextContent('"code": 7')
  })
})

describe('Tooltip', () => {
  it('names its trigger and shows the text on focus', async () => {
    vi.useFakeTimers()
    render(
      <Tooltip title="Copy text">
        <button type="button">copy</button>
      </Tooltip>,
    )
    const trigger = screen.getByRole('button', { name: 'copy' })
    act(() => trigger.focus())
    await act(async () => vi.advanceTimersByTime(500))
    expect(screen.getByRole('tooltip')).toHaveTextContent('Copy text')
    vi.useRealTimers()
  })

  it('accepts content in place of title', async () => {
    render(
      <Tooltip content="Paste" delayDuration={0}>
        <button type="button">paste</button>
      </Tooltip>,
    )
    act(() => screen.getByRole('button').focus())
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Paste')
  })
})

describe('ToastProvider', () => {
  it('renders its children', () => {
    render(
      <ToastProvider>
        <p>app</p>
      </ToastProvider>,
    )
    expect(screen.getByText('app')).toBeInTheDocument()
  })
})
