import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { userController } from '../controllers/userController';

export function ThemeToggle(props: { compact?: boolean }) {
  const { theme, effectiveTheme, setTheme } = useTheme();
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch (_) {}

  const [isOpen, setIsOpen] = createSignal(false);
  let dropdownRef: HTMLDivElement | undefined;

  const handleSelect = async (mode: 'light' | 'dark' | 'system') => {
    setTheme(mode);
    setIsOpen(false);

    if (authContext && authContext.user()) {
      try {
        const nextTheme = mode === 'system' ? 'light' : mode;
        const res = await userController.updateProfile(authContext.user()?.nama || '', undefined, nextTheme);
        const currentUser = authContext.user();
        if (currentUser) {
          authContext.login(localStorage.getItem('token') || '', {
            ...currentUser,
            theme: res.user.theme as string | undefined,
          });
        }
      } catch (err) {
        console.error('Gagal memperbarui tema di server:', err);
      }
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (dropdownRef && !dropdownRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  return (
    <div class="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen());
        }}
        class="inline-flex items-center justify-center p-2.5 rounded-xl bg-secondary-100/80 dark:bg-secondary-800/80 border border-secondary-200/80 dark:border-secondary-700/80 text-secondary-700 dark:text-secondary-200 hover:bg-secondary-200 dark:hover:bg-secondary-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/30 active:scale-95 shadow-sm"
        title={`Tema saat ini: ${theme() === 'system' ? 'Sistem' : theme() === 'dark' ? 'Gelap' : 'Terang'}`}
        aria-label="Pilih Mode Tema"
        aria-expanded={isOpen()}
        aria-haspopup="true"
      >
        {effectiveTheme() === 'dark' ? (
          <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg class="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
            />
          </svg>
        )}
      </button>

      <Show when={isOpen()}>
        <div
          class="origin-top-right absolute right-0 mt-2 w-36 rounded-xl bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 shadow-lg ring-1 ring-black/5 z-50 overflow-hidden animate-scale-in py-1"
          role="menu"
          aria-orientation="vertical"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('light')}
            class={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              theme() === 'light'
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            <svg class="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
            Terang
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('dark')}
            class={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              theme() === 'dark'
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            <svg class="w-4 h-4 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
            Gelap
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => handleSelect('system')}
            class={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2.5 transition-colors ${
              theme() === 'system'
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            <svg class="w-4 h-4 text-secondary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Sistem
          </button>
        </div>
      </Show>
    </div>
  );
}
