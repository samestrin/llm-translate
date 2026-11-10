import React from 'react';
import { Link } from 'react-router-dom';

const base =
  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors';
const active = 'bg-brand-soft text-brand';
const idle = 'text-ink-muted hover:bg-surface-muted hover:text-ink';

const NavigationLink = React.memo(({ item, isActive, onClick, className = '' }) => {
  const current = isActive(item.href);
  return (
    <Link
      to={item.href}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={`${base} ${current ? active : idle} ${className}`}
    >
      <item.icon size={18} className="shrink-0" aria-hidden="true" />
      {item.name}
    </Link>
  );
});

NavigationLink.displayName = 'NavigationLink';

export default NavigationLink;
