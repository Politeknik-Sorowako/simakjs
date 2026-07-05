import { createResource, For, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';
import { userController } from '../controllers/userController';

export function Navbar(props: { onToggleSidebar: () => void }) {
  const auth = useAuth();
  const workspace = useWorkspace();
  const currentTheme = () => auth.user()?.theme || 'light';
  const role = () => auth.user()?.role;

  // Load Prodis for admin global filter
  const [prodis] = createResource(
    () => role() === 'admin',
    async () => {
      try {
        const res = await prodiController.getAll(undefined, 1, 100);
        return res.data;
      } catch (_) {
        return [];
      }
    },
  );

  // Load Periodes for admin global filter
  const [periodes] = createResource(
    () => role() === 'admin',
    async () => {
      try {
        const res = await periodeAkademikController.getAll(undefined, 1, 100);
        return res.data;
      } catch (_) {
        return [];
      }
    },
  );

  const toggleTheme = async () => {
    const nextTheme = auth.theme() === 'light' ? 'dark' : 'light';
    auth.setTheme(nextTheme);
    try {
      if (auth.user()) {
        const res = await userController.updateProfile(auth.user()?.nama || '', undefined, nextTheme);
        auth.login(localStorage.getItem('token') || '', {
          ...auth.user()!,
          theme: res.user.theme,
        });
      }
    } catch (err) {
      console.error('Gagal memperbarui tema di server:', err);
    }
  };

  return (
    <header class="h-16 bg-white dark:bg-brand-gray-900 border-b border-brand-gray-100 dark:border-brand-gray-800 flex items-center justify-between px-6 shadow-sm transition-colors duration-200">
      <div class="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => props.onToggleSidebar()}
          class="p-2 rounded-lg text-brand-gray-500 hover:bg-brand-gray-100 dark:hover:bg-brand-gray-800 focus:outline-none md:hidden"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h2 class="text-md font-bold text-brand-gray-800 dark:text-white hidden sm:block">Sistem Informasi Akademik</h2>
      </div>

      {/* Global Filter for Admin */}
      <Show when={role() === 'admin'}>
        <div class="hidden md:flex items-center gap-3 bg-brand-gray-50 dark:bg-brand-gray-800/40 px-3 py-1.5 rounded-xl border border-brand-gray-200 dark:border-brand-gray-800">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-brand-gray-500 font-semibold dark:text-brand-gray-400">Prodi:</span>
            <select
              onChange={(e) => {
                const val = e.currentTarget.value;
                workspace.setSelectedProdiId(val ? parseInt(val) : null);
              }}
              class="bg-transparent border-0 font-bold text-brand-gray-700 dark:text-gray-300 focus:outline-none focus:ring-0 max-w-[150px] truncate"
            >
              <option value="" selected={workspace.selectedProdiId() === null}>
                Semua Prodi
              </option>
              <For each={prodis()}>
                {(p) => (
                  <option value={p.id} selected={workspace.selectedProdiId() === p.id}>
                    {p.nama}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="h-4 w-px bg-brand-gray-300 dark:bg-brand-gray-700"></div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-brand-gray-500 font-semibold dark:text-brand-gray-400">Periode:</span>
            <select
              onChange={(e) => {
                const val = e.currentTarget.value;
                workspace.setSelectedPeriodeId(val || null);
              }}
              class="bg-transparent border-0 font-bold text-brand-gray-700 dark:text-gray-300 focus:outline-none focus:ring-0 max-w-[150px] truncate"
            >
              <option value="" selected={workspace.selectedPeriodeId() === null}>
                Semua Periode
              </option>
              <For each={periodes()}>
                {(p) => (
                  <option value={p.id} selected={workspace.selectedPeriodeId() === p.id}>
                    {p.nama}
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>
      </Show>

      <div class="flex items-center gap-4">
        {/* Night Mode Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          class="p-2.5 rounded-xl bg-brand-gray-100 dark:bg-brand-gray-800 border border-brand-gray-200 dark:border-brand-gray-700 text-brand-gray-700 dark:text-white hover:bg-brand-gray-200 dark:hover:bg-brand-gray-750 transition-all focus:outline-none shadow-sm"
          title="Beralih Mode Gelap/Terang"
        >
          {auth.theme() === 'light' ? (
            <svg class="w-5 h-5 text-brand-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
