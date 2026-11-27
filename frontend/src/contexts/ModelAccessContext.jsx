import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import {
  DEFAULT_PRESET,
  loadAccess,
  saveAccess,
  clearAccess,
  setPresetsInfo,
  getPresetsInfo,
} from '../services/modelAccess';

/**
 * The page's model access (epic 08): whether the server is a public demo, the presets it
 * offers, and the visitor's preset, keys (one per provider, EST-9222) and remember
 * choice. The credentials themselves are stored by `services/modelAccess` (session
 * storage, or local storage when remembered); this context mirrors them for the page
 * and fetches `GET /v1/presets` once.
 *
 * When the presets list cannot be reached, or the server is not a public demo, the page
 * keeps the env-key behavior: no panel, no gate, speech as before.
 */
const ModelAccessContext = createContext(null);

// Components rendered without the provider (older tests, isolated renders) keep the
// env-key behavior instead of crashing.
const ENV_MODE = {
  publicDemo: false,
  presets: [],
  preset: DEFAULT_PRESET,
  keys: {},
  key: '',
  remember: false,
  hasCredential: false,
  speechAvailable: true,
  speechNote: '',
  setPreset: () => {},
  setKey: () => {},
  setRemember: () => {},
  clear: () => {},
};

export const useModelAccess = () => useContext(ModelAccessContext) ?? ENV_MODE;

export const ModelAccessProvider = ({ children }) => {
  const [access, setAccess] = useState(loadAccess);
  const [info, setInfo] = useState(getPresetsInfo);

  useEffect(() => {
    let live = true;
    api.presets().then(
      (body) => {
        if (!live) return;
        const next = setPresetsInfo(body);
        setInfo(next);
        // A preset stored by an older page that the server no longer lists goes back to
        // demo, and the vanished preset's key is dropped: it belonged to that provider.
        // Keys of presets the server still lists stay.
        if (next.publicDemo) {
          setAccess((prev) => {
            if (next.presets.some((p) => p.id === prev.preset)) return prev;
            const listed = new Set(next.presets.map((p) => p.id));
            const keys = Object.fromEntries(Object.entries(prev.keys).filter(([id]) => listed.has(id)));
            const repaired = { ...prev, preset: DEFAULT_PRESET, keys, key: keys[DEFAULT_PRESET] || '' };
            saveAccess(repaired);
            return repaired;
          });
        }
      },
      () => {
        if (live) setInfo(setPresetsInfo(null));
      }
    );
    return () => {
      live = false;
    };
  }, []);

  const update = (patch) => {
    setAccess((prev) => {
      const next = { ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) };
      // The field always shows this preset's own key; hasOwn so an id like `toString`
      // never finds a prototype member and fakes a key.
      next.key = Object.hasOwn(next.keys, next.preset) ? next.keys[next.preset] : '';
      saveAccess(next); // idempotent, so React's double-invoked updater is safe
      return next;
    });
  };

  const clear = () => {
    clearAccess();
    setAccess(loadAccess());
  };

  const selected = info.presets.find((p) => p.id === access.preset);
  const speechAvailable = !info.publicDemo || Boolean(selected?.speech);
  const speechNote = speechAvailable
    ? ''
    : `Speech is not available for ${selected?.label ?? 'this preset'}.`;

  const value = {
    publicDemo: info.publicDemo,
    presets: info.presets,
    ...access,
    hasCredential: Boolean(access.preset && access.key),
    speechAvailable,
    speechNote,
    // Each preset keeps its own key: switching shows the saved one, never another's.
    setPreset: (preset) => update({ preset }),
    setKey: (key) => update((prev) => {
      const trimmed = key.trim();
      const entries = Object.entries(prev.keys).filter(([id]) => id !== prev.preset);
      if (trimmed) entries.push([prev.preset, trimmed]);
      return { keys: Object.fromEntries(entries) };
    }),
    setRemember: (remember) => update({ remember }),
    clear,
  };

  return <ModelAccessContext.Provider value={value}>{children}</ModelAccessContext.Provider>;
};
