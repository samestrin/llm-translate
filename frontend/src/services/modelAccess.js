/**
 * The visitor's model access: the preset and key (or demo code) they bring, and whether
 * this server is a public demo that requires one (epic 08).
 *
 * Each preset keeps its own key (EST-9222), so switching provider and back restores that
 * provider's key instead of forgetting it; a key is still sent only with its own preset's
 * headers. The keys live in the browser only: session storage by default, local storage
 * only when the visitor ticks "remember on this device". They are sent per request in a
 * header (`X-Model-Key`, or `X-Demo-Code` for the demo preset) and never in a URL or body.
 * `clearAccess` wipes every key from both storages.
 *
 * The mode comes from `GET /v1/presets` (`setPresetsInfo`); until the server answers, or
 * when it cannot be reached, the page keeps the env-key behavior: no panel, no gate.
 */

export const DEFAULT_PRESET = 'demo';

// Non-secret preferences (preset id, remember) and the secrets themselves, stored apart so
// clearing or toggling remember can move the keys without touching anything else.
const PREFS_KEY = 'modelAccess';
// The per-preset map `{<preset>: <key>}` as JSON. A separate item from the pre-EST-9222
// single key below, so migration never has to guess whether a raw key is JSON.
const KEYS_KEY = 'modelAccessKeys';
// The old single raw key, read once on load and placed under its stored preset; every
// save and clear removes it from both storages.
const LEGACY_KEY = 'modelAccessKey';

// When storage refuses a read or write (Safari "Block All Cookies", storage disabled),
// the last written access lives in module memory for this visit, so the gate and the
// headers agree with what the panel shows instead of asking for a key already entered.
let memoryAccess = null;
let storageBlocked = false;

const read = (storage, key) => {
  try {
    return storage.getItem(key);
  } catch {
    storageBlocked = true;
    return null; // loadAccess falls back to memoryAccess below
  }
};

const write = (storage, key, value) => {
  try {
    if (value) storage.setItem(key, value);
    else storage.removeItem(key);
  } catch {
    storageBlocked = true; // the key lives in memoryAccess for this visit
  }
};

const remove = (storage, key) => {
  try {
    storage.removeItem(key);
  } catch {
    storageBlocked = true; // as above
  }
};

/** The stored keys map, migrating the old single-key shape under its stored preset. */
const readKeys = (storage, preset) => {
  const raw = read(storage, KEYS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        // fromEntries keeps every id an own property, `__proto__` included.
        return Object.fromEntries(
          Object.entries(parsed)
            .filter(([, key]) => typeof key === 'string' && key.trim())
            .map(([id, key]) => [id, key.trim()])
        );
      }
    } catch {
      // A corrupt map is no map; the panel asks for a key again.
    }
    return {};
  }
  const legacy = read(storage, LEGACY_KEY);
  return legacy && legacy.trim() ? Object.fromEntries([[preset, legacy.trim()]]) : {};
};

/**
 * The stored `{preset, keys, remember}` plus the selected preset's own `key` (empty when
 * it has none); the demo preset and no keys when nothing is stored.
 */
export const loadAccess = () => {
  let prefs = {};
  try {
    prefs = JSON.parse(read(localStorage, PREFS_KEY)) || {};
  } catch {
    prefs = {};
  }
  const preset = typeof prefs.preset === 'string' && prefs.preset ? prefs.preset : DEFAULT_PRESET;
  const remember = prefs.remember === true;
  const keys = readKeys(remember ? localStorage : sessionStorage, preset);
  if (storageBlocked && memoryAccess) return { ...memoryAccess, keys: { ...memoryAccess.keys } };
  // hasOwn: a preset id like `toString` must not find a prototype member and fake a key.
  return { preset, keys, key: Object.hasOwn(keys, preset) ? keys[preset] : '', remember };
};

/**
 * Store the access: the keys map in the storage remember names, removed from the other
 * one. With `keys` it replaces the whole map; with only `key` it sets (or, when empty,
 * removes) that preset's entry and keeps the other presets' keys. The old single-key
 * item is removed from both storages.
 */
export const saveAccess = ({ preset, key, keys, remember }) => {
  let source;
  if (keys !== undefined) {
    source = keys;
  } else {
    // A pasted key can carry a trailing newline; whitespace never reaches a header.
    const trimmed = (key || '').trim();
    const entries = Object.entries(loadAccess().keys).filter(([id]) => id !== preset);
    if (trimmed) entries.push([preset, trimmed]);
    source = Object.fromEntries(entries);
  }
  const clean = Object.fromEntries(
    Object.entries(source)
      .filter(([, value]) => typeof value === 'string' && value.trim())
      .map(([id, value]) => [id, value.trim()])
  );
  const rem = remember === true;
  memoryAccess = { preset, keys: clean, key: Object.hasOwn(clean, preset) ? clean[preset] : '', remember: rem };
  write(localStorage, PREFS_KEY, JSON.stringify({ preset, remember: rem }));
  const [keep, drop] = rem ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
  write(keep, KEYS_KEY, Object.keys(clean).length ? JSON.stringify(clean) : '');
  remove(drop, KEYS_KEY);
  remove(localStorage, LEGACY_KEY);
  remove(sessionStorage, LEGACY_KEY);
};

/** Wipe every key from both storages (old single-key item included) and reset the preset and remember. */
export const clearAccess = () => {
  memoryAccess = null;
  storageBlocked = false;
  remove(localStorage, PREFS_KEY);
  for (const storage of [localStorage, sessionStorage]) {
    remove(storage, KEYS_KEY);
    remove(storage, LEGACY_KEY);
  }
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
