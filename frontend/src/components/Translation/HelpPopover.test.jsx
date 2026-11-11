import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HelpPopover from './HelpPopover';

const props = {
  field: 'Glossary',
  lines: ['First plain line.', 'Second plain line.'],
  example: 'Example: “cloud” → “nube”.',
};

const renderHelp = (ui = <HelpPopover {...props} />) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('HelpPopover', () => {
  it('shows a small "?" button named for the field, collapsed', () => {
    renderHelp();
    const button = screen.getByRole('button', { name: 'Glossary help' });
    expect(button).toHaveTextContent('?');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on click with the lines, the example and a Read the guide link, and moves focus in', async () => {
    const user = userEvent.setup();
    renderHelp();
    const button = screen.getByRole('button', { name: 'Glossary help' });
    await user.click(button);

    const dialog = screen.getByRole('dialog', { name: 'Glossary help' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', dialog.id);
    expect(within(dialog).getByText('First plain line.')).toBeInTheDocument();
    expect(within(dialog).getByText('Second plain line.')).toBeInTheDocument();
    expect(within(dialog).getByText('Example: “cloud” → “nube”.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guide');
    expect(dialog).toHaveFocus();
  });

  it('opens on Enter and on Space', async () => {
    const user = userEvent.setup();
    renderHelp();
    const button = screen.getByRole('button', { name: 'Glossary help' });

    button.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Glossary help' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    button.focus();
    await user.keyboard(' ');
    expect(screen.getByRole('dialog', { name: 'Glossary help' })).toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the button, even from the link inside', async () => {
    const user = userEvent.setup();
    renderHelp();
    const button = screen.getByRole('button', { name: 'Glossary help' });
    await user.click(button);
    within(screen.getByRole('dialog')).getByRole('link', { name: 'Read the guide' }).focus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on a second click of the button, which keeps focus', async () => {
    const user = userEvent.setup();
    renderHelp();
    const button = screen.getByRole('button', { name: 'Glossary help' });
    await user.click(button);
    await user.click(button);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('closes on an outside click without stealing focus from the clicked control', async () => {
    const user = userEvent.setup();
    renderHelp(
      <>
        <HelpPopover {...props} />
        <button type="button">Outside</button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));
    const outside = screen.getByRole('button', { name: 'Outside' });
    await user.click(outside);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(outside).toHaveFocus();
  });

  it('an outside click leaves focus where it is when focus already left the popover', async () => {
    const user = userEvent.setup();
    renderHelp(
      <>
        <HelpPopover {...props} />
        <button type="button">Outside</button>
      </>,
    );
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));
    const outside = screen.getByRole('button', { name: 'Outside' });
    outside.focus();
    // Pressing on a non-focusable area blurs the active element (browser behaviour);
    // what must not happen is focus jumping back to the help button.
    await user.pointer({ keys: '[MouseLeft>]', target: document.body });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Glossary help' })).not.toHaveFocus();
  });

  it('stays open on a click inside the popover', async () => {
    const user = userEvent.setup();
    renderHelp();
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));
    await user.click(within(screen.getByRole('dialog')).getByText('First plain line.'));
    expect(screen.getByRole('dialog', { name: 'Glossary help' })).toBeInTheDocument();
  });

  it('Read the guide navigates to /guide and closes the popover', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<HelpPopover {...props} />} />
          <Route path="/guide" element={<div>Guide page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));
    await user.click(screen.getByRole('link', { name: 'Read the guide' }));
    expect(screen.getByText('Guide page')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
