import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TranslationOptions from './TranslationOptions';
import { EMPTY_OPTIONS } from '../../services/translationOptions';

// The options as the page holds them: saved in this browser, edited through setOptions.
const Harness = () => {
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  return (
    <MemoryRouter>
      <TranslationOptions options={options} setOptions={setOptions} />
    </MemoryRouter>
  );
};

const renderOptions = () => render(<Harness />);

describe('TranslationOptions help', () => {
  it('shows a "?" help button beside each field, named for it', () => {
    renderOptions();
    for (const name of ['Glossary help', 'Style guide help']) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveTextContent('?');
      expect(button).toHaveAttribute('aria-expanded', 'false');
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Glossary help explains the rows, shows one example and links to the guide', async () => {
    const user = userEvent.setup();
    renderOptions();
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));

    const dialog = screen.getByRole('dialog', { name: 'Glossary help' });
    expect(within(dialog).getByText(/pins how your terms are translated/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/keep as is/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Example: “cloud” → “nube”, or keep “Acme” as is.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guide');
  });

  it('Style guide help explains the four fields, shows one example and links to the guide', async () => {
    const user = userEvent.setup();
    renderOptions();
    await user.click(screen.getByRole('button', { name: 'Style guide help' }));

    const dialog = screen.getByRole('dialog', { name: 'Style guide help' });
    expect(within(dialog).getByText(/tone, formality, audience and extra notes/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/empty fields are ignored/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Example: Tone “friendly”, Audience “first-time users”.')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Read the guide' })).toHaveAttribute('href', '/guide');
  });

  it.each(['Glossary help', 'Style guide help'])(
    '%s closes on Escape and returns focus to its button',
    async (name) => {
      const user = userEvent.setup();
      renderOptions();
      const button = screen.getByRole('button', { name });
      await user.click(button);
      expect(screen.getByRole('dialog', { name })).toBeInTheDocument();

      await user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(button).toHaveFocus();
    },
  );

  it.each(['Glossary', 'Style guide'])(
    'the %s group keeps its plain accessible name with the help popover closed and open',
    async (field) => {
      const user = userEvent.setup();
      renderOptions();
      expect(screen.getByRole('group', { name: field })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: `${field} help` }));
      expect(screen.getByRole('dialog', { name: `${field} help` })).toBeInTheDocument();
      expect(screen.getByRole('group', { name: field })).toBeInTheDocument();
    },
  );

  it('opening the other help closes the first, so only one popover is open', async () => {
    const user = userEvent.setup();
    renderOptions();
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));
    await user.click(screen.getByRole('button', { name: 'Style guide help' }));
    expect(screen.queryByRole('dialog', { name: 'Glossary help' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Style guide help' })).toBeInTheDocument();
  });

  it('opening the other help with the keyboard also leaves only one popover open', async () => {
    const user = userEvent.setup();
    renderOptions();
    const glossary = screen.getByRole('button', { name: 'Glossary help' });
    glossary.focus();
    await user.keyboard('{Enter}');
    expect(screen.getByRole('dialog', { name: 'Glossary help' })).toBeInTheDocument();

    const style = screen.getByRole('button', { name: 'Style guide help' });
    style.focus();
    await user.keyboard('{Enter}');
    expect(screen.queryByRole('dialog', { name: 'Glossary help' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Style guide help' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(style).toHaveFocus();
  });

  // The summary press is an outside press for the popover; that is what closes it.
  it('clicking the panel summary closes an open help popover', async () => {
    const user = userEvent.setup();
    renderOptions();
    await user.click(screen.getByRole('button', { name: 'Glossary help' }));
    await user.click(screen.getByText('Glossary and style guide'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('TranslationOptions editing (unchanged)', () => {
  it('still adds and edits glossary rows and style fields', async () => {
    const user = userEvent.setup();
    renderOptions();
    await user.click(screen.getByRole('button', { name: 'Add term' }));
    await user.type(screen.getByLabelText('Source term 1'), 'cloud');
    await user.type(screen.getByLabelText('Translation 1'), 'nube');
    expect(screen.getByLabelText('Translation 1')).toBeEnabled();
    await user.click(screen.getByLabelText('Keep term 1 as is'));
    expect(screen.getByLabelText('Translation 1')).toBeDisabled();
    await user.type(screen.getByLabelText('Tone'), 'friendly');
    expect(screen.getByLabelText('Tone')).toHaveValue('friendly');
    await user.click(screen.getByRole('button', { name: 'Remove term 1' }));
    expect(screen.queryByLabelText('Source term 1')).not.toBeInTheDocument();
  });
});
