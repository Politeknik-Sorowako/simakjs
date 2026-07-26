import { createResource, For, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';
import { ThemeToggle } from './ThemeToggle';

export function Navbar(props: { onToggleSidebar: () => void }) {
  const auth = useAuth();
  const workspace = useWorkspace();
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

  return (
    <header class="sticky top-0 z-40 h-16 backdrop-blur-md bg-white/80 dark:bg-secondary-900/80 border-b border-secondary-200/80 dark:border-secondary-800/80 flex items-center justify-between px-6 shadow-sm transition-colors duration-200">
      <div class="flex items-center gap-3">
        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => props.onToggleSidebar()}
          aria-label="Buka menu navigasi"
          class="p-2 rounded-xl text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-800 focus:outline-none md:hidden transition-colors"
        >
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h2 class="text-md font-bold text-secondary-900 dark:text-white hidden sm:block">Sistem Informasi Akademik</h2>
      </div>

      {/* Global Filter for Admin */}
      <Show when={role() === 'admin'}>
        <div class="hidden md:flex items-center gap-3 bg-secondary-100/60 dark:bg-secondary-800/40 px-3 py-1.5 rounded-xl border border-secondary-200/80 dark:border-secondary-700/80">
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-secondary-500 font-semibold dark:text-secondary-400">Prodi:</span>
            <select
              onChange={(e) => {
                const val = e.currentTarget.value;
                workspace.setSelectedProdiId(val ? parseInt(val) : null);
              }}
              class="bg-transparent border-0 font-bold text-secondary-800 dark:text-secondary-200 focus:outline-none focus:ring-0 max-w-[150px] truncate cursor-pointer"
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
          <div class="h-4 w-px bg-secondary-300 dark:bg-secondary-700"></div>
          <div class="flex items-center gap-1.5 text-xs">
            <span class="text-secondary-500 font-semibold dark:text-secondary-400">Periode:</span>
            <select
              onChange={(e) => {
                const val = e.currentTarget.value;
                workspace.setSelectedPeriodeId(val || null);
              }}
              class="bg-transparent border-0 font-bold text-secondary-800 dark:text-secondary-200 focus:outline-none focus:ring-0 max-w-[150px] truncate cursor-pointer"
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
        {/* Global Theme Mode Selector */}
        <ThemeToggle />
      </div>
    </header>
  );
}
