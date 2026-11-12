import React from 'react';
import { Link } from 'react-router-dom';

const links = [
  { name: 'About', href: '/about' },
  { name: 'Guide', href: '/guide' },
  { name: 'Models', href: '/llm-info' },
  { name: 'Speech', href: '/tts-info' },
  { name: 'Privacy', href: '/privacy' },
  { name: 'Terms', href: '/terms' },
];

const Footer = () => (
  <footer className="app-footer">
    <div className="mx-auto flex max-w-shell flex-col items-center gap-3 px-gutter py-4 md:flex-row md:justify-between">
      <p>© {new Date().getFullYear()} LLM Translate. All rights reserved.</p>
      <nav aria-label="Footer">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="rounded-sm"
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
