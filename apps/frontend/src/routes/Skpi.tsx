import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import TabPenerbitan from '../components/skpi/TabPenerbitan';
import TabRekaman from '../components/skpi/TabRekaman';
import TabVerifikasi from '../components/skpi/TabVerifikasi';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Tabs } from '../components/ui/Tabs';
import { useAuth } from '../contexts/AuthContext';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { skpiController } from '../controllers/skpiController';

type TabKey = 'rekaman' | 'verifikasi' | 'penerbitan';

const TAB_LABEL: Record<TabKey, string> = {
  rekaman: 'Rekaman',
  verifikasi: 'Verifikasi',
  penerbitan: 'Penerbitan',
};

/**
 * Halaman SKPI terpadu — shell tab per peran:
 * mahasiswa = Rekaman (+ ringkasan dokumen & cetak);
 * dosen PA = Verifikasi;
 * staf-verifier = Rekaman, Verifikasi, Penerbitan.
 */
export default function Skpi() {
  const auth = useAuth();
  const isMahasiswaView = () => auth.hasRole(['mahasiswa']);
  const isStaffVerifier = () => auth.hasRole(['super_admin', 'admin', 'prodi', 'kaprodi', 'kemahasiswaan']);
  const isDosen = () => auth.hasRole(['dosen']);

  const tabs = (): TabKey[] => {
    if (isMahasiswaView()) return ['rekaman'];
    const list: TabKey[] = [];
    if (isStaffVerifier()) list.push('rekaman');
    if (isDosen() || isStaffVerifier()) list.push('verifikasi');
    if (isStaffVerifier()) list.push('penerbitan');
    return list;
  };

  const [activeTab, setActiveTab] = createSignal<TabKey>('rekaman');
  // Dosen PA hanya punya tab Verifikasi — jatuh ke tab pertama yang tersedia.
  const effectiveTab = (): TabKey => {
    const available = tabs();
    return available.includes(activeTab()) ? activeTab() : (available[0] ?? 'rekaman');
  };

  // ── Ringkasan dokumen (khusus mahasiswa) ───────────────────────────────────
  const [mhsProfile] = createResource(
    () => (isMahasiswaView() ? auth.user()?.email : null),
    async (mail) => {
      if (!mail) return null;
      const res = await mahasiswaController.getAll(mail, 1, 1);
      return res.data[0] || null;
    },
  );

  const [dokumen, { refetch: refetchDokumen }] = createResource(
    () => mhsProfile()?.id,
    async (id) => (id ? skpiController.getDokumen(id) : null),
  );

  const cetakDisabledReason = () => {
    const d = dokumen();
    if (!d) return null;
    if (d.syarat.terpenuhi) return null;
    return d.syarat.alasan ?? 'Syarat penerbitan SKPI belum terpenuhi.';
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header + tab bar */}
        <div class="bg-white p-6 rounded-2xl border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800">
          <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
            SKPI — Pencapaian Kegiatan Mahasiswa
          </h1>
          <p class="mt-1 text-sm text-secondary-500">
            <Show
              when={!isMahasiswaView()}
              fallback="Kelola rekaman pelatihan, seminar, organisasi, dan prestasi Anda. Rekaman yang disetujui verifikator menjadi isi dokumen SKPI."
            >
              Rekaman kegiatan, verifikasi, dan penerbitan tanda tangan SKPI dalam satu halaman.
            </Show>
          </p>

          <Show when={tabs().length > 1}>
            <div class="mt-4">
              <Tabs
                size="md"
                active={effectiveTab()}
                onChange={setActiveTab}
                tabs={tabs().map((tab) => ({
                  key: tab,
                  label: TAB_LABEL[tab],
                }))}
              />
            </div>
          </Show>
        </div>

        {/* Ringkasan dokumen + cetak — khusus mahasiswa */}
        <Show when={isMahasiswaView() && dokumen()}>
          <div class="bg-white p-6 rounded-2xl border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Kegiatan Terverifikasi</p>
                <p class="mt-1 text-xl font-extrabold text-secondary-800 dark:text-white">
                  {dokumen()?.totalKegiatan ?? 0}
                </p>
              </div>
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Total Poin</p>
                <p class="mt-1 text-xl font-extrabold text-secondary-800 dark:text-white">
                  {dokumen()?.totalPoin ?? 0}
                </p>
              </div>
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Syarat SKPI</p>
                <div class="mt-1">
                  <Badge variant={dokumen()?.syarat.terpenuhi ? 'success' : 'warning'}>
                    {dokumen()?.syarat.terpenuhi ? 'Terpenuhi' : 'Belum Terpenuhi'}
                  </Badge>
                  <p class="mt-1 text-[11px] text-secondary-400">
                    Min. {dokumen()?.syarat.minKegiatan} kegiatan terverifikasi
                  </p>
                </div>
              </div>
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Tanda Tangan</p>
                <div class="mt-1">
                  <Badge variant={dokumen()?.signature ? 'accent' : 'default'}>
                    {dokumen()?.signature ? 'Sudah Ditandatangani' : 'Belum Ditandatangani'}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Button
                variant="primary"
                onClick={() => {
                  const mhsId = mhsProfile()?.id;
                  if (mhsId) window.open(`/skpi/cetak/${mhsId}`, '_blank');
                }}
                disabled={!dokumen()?.syarat.terpenuhi}
              >
                Unduh / Cetak SKPI
              </Button>
              <Show when={cetakDisabledReason()}>
                {(reason) => <p class="text-xs text-warning-700 dark:text-warning-400">{reason()}</p>}
              </Show>
            </div>
          </div>
        </Show>

        <Show when={effectiveTab() === 'rekaman'}>
          <TabRekaman onChanged={() => refetchDokumen()} />
        </Show>
        <Show when={effectiveTab() === 'verifikasi'}>
          <TabVerifikasi />
        </Show>
        <Show when={effectiveTab() === 'penerbitan'}>
          <TabPenerbitan />
        </Show>
      </div>
    </MainLayout>
  );
}
