import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { createEdenQuery } from '../hooks/useEdenQuery';
import { fetchApi } from '../utils/api';
import { eden } from '../utils/eden';
import { ThemeToggle } from './ThemeToggle';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface SafeProdi {
  id: number;
  kode: string;
  nama: string;
  jenjang: string;
}

interface SafePeriode {
  id: string;
  nama: string;
}

export function Navbar(props: { onToggleSidebar: () => void }) {
  const auth = useAuth();
  const workspace = useWorkspace();
  const role = () => auth.user()?.role;

  // Notifications state
  const [notifications, setNotifications] = createSignal<NotificationItem[]>([]);
  const [showNotifPopover, setShowNotifPopover] = createSignal(false);

  const fetchNotifs = async () => {
    if (!auth.user()) return;
    try {
      const data = await fetchApi<NotificationItem[]>('/notifications');
      setNotifications(data || []);
    } catch {
      // ignore
    }
  };

  createEffect(() => {
    if (auth.user()) {
      fetchNotifs();
      const timer = setInterval(fetchNotifs, 10000);
      onCleanup(() => clearInterval(timer));
    }
  });

  const unreadCount = () => notifications().filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: number) => {
    try {
      await fetchApi(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications().map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  // Load Prodis for admin global filter
  const prodis = createEdenQuery<{ data: SafeProdi[]; meta?: object }>(() => ({
    queryKey: ['prodi', { page: 1, limit: 100 }],
    queryFn: () => eden.prodi.get({ $query: { page: 1, limit: 100 } }),
    enabled: role() === 'admin',
  }));

  // Load Periodes for admin global filter
  const periodes = createEdenQuery<{ data: SafePeriode[]; meta?: object }>(() => ({
    queryKey: ['periode-akademik', { page: 1, limit: 100 }],
    queryFn: () => eden['periode-akademik'].get({ $query: { page: 1, limit: 100 } }),
    enabled: role() === 'admin',
  }));

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
              <For each={prodis.data?.data ?? []}>
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
              <For each={periodes.data?.data ?? []}>
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
        {/* Notification Bell Dropdown */}
        <div class="relative">
          <button
            onClick={() => setShowNotifPopover(!showNotifPopover())}
            class="p-2 rounded-xl text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-800 focus:outline-none relative transition-colors"
            title="Notifikasi"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <Show when={unreadCount() > 0}>
              <span class="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            </Show>
          </button>

          {/* Notif Popover */}
          <Show when={showNotifPopover()}>
            <div class="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-2xl shadow-xl z-50 p-4 flex flex-col gap-3">
              <div class="flex items-center justify-between border-b pb-2">
                <h4 class="text-sm font-bold text-secondary-900 dark:text-white">Notifikasi</h4>
                <span class="text-xs text-secondary-400">{unreadCount()} belum dibaca</span>
              </div>
              <div class="flex flex-col gap-2 max-h-72 overflow-y-auto">
                <For
                  each={notifications()}
                  fallback={<p class="text-xs text-secondary-400 text-center py-4">Belum ada notifikasi.</p>}
                >
                  {(item) => (
                    <div
                      onClick={() => handleMarkRead(item.id)}
                      class={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        item.isRead
                          ? 'bg-secondary-50/50 dark:bg-secondary-800/30 border-secondary-100 dark:border-secondary-800 text-secondary-600 dark:text-secondary-400'
                          : 'bg-brand-50/50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 font-semibold text-secondary-900 dark:text-white'
                      }`}
                    >
                      <div class="flex justify-between items-start gap-1">
                        <span class="font-bold">{item.title}</span>
                        <span class="text-[10px] text-secondary-400">
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p class="mt-1 text-[11px] font-normal leading-relaxed">{item.message}</p>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>
        </div>

        {/* Global Theme Mode Selector */}
        <ThemeToggle />
      </div>
    </header>
  );
}
