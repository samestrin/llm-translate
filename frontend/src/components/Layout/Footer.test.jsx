import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

const LICENSE_URL = 'https://github.com/samestrin/llm-translate/blob/main/LICENSE';

const renderFooter = () =>
  render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );

const copyright = () => screen.getByRole('contentinfo').querySelector('p');

describe('Footer copyright', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the start year through the current year, with the MIT License', () => {
    vi.setSystemTime(new Date('2026-06-01T12:00:00Z'));
    renderFooter();
    expect(copyright()).toHaveTextContent(
      '© 2025–2026 Sam Estrin · MIT License',
    );
    expect(screen.getByRole('link', { name: 'MIT License' })).toHaveAttribute(
      'href',
      LICENSE_URL,
    );
  });

  it('shows a single year when the start year is the current year', () => {
    vi.setSystemTime(new Date('2025-06-01T12:00:00Z'));
    renderFooter();
    expect(copyright()).toHaveTextContent(
      '© 2025 Sam Estrin · MIT License',
    );
    expect(copyright()).not.toHaveTextContent('–');
  });
});