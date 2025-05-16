import React, { useMemo } from 'react';
import { Toaster } from 'react-hot-toast';
import { Zoom } from '@mui/material';

const ToastProvider = ({ children }) => {
  // Memoize toast options to prevent unnecessary re-renders
  const toastOptions = useMemo(() => ({
    duration: 4000,
    style: {
      background: 'var(--toast-bg)',
      color: 'var(--toast-color)',
      maxWidth: '350px',
      padding: '12px 16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
    success: {
      className: 'bg-success-50 text-success-800 dark:bg-success-900 dark:text-success-100 border-l-4 border-success-500',
      iconTheme: {
        primary: 'var(--success-500)',
        secondary: 'var(--success-50)',
      },
    },
    error: {
      className: 'bg-error-50 text-error-800 dark:bg-error-900 dark:text-error-100 border-l-4 border-error-500',
      iconTheme: {
        primary: 'var(--error-500)',
        secondary: 'var(--error-50)',
      },
    },
    loading: {
      className: 'bg-info-50 text-info-800 dark:bg-info-900 dark:text-info-100 border-l-4 border-info-500',
      iconTheme: {
        primary: 'var(--info-500)',
        secondary: 'var(--info-50)',
      },
    },
    custom: {
      className: 'bg-primary-50 text-primary-800 dark:bg-primary-900 dark:text-primary-100 border-l-4 border-primary-500',
    },
  }), []);

  return (
    <>
      {children}
      <Toaster
        position="bottom-center"
        toastOptions={toastOptions}
        gutter={12}
      />
    </>
  );
};

export default React.memo(ToastProvider);