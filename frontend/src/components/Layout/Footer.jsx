import React from 'react';
import { Link } from 'react-router-dom';

const links = [
  { name: 'About', href: '/about' },
  { name: 'LLMs', href: '/llm-info' },
  { name: 'TTS', href: '/tts-info' },
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
];

const Footer = () => (
  <footer className="border-t border-line bg-surface">
    <div className="mx-auto flex max-w-shell flex-col items-center gap-4 px-gutter py-6 text-sm text-ink-muted md:flex-row md:justify-between">
      <p>© {new Date().getFullYear()} LLM Translate. All rights reserved.</p>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="rounded-sm underline-offset-4 transition-colors hover:text-brand hover:underline"
              >
                {link.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  </footer>
);

export default Footer;
