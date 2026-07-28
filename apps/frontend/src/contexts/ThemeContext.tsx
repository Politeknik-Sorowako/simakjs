import { createContext, createEffect, createMemo, createSignal, JSX, onCleanup, onMount, useContext } from 'solid-js';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: () => ThemeMode;
  effectiveTheme: () => 'light' | 'dark';
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>();

const STORAGE_KEY = 'simak_theme';

export function ThemeProvider(props: { children: JSX.Element }) {
  const getInitialTheme = (): ThemeMode => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved;
      }
    } catch (_) {}
    return 'system';
  };

  const [theme, setThemeSignal] = createSignal<ThemeMode>(getInitialTheme());
  const [systemIsDark, setSystemIsDark] = createSignal<boolean>(
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false,
  );

  onMount(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    onCleanup(() => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    });
  });

  const effectiveTheme = createMemo<'light' | 'dark'>(() => {
    const current = theme();
    if (current === 'system') {
      return systemIsDark() ? 'dark' : 'light';
    }
    return current;
  });

  createEffect(() => {
    const isDark = effectiveTheme() === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeSignal(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
      localStorage.setItem('theme', mode);
    } catch (_) {}
  };

  const toggleTheme = () => {
    const next = effectiveTheme() === 'light' ? 'dark' : 'light';
    setTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
