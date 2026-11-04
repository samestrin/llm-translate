import { WHOLE_DOCUMENT_CHARS } from './api';

/**
 * Helpers for the review report of `review=on` (epic 04): a flag carries only the
 * segment id and a reason, so the page finds the severity in the reason and the
 * segment's source and translation in what it sent and got back.
 */

const SEVERITIES = ['critical', 'major', 'minor'];
// The backend writes each serious error as "<severity> <category> error: <explanation>".
const ERROR_PATTERN = /\b(critical|major|minor) (?:meaning|terminology|fluency|style|format) error\b/g;

/**
 * The highest severity a flag reason names, or null for a pipeline message with none
 * (`review could not be read`, a lost placeholder).
 * @param {string} reason
 * @returns {'critical'|'major'|'minor'|null}
 */
export const flagSeverity = (reason) => {
  const found = new Set([...(reason || '').matchAll(ERROR_PATTERN)].map((match) => match[1]));
  return SEVERITIES.find((severity) => found.has(severity)) || null;
};

const PARAGRAPH_BREAK = /(\r?\n[ \t\r]*\n\s*)/;
const LINE_BREAK = /(\r?\n)/;

// The pieces between `pattern` matches, each with the separator before it.
const pieces = (text, pattern) => {
  const parts = text.split(pattern);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) out.push([i ? parts[i - 1] : '', parts[i]]);
  return out;
};

/**
 * Split a text into segments the way the backend's whole-document mode does
 * (`services/document.py` `split_document`), so flag numbers point at the right source.
 * @param {string} text
 * @param {number} maxChars - The backend's `LLM_SEGMENT_MAX_CHARS`
 * @returns {string[]}
 */
export const splitDocument = (text, maxChars) => {
  const segments = [];
  let lastPackable = false;

  const add = (separator, piece, packable) => {
    const last = segments.length - 1;
    if (packable && lastPackable && segments[last].length + separator.length + piece.length <= maxChars) {
      segments[last] += separator + piece;
    } else {
      segments.push(piece);
    }
    lastPackable = packable;
  };

  for (const [separator, paragraph] of pieces(text.trim(), PARAGRAPH_BREAK)) {
    if (paragraph.length <= maxChars) {
      add(separator, paragraph, true);
      continue;
    }
    let chunk = null;
    for (const [lineSeparator, line] of pieces(paragraph, LINE_BREAK)) {
      if (chunk !== null && chunk.length + lineSeparator.length + line.length <= maxChars) {
        chunk += lineSeparator + line;
        continue;
      }
      if (chunk !== null) add('', chunk, false);
      chunk = line;
    }
    add('', chunk, false);
  }
  return segments;
};

/**
 * The segments of a text translation by number from 1. A text within one segment
 * is the whole source and translation; a longer one gets each segment's source only,
 * since the translation of one segment cannot be cut out of the joined reply.
 * @param {string} source - The text that was sent
 * @param {string} translation - The `translation` of the reply
 * @returns {Object<number, {source: string, translation: string|null}>}
 */
export const textSegments = (source, translation) => {
  const parts = splitDocument(source, WHOLE_DOCUMENT_CHARS);
  if (parts.length === 1) return { 1: { source: parts[0], translation } };
  return Object.fromEntries(parts.map((part, i) => [i + 1, { source: part, translation: null }]));
};

// A JSON Pointer path segment, escaped as the backend does (`formats/base.py` `child_path`).
const escapeKey = (key) => String(key).replace(/~/g, '~0').replace(/\//g, '~1');

const collectStrings = (node, path, out) => {
  if (typeof node === 'string') out[path] = node;
  else if (Array.isArray(node)) node.forEach((value, i) => collectStrings(value, `${path}/${i}`, out));
  else if (node && typeof node === 'object') {
    Object.entries(node).forEach(([key, value]) => collectStrings(value, `${path}/${escapeKey(key)}`, out));
  }
  return out;
};

const parseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

/**
 * The string values of a JSON file by JSON Pointer, the id a file flag carries,
 * with their translated values. Empty when the source is not JSON.
 * @param {string} sourceText - The uploaded file's text
 * @param {string} translatedText - The `content` of the reply
 * @returns {Object<string, {source: string, translation: string|null}>}
 */
export const jsonSegments = (sourceText, translatedText) => {
  const source = parseJson(sourceText);
  if (source === undefined) return {};
  const sources = collectStrings(source, '', {});
  const translations = collectStrings(parseJson(translatedText), '', {});
  return Object.fromEntries(
    Object.entries(sources).map(([path, text]) => [path, { source: text, translation: translations[path] ?? null }]),
  );
};
