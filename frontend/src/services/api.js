import axios from 'axios';

/**
 * The page's only HTTP client: hand-written calls to the backend's `/v1` routes, and `GET /`
 * for the service-reachable indicator.
 * `api.contract.test.js` checks every call against the backend's OpenAPI paths.
 */

export const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds
// The health check only says whether the backend answers; it calls no model.
export const HEALTH_TIMEOUT_MS = 5000;
// Whole-document, file and review calls make many model calls in one request.
export const LONG_TIMEOUT_MS = 300000; // 5 minutes
// Text longer than the backend's default LLM_SEGMENT_MAX_CHARS is translated as a whole document.
export const WHOLE_DOCUMENT_CHARS = 4000;

// No Content-Type default: axios sends JSON for objects and multipart for FormData.
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  timeout: DEFAULT_TIMEOUT_MS,
});

// Shown instead of axios's own messages, which name a raw status ("Request failed with status code 502").
const UNREACHABLE = 'Could not reach the translation service. Check that the backend is running, then try again.';
const TIMED_OUT = 'The translation service took too long to answer. Try again.';
const NO_DETAILS = 'The translation service had a problem and sent no details. Try again.';

/**
 * Format error response for consistent error handling
 * @param {Error} error - The error object from axios
 * @returns {Error} - An error whose message a visitor can read, with `status`, `type` and `data`
 */
const formatError = (error) => {
  // `/v1` errors are `{"error": {"type", "message", ...}}`; a request-validation 422 is `{"detail": [{"msg"}]}`
  const data = error.response?.data;
  const detail = Array.isArray(data?.detail) ? data.detail.map((d) => d.msg).filter(Boolean).join('; ') : data?.detail;
  let fallback = NO_DETAILS;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') fallback = TIMED_OUT;
  else if (!error.response) fallback = UNREACHABLE;
  const formattedError = new Error(
    data?.error?.message ||
    (typeof detail === 'string' && detail) ||
    fallback
  );

  // Add additional properties for debugging
  formattedError.status = error.response?.status;
  formattedError.statusText = error.response?.statusText;
  formattedError.type = data?.error?.type;
  formattedError.data = error.response?.data;
  formattedError.originalError = error;

  return formattedError;
};

// The backend's 401 when LLM_API_KEY is empty (`llm_client.py`); a wrong key has another message.
const NO_MODEL_KEY = /^No model API key is set/;

/**
 * What the page shows for a failed call.
 * @param {Error} error - An error from this client
 * @returns {{title: string, message: string, segmentErrors: Array}}
 */
export const describeError = (error) => {
  const message = error?.message || 'Something went wrong. Try again.';
  const noKey = error?.type === 'authentication_error' && NO_MODEL_KEY.test(message);
  return {
    title: noKey ? 'No model key set' : 'Translation failed',
    message,
    segmentErrors: error?.data?.error?.segment_errors || [],
  };
};

// No automatic retry: a retried POST spends the tokens again. The page offers "Try again" instead.
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    // `/v1/speak` asks for a Blob, so its JSON error body arrives as one too.
    const blob = error.response?.data;
    if (typeof Blob !== 'undefined' && blob instanceof Blob) {
      try {
        error.response.data = JSON.parse(await blob.text());
      } catch {
        // not JSON: keep the generic message
      }
    }
    return Promise.reject(formatError(error));
  }
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
 * @returns {Promise<Object>} - `translation`, `from_lang`, `to_lang`, `model`, `usage`, `glossary_misses`, `cached`,
 *   and `review` (flags, models and tokens per step) when asked
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
 * @param {boolean} [request.review] - Ask for a review (`review=on`)
 * @returns {Promise<Object>} - `content`, `format`, `from_lang`, `to_lang`, `report` (with `review` when asked)
 */
const translateFile = async ({ file, fromLang, toLang, review = false }) => {
  const form = new FormData();
  form.append('file', file);
  form.append('from_lang', fromLang);
  form.append('to_lang', toLang);
  if (review) form.append('review', 'on');

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

/**
 * GET / -- the backend's health check, behind the page's service-reachable indicator
 * @returns {Promise<Object>} - `{"message": "llm-translate is running"}`
 */
const health = async () => {
  const response = await http.get('/', { timeout: HEALTH_TIMEOUT_MS });
  return response.data;
};

export default { translateText, translateFile, speak, health };
