import React from 'react';
import { Link } from 'react-router-dom';

// The first commit is from 2025-05-09, and the LICENSE reads "Copyright (c) 2025 Sam Estrin".
const COPYRIGHT_START_YEAR = 2025;
const LICENSE_URL = 'https://github.com/samestrin/llm-translate/blob/main/LICENSE';

const links = [
  { name: 'About', href: '/about' },
  { name: 'Guide', href: '/guide' },
  { name: 'Models', href: '/llm-info' },
  { name: 'Speech', href: '/tts-info' },
  // Served by the backend, not the SPA: on the review host Traefik strips the
  // /api prefix before the backend sees /docs. A plain anchor does a full page
  // load; a router Link would hit the SPA's NotFound catch-all.
  { name: 'API', href: '/api/docs', external: true },
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
];

const copyrightYears = (startYear, currentYear) =>
  startYear === currentYear ? `${startYear}` : `${startYear}–${currentYear}`;

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="mx-auto flex max-w-shell flex-col items-center gap-3 px-gutter py-4 md:flex-row md:justify-between">
        <p>
          © {copyrightYears(COPYRIGHT_START_YEAR, currentYear)} Sam Estrin ·{' '}
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm"
          >
            MIT License
          </a>
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a href={link.href} className="rounded-sm">
                    {link.name}
                  </a>
                ) : (
                  <Link
                    to={link.href}
                    className="rounded-sm"
                  >
                    {link.name}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;