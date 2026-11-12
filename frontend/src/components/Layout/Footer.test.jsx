import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

describe('Footer navigation', () => {
  it('links the API reference at /api/docs', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'API' })).toHaveAttribute(
      'href',
      '/api/docs',
    );
  });

  it('the API link loads the backend page, not an SPA route', () => {
    // The reference is served by the backend through Traefik, so the link must
    // do a full page load. A router Link would client-side route to /api/docs
    // and hit the SPA's NotFound catch-all instead.
    const LocationProbe = () => (
      <div data-testid="location">{useLocation().pathname}</div>
    );
    render(
      <MemoryRouter initialEntries={['/']}>
        <Footer />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'API' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/');
  });
});