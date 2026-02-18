import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

/**
 * Hook for managing theme state and persistence
 *
 * Features:
 * - Persists theme choice to localStorage
 * - Supports 'light', 'dark', and 'system' (auto) modes
 * - Listens to system preference changes
 * - Updates document data-theme attribute
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initialize from localStorage or default to 'system'
    const stored = localStorage.getItem('theme') as Theme | null;
    return stored || 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(() => {
    // Detect initial system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers (Safari < 14)
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Calculate effective theme (resolve 'system' to actual theme)
  const effectiveTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove old theme attribute
    root.removeAttribute('data-theme');

    // Set new theme
    if (theme === 'system') {
      // Don't set data-theme - let CSS media query handle it
      // This allows @media (prefers-color-scheme: dark) to work
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme, effectiveTheme]);

  // Wrapper for setTheme that persists to localStorage
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  return {
    theme,
    setTheme,
    effectiveTheme
  };
}
