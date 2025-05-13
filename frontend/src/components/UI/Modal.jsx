import React, { Fragment } from 'react';
import { Dialog, DialogPanel, DialogTitle, DialogDescription, Transition } from '@headlessui/react';
import { X } from 'lucide-react';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  maxWidth = 'max-w-md' 
}) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className={`w-full ${maxWidth} transform overflow-hidden rounded-lg bg-white dark:bg-secondary-800 p-6 text-left align-middle shadow-xl transition-all`}>
                <div className="flex justify-between items-start">
                  <div>
                    {title && (
                      <DialogTitle as="h3" className="text-lg font-medium leading-6 text-secondary-900 dark:text-white">
                        {title}
                      </DialogTitle>
                    )}
                    {description && (
                      <DialogDescription className="mt-2 text-sm text-secondary-500 dark:text-secondary-400">
                        {description}
                      </DialogDescription>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-secondary-400 hover:text-secondary-500 dark:text-secondary-500 dark:hover:text-secondary-400 focus:outline-none"
                    onClick={onClose}
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
                <div className="mt-4">
                  {children}
                </div>
              </DialogPanel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default Modal;