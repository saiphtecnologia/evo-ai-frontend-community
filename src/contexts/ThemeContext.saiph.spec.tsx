// SAIPH regression coverage for theme preference, migration, and system mode.
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DarkModeProvider } from './ThemeContext';
import { useDarkMode } from '@/hooks/useDarkMode';

type MediaListener = (event: MediaQueryListEvent) => void;

describe('SAIPH theme preference', () => {
  let systemIsDark = false;
  const listeners = new Set<MediaListener>();
  let storage = new Map<string, string>();

  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
      key: (index: number) => [...storage.keys()][index] ?? null,
      get length() { return storage.size; },
    });
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    listeners.clear();
    systemIsDark = false;

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('matchMedia', () => ({
      get matches() { return systemIsDark; },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: (_type: string, listener: MediaListener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: MediaListener) => listeners.delete(listener),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  const wrapper = ({ children }: { children: ReactNode }) => (
    <DarkModeProvider>{children}</DarkModeProvider>
  );

  it('uses dark as the deterministic default', () => {
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    expect(result.current.preference).toBe('dark');
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('migrates the legacy explicit preference once', () => {
    localStorage.setItem('theme', 'light');
    const { result } = renderHook(() => useDarkMode(), { wrapper });
    expect(result.current.preference).toBe('light');
    expect(localStorage.getItem('saiph.theme')).toBe('light');
  });

  it('persists system mode and follows operating-system changes', () => {
    const { result } = renderHook(() => useDarkMode(), { wrapper });

    act(() => result.current.setPreference('system'));
    expect(localStorage.getItem('saiph.theme')).toBe('system');
    expect(result.current.theme).toBe('light');

    systemIsDark = true;
    act(() => listeners.forEach(listener => listener({ matches: true } as MediaQueryListEvent)));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
