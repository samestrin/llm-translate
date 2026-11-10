import React from 'react';

const sizes = {
  xs: 'h-4 w-4 border-2',
  sm: 'h-5 w-5 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
  xl: 'h-16 w-16 border-4',
};

const colors = {
  primary: 'text-brand',
  secondary: 'text-ink-muted',
  success: 'text-success-700 dark:text-success-500',
  error: 'text-danger',
  white: 'text-white',
};

// An inline spinner that names what is loading. Reduced motion slows it to a stop (index.css).
const Spinner = ({ size = 'md', className = '', show = true, color = 'primary', label = 'Loading' }) => {
  if (!show) return null;
  return (
    <span role="status" aria-label={label} className={`inline-flex items-center justify-center ${className}`}>
      <span
        aria-hidden="true"
        className={`animate-spin rounded-full border-current border-t-transparent ${sizes[size] || sizes.md} ${colors[color] || colors.primary}`}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
};

export default React.memo(Spinner);
