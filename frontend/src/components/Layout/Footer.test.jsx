import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Footer from './Footer';
import { apiDocsUrl, http } from '../../services/api';

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
  it('links the API reference on the backend the page calls', () => {
    renderFooter();
    expect(screen.getByRole('link', { name: 'API' })).toHaveAttribute(
      'href',
      apiDocsUrl(http.defaults.baseURL),
    );
  });

  it.each([
    // The review host: Traefik routes /api to the backend.
    ['/api', '/api/docs'],
    ['/api/', '/api/docs'],
    // The demo compose: the backend on its own origin.
    ['http://localhost:8000/', 'http://localhost:8000/docs'],
    // No VITE_API_URL: the client's default.
    ['http://127.0.0.1:8000', 'http://127.0.0.1:8000/docs'],
  ])('API base %s puts the reference at %s', (base, docs) => {
    expect(apiDocsUrl(base)).toBe(docs);
  });

  it('the API link loads the backend page, not an SPA route', () => {
    // The reference is served by the backend, so the link must do a full page
    // load. On the review host (VITE_API_URL=/api) a router Link would
    // client-side route to /api/docs and hit the SPA's NotFound catch-all.
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
    // Exact equality: a router Link would move the probe to '/api/docs',
    // which still starts with '/' — a substring check could never fail.
    expect(screen.getByTestId('location').textContent).toBe('/');
  });
});
