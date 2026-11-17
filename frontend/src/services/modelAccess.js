/**
 * The visitor's model access: the preset and key (or demo code) they bring, and whether
 * this server is a public demo that requires one (epic 08).
 *
 * The key lives in the browser only: session storage by default, local storage only when
 * the visitor ticks "remember on this device". It is sent per request in a header
 * (`X-Model-Key`, or `X-Demo-Code` for the demo preset) and never in a URL or body.
 * `clearAccess` wipes it from both storages.
 *
 * The mode comes from `GET /v1/presets` (`setPresetsInfo`); until the server answers, or
 * when it cannot be reached, the page keeps the env-key behavior: no panel, no gate.
 */

export const DEFAULT_PRESET = 'demo';

// Non-secret preferences (preset id, remember) and the secret itself, stored apart so
// clearing or toggling remember can move the key without touching anything else.
const PREFS_KEY = 'modelAccess';
const SECRET_KEY = 'modelAccessKey';

const read = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    return null; // storage unavailable (private mode): behave as if nothing was stored
  }
};

const write = (storage, key, value) => {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    // storage unavailable: the key then lives only in the page's state for this visit
  }
};

const remove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    // as above
  }
};

/** The stored `{preset, key, remember}`; the demo preset and no key when nothing is stored. */
export const loadAccess = () => {
  let prefs = {};
  try {
    prefs = JSON.parse(read(localStorage, PREFS_KEY)) || {};
  } catch {
    prefs = {};
  }
  const preset = typeof prefs.preset === 'string' && prefs.preset ? prefs.preset : DEFAULT_PRESET;
  const remember = prefs.remember === true;
  const key = read(remember ? localStorage : sessionStorage, SECRET_KEY) || '';
  return { preset, key, remember };
};

/** Store the access: the key in the storage remember names, removed from the other one. */
export const saveAccess = ({ preset, key, remember }) => {
  write(localStorage, PREFS_KEY, JSON.stringify({ preset, remember: remember === true }));
  const [keep, drop] = remember ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
  write(keep, SECRET_KEY, key);
  remove(drop, SECRET_KEY);
};

/** Wipe the key from both storages and reset the preset and remember. */
export const clearAccess = () => {
  remove(localStorage, PREFS_KEY);
  remove(localStorage, SECRET_KEY);
  remove(sessionStorage, SECRET_KEY);
};

/** Whether a key or demo code is stored for a preset. */
export const hasCredential = () => {
  const { preset, key } = loadAccess();
  return Boolean(preset && key);
};

/** The credential headers for a model call; empty when none is stored. Never a URL or body field. */
export const accessHeaders = () => {
  const { preset, key } = loadAccess();
  if (!preset || !key) return {};
  return preset === DEFAULT_PRESET
    ? { 'X-Demo-Code': key }
    : { 'X-Model-Preset': preset, 'X-Model-Key': key };
};

// What the server told us: `{publicDemo, presets}`. Off until a well-formed public response.
let info = { publicDemo: false, presets: [] };

/** Record the `GET /v1/presets` body; anything malformed or absent means env-key mode. */
export const setPresetsInfo = (body) => {
  info = body?.public_demo === true && Array.isArray(body.presets)
    ? { publicDemo: true, presets: body.presets }
    : { publicDemo: false, presets: [] };
  return info;
};

export const getPresetsInfo = () => info;

export const isPublicDemo = () => info.publicDemo;

export const MISSING_CREDENTIAL_MESSAGE = 'Enter a demo code or your own API key above to translate or listen.';

/**
 * The client-side gate every model call passes before anything is sent: in the public
 * demo a call without a key or code asks for one instead of going out. The server gates
 * every route too; this keeps the page from spending a request to learn that.
 */
export const assertModelCredential = () => {
  if (info.publicDemo && !hasCredential()) {
    const error = new Error(MISSING_CREDENTIAL_MESSAGE);
    error.type = 'missing_credentials';
    throw error;
  }
};
