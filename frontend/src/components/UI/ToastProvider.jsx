import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Transition } from '@headlessui/react';

const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
          success: {
            className: '!bg-green-50 !text-green-800 dark:!bg-green-900 dark:!text-green-100',
            iconTheme: {
              primary: '#10B981',
              secondary: '#ECFDF5',
            },
          },
          error: {
            className: '!bg-red-50 !text-red-800 dark:!bg-red-900 dark:!text-red-100',
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FEF2F2',
            },
          },
        }}
      >
        {(t) => (
          <Transition
            appear
            show={t.visible}
            enter="transform transition duration-300 ease-out"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="transform transition duration-200 ease-in"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            {t.component}
          </Transition>
        )}
      </Toaster>
    </>
  );
};

export default ToastProvider;