import React, { useEffect, useRef } from 'react';
import { Menu as MenuIcon, X } from 'lucide-react';
import NavigationLink from './NavigationLink';

const PANEL_ID = 'mobile-menu';

// The phone navigation: a disclosure button and the panel it opens under the header.
// Escape closes the panel and returns focus to the button.
const MobileMenu = ({ navigation, isActive, open, onToggle, onClose }) => {
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      onClose();
      buttonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-ink transition-colors hover:bg-surface-muted"
      >
        {open ? <X size={20} aria-hidden="true" /> : <MenuIcon size={20} aria-hidden="true" />}
        <span className="sr-only">Menu</span>
      </button>

      {open && (
        <nav
          id={PANEL_ID}
          aria-label="Main"
          className="absolute inset-x-0 top-full border-b border-line bg-surface px-gutter py-3 shadow-lg"
        >
          <ul className="flex flex-col gap-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <NavigationLink item={item} isActive={isActive} onClick={onClose} className="w-full" />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
};

export default MobileMenu;
