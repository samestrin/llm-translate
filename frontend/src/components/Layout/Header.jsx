import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Home as HomeIcon, History as HistoryIcon, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import NavigationLink from './NavigationLink';
import MobileMenu from './MobileMenu';
import Logo from './Logo';

const navigation = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'History', href: '/history', icon: HistoryIcon },
];

const Header = () => {
  const { pathname } = useLocation();
  const { darkMode, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = useCallback((path) => pathname === path, [pathname]);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // A route change always closes the phone menu.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-gutter">
        <Logo />

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <NavigationLink item={item} isActive={isActive} />
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted"
          >
            {darkMode ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
          </button>
          <MobileMenu
            navigation={navigation}
            isActive={isActive}
            open={menuOpen}
            onToggle={toggleMenu}
            onClose={closeMenu}
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
