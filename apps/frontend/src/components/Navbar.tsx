import { useAuth } from '../contexts/AuthContext';
import { userController } from '../controllers/userController';

export function Navbar(props: { onToggleSidebar: () => void }) {
  const auth = useAuth();
  const currentTheme = () => auth.user()?.theme || 'light';

  const toggleTheme = async () => {
    const nextTheme = currentTheme() === 'light' ? 'dark' : 'light';
    try {
      const res = await userController.updateProfile(auth.user()?.nama || '', nextTheme);
      auth.login(localStorage.getItem('token') || '', {
        ...auth.user()!,
        theme: res.user.theme,
      });
    } catch (err) {
      console.error('Gagal memperbarui tema di server:', err);
    }
  };

  return (
    <header class="h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between px-6 shadow-sm transition-colors duration-200">
      <div class="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button 
          onClick={() => props.onToggleSidebar()}
          class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none md:hidden"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h2 class="text-md font-bold text-gray-800 dark:text-white hidden sm:block">Sistem Informasi Akademik</h2>
      </div>

      <div class="flex items-center gap-4">
        {/* Night Mode Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          class="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 focus:outline-none transition-colors"
          title="Beralih Mode Gelap/Terang"
        >
          {currentTheme() === 'light' ? (
            <svg class="w-5.5 h-5.5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg class="w-5.5 h-5.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          )}
        </button>

        <span class="text-xs bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 px-3 py-1 rounded-full text-blue-700 dark:text-blue-400 font-semibold uppercase tracking-wider">
          {auth.user()?.role}
        </span>
      </div>
    </header>
  );
}
