import { useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js';
import type { SharedKompensasiFilters } from '../components/kompensasi/sharedKompensasiFilters';
import TabKetidakhadiran from '../components/kompensasi/TabKetidakhadiran';
import TabPembayaran from '../components/kompensasi/TabPembayaran';
import TabRekaman from '../components/kompensasi/TabRekaman';
import TabRekap from '../components/kompensasi/TabRekap';
import { MainLayout } from '../components/MainLayout';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

type TabKey = 'ketidakhadiran' | 'rekaman' | 'pembayaran' | 'rekap';

const TABS: Array<{ key: TabKey; label: string; desc: string }> = [
  { key: 'ketidakhadiran', label: 'Ketidakhadiran', desc: 'Verifikasi data ketidakhadiran (Apel & BAP)' },
  { key: 'rekaman', label: 'Rekaman Kompensasi', desc: 'Riwayat kompensasi terverifikasi & manual' },
  { key: 'pembayaran', label: 'Riwayat Pembayaran', desc: 'Input, ubah, dan hapus pembayaran kompensasi' },
  { key: 'rekap', label: 'Rekap Kompensasi', desc: 'Rekap jam kompensasi per mahasiswa' },
];

function normalizeTab(value: string | null | undefined): TabKey {
  if (value === 'rekaman' || value === 'pembayaran' || value === 'rekap' || value === 'ketidakhadiran') {
    return value;
  }
  return 'ketidakhadiran';
}

export default function KetidakhadiranKompensasi() {
  const auth = useAuth();
  const workspace = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = createSignal<TabKey>(normalizeTab(searchParams.tab as string | undefined));

  // Filter bersama antar-tab (sumber kebenaran tunggal, diteruskan ke tiap tab).
  const [search, setSearch] = createSignal(searchParams.q ?? '');
  const [debouncedSearch, setDebouncedSearch] = createSignal(searchParams.q ?? '');
  const [prodiId, setProdiId] = createSignal<number | undefined>(
    searchParams.prodi ? Number(searchParams.prodi) || undefined : (workspace.selectedProdiId() ?? undefined),
  );
  const [tglDari, setTglDari] = createSignal(searchParams.dari ?? '');
  const [tglSampai, setTglSampai] = createSignal(searchParams.sampai ?? '');
  const [sumber, setSumber] = createSignal(searchParams.sumber ?? '');

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(searchTimer));

  createEffect(() => {
    const q = search();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setDebouncedSearch(q), 350);
  });

  const resetShared = () => {
    setSearch('');
    setDebouncedSearch('');
    setProdiId(workspace.selectedProdiId() ?? undefined);
    setTglDari('');
    setTglSampai('');
    setSumber('');
  };

  // Mirror filter bersama ke URL agar tahan refresh & bisa di-share/deep-link.
  createEffect(() => {
    setSearchParams(
      {
        tab: tab(),
        q: debouncedSearch() || undefined,
        prodi: prodiId()?.toString() ?? undefined,
        dari: tglDari() || undefined,
        sampai: tglSampai() || undefined,
        sumber: sumber() || undefined,
      },
      { replace: true },
    );
  });

  const filters: SharedKompensasiFilters = {
    search,
    setSearch,
    debouncedSearch,
    prodiId,
    setProdiId,
    tglDari,
    setTglDari,
    tglSampai,
    setTglSampai,
    sumber,
    setSumber,
    resetShared,
  };

  const switchTab = (key: TabKey) => {
    setTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  const canManage = () => auth.hasRole(['admin', 'super_admin', 'prodi']);
  const activeTab = () => tab();

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Ketidakhadiran & Kompensasi</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Pengelolaan terpadu ketidakhadiran mahasiswa, rekaman kompensasi, pembayaran, dan rekap.
          </p>
        </div>

        {/* Tab Bar */}
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <Tabs
            size="lg"
            active={tab()}
            onChange={switchTab}
            tabs={TABS.map((t) => ({ key: t.key, label: t.label, title: t.desc }))}
          />
          <Show when={!canManage()}>
            <span class="text-xs text-secondary-400 dark:text-secondary-300">
              Mode hanya-baca (verifikasi ketidakhadiran tetap tersedia)
            </span>
          </Show>
        </div>

        <Show when={activeTab() === 'ketidakhadiran'}>
          <TabKetidakhadiran filters={filters} />
        </Show>
        <Show when={activeTab() === 'rekaman'}>
          <TabRekaman filters={filters} canManage={canManage()} />
        </Show>
        <Show when={activeTab() === 'pembayaran'}>
          <TabPembayaran filters={filters} canManage={canManage()} />
        </Show>
        <Show when={activeTab() === 'rekap'}>
          <TabRekap filters={filters} canManage={canManage()} />
        </Show>
      </div>
    </MainLayout>
  );
}
