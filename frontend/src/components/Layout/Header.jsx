import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Home as HomeIcon, History as HistoryIcon } from 'lucide-react';
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
      <div className="app-bar mx-auto h-14 max-w-shell flex-nowrap justify-between px-gutter">
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

        <div className="flex items-center gap-2">
          {/* The label names what a click does, so the way back is always visible. */}
          <button type="button" onClick={toggleTheme} className="button secondary small theme-toggle">
            {darkMode ? 'Light theme' : 'Dark theme'}
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
