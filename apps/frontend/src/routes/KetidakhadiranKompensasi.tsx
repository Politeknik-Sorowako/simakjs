import { useSearchParams } from '@solidjs/router';
import { createSignal, For, onMount, Show } from 'solid-js';
import TabKetidakhadiran from '../components/kompensasi/TabKetidakhadiran';
import TabPembayaran from '../components/kompensasi/TabPembayaran';
import TabRekaman from '../components/kompensasi/TabRekaman';
import TabRekap from '../components/kompensasi/TabRekap';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = createSignal<TabKey>(normalizeTab(searchParams.tab as string | undefined));

  onMount(() => {
    const initial = normalizeTab(searchParams.tab as string | undefined);
    setSearchParams({ tab: initial }, { replace: true });
  });

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
          <div class="flex flex-wrap gap-1.5 p-1.5 rounded-full bg-white dark:bg-secondary-900 border border-secondary-200/80 dark:border-secondary-800 shadow-sm backdrop-blur-md">
            <ForTabs active={activeTab} onChange={switchTab} />
          </div>
          <Show when={!canManage()}>
            <span class="text-xs text-secondary-400 dark:text-secondary-300">
              Mode hanya-baca (verifikasi ketidakhadiran tetap tersedia)
            </span>
          </Show>
        </div>

        <Show when={activeTab() === 'ketidakhadiran'}>
          <TabKetidakhadiran />
        </Show>
        <Show when={activeTab() === 'rekaman'}>
          <TabRekaman canManage={canManage()} />
        </Show>
        <Show when={activeTab() === 'pembayaran'}>
          <TabPembayaran canManage={canManage()} />
        </Show>
        <Show when={activeTab() === 'rekap'}>
          <TabRekap canManage={canManage()} />
        </Show>
      </div>
    </MainLayout>
  );
}

function ForTabs(props: { active: () => TabKey; onChange: (key: TabKey) => void }) {
  return (
    <For each={TABS}>
      {(item) => {
        const isActive = () => props.active() === item.key;
        return (
          <button
            type="button"
            onClick={() => props.onChange(item.key)}
            title={item.desc}
            class={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-150 active:scale-95 ${
              isActive()
                ? 'bg-primary-800 text-white shadow-md dark:bg-primary-600'
                : 'text-secondary-500 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800'
            }`}
          >
            {item.label}
          </button>
        );
      }}
    </For>
  );
}
