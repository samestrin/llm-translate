import React from 'react';
import { EMPTY_GLOSSARY_ROW } from '../../services/translationOptions';

const inputClass =
  'w-full rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 ' +
  'text-secondary-900 dark:text-secondary-100 px-2 py-1 text-sm';
const labelClass = 'block text-xs font-medium text-secondary-600 dark:text-secondary-400 mb-1';
const buttonClass =
  'rounded border border-secondary-300 dark:border-secondary-600 px-3 py-1 text-sm ' +
  'text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-700';

const STYLE_FIELDS = [
  { key: 'tone', label: 'Tone', placeholder: 'e.g. friendly' },
  { key: 'formality', label: 'Formality', placeholder: 'e.g. informal' },
  { key: 'audience', label: 'Audience', placeholder: 'e.g. first-time users' },
  { key: 'notes', label: 'Notes', placeholder: 'e.g. Address the reader as tú.' },
];

/**
 * Glossary and style guide inputs. Every change is saved in this browser by `useTranslation`.
 */
const TranslationOptions = ({ options, setOptions }) => {
  const { glossary, styleGuide } = options;

  const updateRow = (index, field, value) =>
    setOptions((prev) => ({
      ...prev,
      glossary: prev.glossary.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    }));
  const addRow = () => setOptions((prev) => ({ ...prev, glossary: [...prev.glossary, EMPTY_GLOSSARY_ROW] }));
  const removeRow = (index) =>
    setOptions((prev) => ({ ...prev, glossary: prev.glossary.filter((_, i) => i !== index) }));
  const updateStyle = (key, value) =>
    setOptions((prev) => ({ ...prev, styleGuide: { ...prev.styleGuide, [key]: value } }));

  return (
    <details className="rounded border border-secondary-200 dark:border-secondary-700 p-3">
      <summary className="cursor-pointer font-medium text-ink">
        Glossary and style guide
      </summary>

      <div className="mt-3 flex flex-col gap-4">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Glossary</legend>
          <p className="text-xs text-secondary-500 dark:text-secondary-400">
            A term applies when it occurs in the text. Terms the translation lacks are listed after it.
          </p>
          {glossary.map((row, index) => {
            const n = index + 1;
            return (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <label className="flex-1 min-w-[8rem]">
                  <span className={labelClass}>Source term {n}</span>
                  <input
                    className={inputClass}
                    value={row.sourceTerm}
                    onChange={(e) => updateRow(index, 'sourceTerm', e.target.value)}
                  />
                </label>
                <label className="flex-1 min-w-[8rem]">
                  <span className={labelClass}>Translation {n}</span>
                  <input
                    className={inputClass}
                    value={row.targetTerm}
                    disabled={row.doNotTranslate}
                    onChange={(e) => updateRow(index, 'targetTerm', e.target.value)}
                  />
                </label>
                <label className="flex-1 min-w-[8rem]">
                  <span className={labelClass}>Note {n}</span>
                  <input
                    className={inputClass}
                    value={row.note}
                    onChange={(e) => updateRow(index, 'note', e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-1 text-sm text-secondary-700 dark:text-secondary-300 py-1">
                  <input
                    type="checkbox"
                    checked={row.doNotTranslate}
                    aria-label={`Keep term ${n} as is`}
                    onChange={(e) => updateRow(index, 'doNotTranslate', e.target.checked)}
                  />
                  Keep as is
                </label>
                <button type="button" className={buttonClass} aria-label={`Remove term ${n}`} onClick={() => removeRow(index)}>
                  Remove
                </button>
              </div>
            );
          })}
          <div>
            <button type="button" className={buttonClass} onClick={addRow}>
              Add term
            </button>
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <legend className="text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">Style guide</legend>
          {STYLE_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key}>
              <span className={labelClass}>{label}</span>
              <input
                className={inputClass}
                value={styleGuide[key]}
                placeholder={placeholder}
                onChange={(e) => updateStyle(key, e.target.value)}
              />
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
};

export default TranslationOptions;
