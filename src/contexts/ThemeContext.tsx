// Modified by SAIPH: three-state preference with a separately resolved theme.
import React, { createContext, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

export type ThemePreference = 'dark' | 'light' | 'system';
export type Theme = 'light' | 'dark';

export interface DarkModeContextType {
  preference: ThemePreference;
  theme: Theme;
  setPreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = 'saiph.theme';
const LEGACY_STORAGE_KEY = 'theme';
const MEDIA_QUERY = '(prefers-color-scheme: dark)';

const isPreference = (value: string | null): value is ThemePreference =>
  value === 'dark' || value === 'light' || value === 'system';

const resolveTheme = (preference: ThemePreference): Theme =>
  preference === 'system'
    ? (window.matchMedia?.(MEDIA_QUERY).matches ? 'dark' : 'light')
    : preference;

const readPreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'dark';

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isPreference(saved)) return saved;

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === 'dark' || legacy === 'light') {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    // Storage can be blocked; dark remains the deterministic brand default.
  }

  return 'dark';
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#000000' : '#FFFFFF');
};

export const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ children }: { children: React.ReactNode }) {
  const initialPreference = useMemo(readPreference, []);
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === 'undefined' ? 'dark' : resolveTheme(initialPreference),
  );

  const setPreference = useCallback((nextPreference: ThemePreference) => {
    const root = document.documentElement;
    root.classList.add('theme-switching');
    setPreferenceState(nextPreference);
    try {
      localStorage.setItem(STORAGE_KEY, nextPreference);
    } catch {
      // The in-memory preference still works when storage is unavailable.
    }
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')));
  }, []);

  useLayoutEffect(() => {
    const resolved = resolveTheme(preference);
    applyTheme(resolved);
    setTheme(resolved);
  }, [preference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MEDIA_QUERY);
    const handleSystemChange = () => {
      if (preference !== 'system') return;
      const resolved = mediaQuery.matches ? 'dark' : 'light';
      applyTheme(resolved);
      setTheme(resolved);
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [preference]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && isPreference(event.newValue)) {
        setPreferenceState(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const toggleTheme = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  }, [setPreference, theme]);

  const contextValue = useMemo(
    () => ({ preference, theme, setPreference, toggleTheme }),
    [preference, theme, setPreference, toggleTheme],
  );

  return <DarkModeContext.Provider value={contextValue}>{children}</DarkModeContext.Provider>;
}
