import React from 'react';
import { Toaster } from 'react-hot-toast';

// Toasts use the same surface, ink and line tokens as the rest of the shell (index.css).
const toastOptions = {
  duration: 4000,
  style: {
    background: 'var(--app-surface)',
    color: 'var(--app-ink)',
    border: '1px solid var(--app-line)',
    maxWidth: '350px',
    padding: '12px 16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  success: { iconTheme: { primary: '#15803d', secondary: '#ffffff' } },
  error: { iconTheme: { primary: '#b91c1c', secondary: '#ffffff' } },
};

const ToastProvider = ({ children }) => (
  <>
    {children}
    <Toaster position="bottom-center" toastOptions={toastOptions} gutter={12} />
  </>
);

export default React.memo(ToastProvider);
