/**
 * Glossary and style guide, saved in this browser's localStorage and sent with each `/v1/translate`.
 */

export const STORAGE_KEY = 'translationOptions';

export const EMPTY_STYLE_GUIDE = { tone: '', formality: '', audience: '', notes: '' };
export const EMPTY_OPTIONS = { glossary: [], styleGuide: EMPTY_STYLE_GUIDE };
export const EMPTY_GLOSSARY_ROW = { sourceTerm: '', targetTerm: '', note: '', doNotTranslate: false };

const text = (value) => (typeof value === 'string' ? value : '');

const toRow = (row) => ({
  sourceTerm: text(row.sourceTerm),
  targetTerm: text(row.targetTerm),
  note: text(row.note),
  doNotTranslate: row.doNotTranslate === true,
});

/**
 * The saved options; empty ones when nothing is saved or the saved value is unreadable.
 * @returns {{glossary: Array, styleGuide: Object}}
 */
export const loadOptions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || typeof saved !== 'object') return EMPTY_OPTIONS;
    const glossary = Array.isArray(saved.glossary)
      ? saved.glossary.filter((row) => row && typeof row === 'object').map(toRow)
      : [];
    const styleGuide = saved.styleGuide && typeof saved.styleGuide === 'object' ? saved.styleGuide : {};
    return {
      glossary,
      styleGuide: Object.fromEntries(Object.keys(EMPTY_STYLE_GUIDE).map((key) => [key, text(styleGuide[key])])),
    };
  } catch {
    return EMPTY_OPTIONS;
  }
};

/**
 * Save the options in this browser.
 * @param {{glossary: Array, styleGuide: Object}} options
 */
export const saveOptions = (options) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch (error) {
    console.error('Error saving glossary and style guide:', error);
  }
};

/**
 * The glossary as `/v1/translate` takes it. Rows the API would reject (no source term, or no
 * translation and not kept as is) are left out, so a half-typed row never fails a translation.
 * @param {Array} rows - `sourceTerm`, `targetTerm`, `note`, `doNotTranslate`
 * @returns {Array} - `source_term`, `target_term`, `note`, `do_not_translate`
 */
export const toRequestGlossary = (rows) =>
  rows.flatMap((row) => {
    const source = row.sourceTerm.trim();
    const target = row.targetTerm.trim();
    const note = row.note.trim();
    if (!source || (!row.doNotTranslate && !target)) return [];
    const entry = row.doNotTranslate
      ? { source_term: source, do_not_translate: true }
      : { source_term: source, target_term: target };
    if (note) entry.note = note;
    return [entry];
  });

/**
 * The style guide as `/v1/translate` takes it: only the fields with text, or undefined when none has.
 * @param {Object} styleGuide - `tone`, `formality`, `audience`, `notes`
 * @returns {Object|undefined}
 */
export const toRequestStyleGuide = (styleGuide) => {
  const fields = Object.entries(styleGuide)
    .map(([key, value]) => [key, value.trim()])
    .filter(([, value]) => value);
  return fields.length ? Object.fromEntries(fields) : undefined;
};
