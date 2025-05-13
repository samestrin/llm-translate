import React from 'react';
import { Transition } from '@headlessui/react';

const Spinner = ({ size = 'md', className = '', show = true }) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <Transition
      show={show}
      enter="transition-opacity duration-300"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="transition-opacity duration-300"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
    >
      <div className={`flex justify-center items-center ${className}`}>
        <div
          className={`${sizeClasses[size]} rounded-full border-t-primary-600 dark:border-t-primary-400 border-secondary-200 dark:border-secondary-700 animate-spin`}
          role="status"
          aria-label="Loading"
        />
      </div>
    </Transition>
  );
};

export default Spinner;