import React from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions, Transition } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';

// Updated languages array with Auto-detect and reordered priorities
const languages = [
  'Auto-detect',
  'English',
  'Hebrew',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Chinese',
  'Korean',
  'Arabic',
  'Hindi',
  'Dutch',
  'Swedish',
  'Polish',
  'Turkish',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Greek',
];

const LanguageSelector = ({ selected, onChange, label, id }) => {
  // Filter out Auto-detect option for target language selector
  const isSourceSelector = label.toLowerCase().includes('from');
  const filteredLanguages = isSourceSelector ? languages : languages.filter(lang => lang !== 'Auto-detect');
  
  return (
    <div className="w-full">
      <label htmlFor={id} className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
        {label}
      </label>
      <Listbox value={selected} onChange={onChange} id={id}>
        <div className="relative mt-1">
          <ListboxButton className="relative w-full cursor-pointer rounded-md bg-white dark:bg-secondary-800 py-2 pl-3 pr-10 text-left border border-secondary-300 dark:border-secondary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm">
            <span className="block truncate">{selected}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDown className="h-4 w-4 text-secondary-400" aria-hidden="true" />
            </span>
          </ListboxButton>
          <Transition
            as={React.Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <ListboxOptions anchor="bottom" className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-secondary-800 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredLanguages.map((language, index) => (
                <ListboxOption
                  key={index}
                  value={language}
                >
                  {({ focus, selected }) => (
                    <div className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      focus 
                        ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100' 
                        : 'bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-700'
                    }`}>
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        {language}
                      </span>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-600 dark:text-primary-400">
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </span>
                      ) : null}
                    </div>
                  )}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};

export default LanguageSelector;