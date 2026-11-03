import axios from 'axios';

/**
 * The page's only HTTP client: hand-written calls to the backend's `/v1` routes.
 * `api.contract.test.js` checks every call against the backend's OpenAPI paths.
 */

export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds
// Whole-document, file and review calls make many model calls in one request.
export const LONG_TIMEOUT_MS = 300000; // 5 minutes
// Text longer than the backend's default LLM_SEGMENT_MAX_CHARS is translated as a whole document.
export const WHOLE_DOCUMENT_CHARS = 4000;

// No Content-Type default: axios sends JSON for objects and multipart for FormData.
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: DEFAULT_TIMEOUT_MS,
});

/**
 * Format error response for consistent error handling
 * @param {Error} error - The error object from axios
 * @returns {Error} - Formatted error object
 */
const formatError = (error) => {
  // `/v1` errors are `{"error": {"type", "message", ...}}`
  const formattedError = new Error(
    error.response?.data?.error?.message ||
    error.message ||
    'An unknown error occurred'
  );

  // Add additional properties for debugging
  formattedError.status = error.response?.status;
  formattedError.statusText = error.response?.statusText;
  formattedError.data = error.response?.data;
  formattedError.originalError = error;

  return formattedError;
};

// No retry: every call is a POST, and a retried POST spends the tokens again.
http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(formatError(error))
);

/**
 * POST /v1/translate
 * @param {Object} request
 * @param {string} request.text - The text to translate
 * @param {string} request.fromLang - The source language, or "Auto-detect"
 * @param {string} request.toLang - The target language
 * @param {Array} [request.glossary] - Glossary entries (`source_term`, `target_term`, `note`, `do_not_translate`)
 * @param {Object} [request.styleGuide] - Style guide (`tone`, `formality`, `audience`, `notes`)
 * @param {boolean} [request.review] - Ask for a review (`review=on`)
 * @returns {Promise<Object>} - `translation`, `from_lang`, `to_lang`, `model`, `usage`, `glossary_misses`, `cached`
 */
const translateText = async ({ text, fromLang, toLang, glossary, styleGuide, review = false }) => {
  const body = { text, from_lang: fromLang, to_lang: toLang };
  if (glossary?.length) body.glossary = glossary;
  if (styleGuide) body.style_guide = styleGuide;
  if (review) body.review = 'on';

  const isLong = review || text.length > WHOLE_DOCUMENT_CHARS;
  const response = await http.post('/v1/translate', body, isLong ? { timeout: LONG_TIMEOUT_MS } : undefined);
  return response.data;
};

/**
 * POST /v1/translate/file
 * @param {Object} request
 * @param {File} request.file - JSON, YAML, PO, Markdown, HTML or SRT; the extension names the format
 * @param {string} request.fromLang - The source language, or "Auto-detect"
 * @param {string} request.toLang - The target language
 * @returns {Promise<Object>} - `content`, `format`, `from_lang`, `to_lang`, `report`
 */
const translateFile = async ({ file, fromLang, toLang }) => {
  const form = new FormData();
  form.append('file', file);
  form.append('from_lang', fromLang);
  form.append('to_lang', toLang);

  const response = await http.post('/v1/translate/file', form, { timeout: LONG_TIMEOUT_MS });
  return response.data;
};

/**
 * POST /v1/speak
 * @param {Object} request
 * @param {string} request.text - The text to convert to speech
 * @param {string} request.lang - The language of the text (full name, e.g. "Spanish")
 * @param {string} [request.responseFormat] - The audio format (default "mp3")
 * @returns {Promise<Blob>} - The audio
 */
const speak = async ({ text, lang, responseFormat = 'mp3' }) => {
  const response = await http.post(
    '/v1/speak',
    { text, lang, response_format: responseFormat },
    { responseType: 'blob' }
  );
  return response.data;
};

export default { translateText, translateFile, speak };
