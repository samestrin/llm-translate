import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

// The visitor's own choice, or null when they have not made one yet.
const readChoice = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : null;
};

const systemQuery = () => (typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null);

// Follows prefers-color-scheme until the visitor toggles; from then on the choice is
// stored and wins. index.html applies the same rule before React loads, so there is no flash.
export const ThemeProvider = ({ children }) => {
  const [choice, setChoice] = useState(readChoice);
  const [systemDark, setSystemDark] = useState(() => Boolean(systemQuery()?.matches));

  useEffect(() => {
    const query = systemQuery();
    if (!query) return undefined;
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const darkMode = choice ? choice === 'dark' : systemDark;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.colorScheme = darkMode ? 'dark' : 'light';
  }, [darkMode]);

  const toggleTheme = useCallback(() => {
    const next = darkMode ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    setChoice(next);
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
