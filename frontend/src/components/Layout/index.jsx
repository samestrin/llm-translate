import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const MAIN_ID = 'main-content';

// Focus <main> directly as well as following the hash, so the next Tab starts inside it.
const focusMain = () => document.getElementById(MAIN_ID)?.focus();

const Layout = ({ children }) => (
  <div className="flex min-h-screen flex-col bg-canvas text-ink">
    <a
      href={`#${MAIN_ID}`}
      onClick={focusMain}
      className="sr-only rounded-sm border border-brand bg-surface px-3 py-2 text-sm font-medium text-brand focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>

    <Header />

    <main id={MAIN_ID} tabIndex={-1} className="flex-1 px-gutter py-4">
      <div className="mx-auto max-w-shell">{children || <Outlet />}</div>
    </main>

    <Footer />
  </div>
);

export default Layout;
