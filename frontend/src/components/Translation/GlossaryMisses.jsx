import React from 'react';

const TITLE = 'Glossary terms missing from the translation';

/**
 * The `glossary_misses` of a `/v1/translate` response: terms in the text whose expected
 * translation the output lacks. A miss is reported, never an error.
 */
const GlossaryMisses = ({ misses }) => {
  if (!misses?.length) return null;

  return (
    <div className="rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 p-3 text-sm text-amber-900 dark:text-amber-100">
      <p className="font-medium mb-1">{TITLE}</p>
      <ul aria-label={TITLE} className="list-disc pl-5">
        {misses.map((miss, index) => (
          <li key={index}>
            “{miss.term}”: expected “{miss.expected}”
          </li>
        ))}
      </ul>
    </div>
  );
};

export default GlossaryMisses;
