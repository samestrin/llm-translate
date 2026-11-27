import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Footer from './Footer';
import { apiDocsUrl, http } from '../../services/api';

const LICENSE_URL = 'https://github.com/samestrin/llm-translate/blob/main/LICENSE';

// The demo-shell spec (EST-9380 revised): the GitHub LICENSE is the only external
// URL the footer allows. Every other link is a root-relative SPA path or the
// app's own API reference (the backend the page calls, not a third party).
const isAllowedHref = (href, apiHref) =>
  href === LICENSE_URL || href === apiHref || /^\/[^/]/.test(href);

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
    const link = screen.getByRole('link', { name: 'MIT License' });
    expect(link).toHaveAttribute('href', LICENSE_URL);
    // Same-tab plain link: restoring target="_blank" rel="noopener noreferrer"
    // (the old markup) must fail here. (A react-router <Link> to an external
    // absolute URL renders the identical plain anchor — react-router 7.6
    // omits the click handler when isExternal — so only target/rel are
    // observable; there is no router behaviour to test.)
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
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

  it('the footer bar keeps the shell gutter and spacing', () => {
    // The demo shell's gutter and spacing on the footer bar, the contentinfo's
    // first child, so a new wrapper there would show up here.
    renderFooter();
    const bar = screen.getByRole('contentinfo').firstElementChild;
    expect(bar).toHaveClass('px-gutter', 'py-4');
    expect(bar).toHaveClass('gap-3');
    expect(bar).toHaveClass('md:flex-row', 'md:justify-between');
  });

  it('the footer links keep the shell gap', () => {
    renderFooter();
    const list = within(
      screen.getByRole('navigation', { name: 'Footer' }),
    ).getByRole('list');
    expect(list).toHaveClass('gap-x-5', 'gap-y-2');
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

describe('Footer no-external-links guard', () => {
  it('allows exactly the GitHub LICENSE as the only external URL', () => {
    // The demo-shell spec (EST-9380 revised): the footer links to the repo
    // LICENSE on GitHub and nowhere else off the app. Applied to the rendered
    // DOM, so a new external link in the footer fails here.
    renderFooter();
    const apiHref = apiDocsUrl(http.defaults.baseURL);
    const anchors = [
      ...screen.getByRole('contentinfo').querySelectorAll('a[href]'),
    ];
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      expect(isAllowedHref(anchor.getAttribute('href'), apiHref)).toBe(true);
    }
    const licenceLinks = anchors.filter(
      (a) => a.getAttribute('href') === LICENSE_URL,
    );
    expect(licenceLinks).toHaveLength(1);
    expect(licenceLinks[0]).toHaveTextContent('MIT License');
  });

  it.each([
    // Known-good: the one allowed external URL, an SPA path, the app's API.
    [LICENSE_URL, true],
    ['/about', true],
    [apiDocsUrl(http.defaults.baseURL), true],
    // Every other external URL is refused, including near-misses of the
    // allowed one: another file, another repo, another scheme, a trailing
    // slash, a query, a protocol-relative URL, and non-http schemes.
    ['https://github.com/samestrin/llm-translate/blob/main/README.md', false],
    ['https://github.com/samestrin/llm-pdf-chatbot/blob/main/LICENSE', false],
    ['https://github.com/samestrin/llm-translate', false],
    ['http://github.com/samestrin/llm-translate/blob/main/LICENSE', false],
    ['https://github.com/samestrin/llm-translate/blob/main/LICENSE/', false],
    ['https://github.com/samestrin/llm-translate/blob/main/LICENSE?raw=1', false],
    ['https://example.com/', false],
    ['//github.com/samestrin/llm-translate/blob/main/LICENSE', false],
    ['javascript:alert(1)', false],
    ['mailto:sam@example.com', false],
  ])('the guard answers %s -> %s', (href, allowed) => {
    // Proves the guard is not vacuous: it must pass the known-good set and
    // catch every bad href, not just wave everything through.
    expect(isAllowedHref(href, apiDocsUrl(http.defaults.baseURL))).toBe(
      allowed,
    );
  });
});
