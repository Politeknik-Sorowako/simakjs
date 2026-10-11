import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { PengumumanCard } from '../components/pengumuman/PengumumanCard';
import { PengumumanDetailModal } from '../components/pengumuman/PengumumanDetailModal';
import { PengumumanFormModal } from '../components/pengumuman/PengumumanFormModal';
import { useAuth } from '../contexts/AuthContext';
import { PengumumanItem, pengumumanController } from '../controllers/pengumumanController';

export default function Pengumuman() {
  const auth = useAuth();
  const canManage = () => auth.hasRole(['admin', 'super_admin', 'prodi', 'kaprodi', 'dosen', 'instruktur']);

  const [activeTab, setActiveTab] = createSignal<'feed' | 'manage'>('feed');
  const [search, setSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [formInitialData, setFormInitialData] = createSignal<PengumumanItem | null>(null);
  const [selectedDetail, setSelectedDetail] = createSignal<PengumumanItem | null>(null);

  // Target options resource for creation modal
  const [targetOptions] = createResource(() => pengumumanController.getTargetOptions());

  // Resources for Feed and Manage list
  const [feedData, { refetch: refetchFeed }] = createResource(
    () => ({ search: search() }),
    (params) => pengumumanController.getFeed(params.search),
  );

  const [manageData, { refetch: refetchManage }] = createResource(
    () => ({ search: search(), status: statusFilter() }),
    (params) => pengumumanController.getManageList(params.search, params.status),
  );

  const handleOpenCreate = () => {
    setFormInitialData(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: PengumumanItem) => {
    setFormInitialData(item);
    setIsFormOpen(true);
  };

  const handleWithdraw = async (id: number) => {
    const reason = prompt('Masukkan alasan penarikan pengumuman (opsional):') || undefined;
    if (confirm('Yakin ingin menarik pengumuman ini? Pengumuman tidak lagi tampil di pembaca.')) {
      try {
        await pengumumanController.withdraw(id, reason);
        refetchFeed();
        refetchManage();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Gagal menarik pengumuman');
      }
    }
  };

  const handlePublishAgain = async (item: PengumumanItem) => {
    if (confirm(`Publikasikan kembali pengumuman "${item.judul}"?`)) {
      try {
        await pengumumanController.publish({
          id: item.id,
          judul: item.judul,
          konten: item.konten,
          targetRole: item.targetRole,
          targetProdiType: item.targetProdiType,
          targetProdiIds: item.targetProdiIds,
          targetScopeType: item.targetScopeType,
          targetKelasIds: item.targetKelasIds,
          targetRombelIds: item.targetRombelIds,
          isPinned: item.isPinned,
          publishMode: 'now',
          lampiran: item.lampiran,
        });
        refetchFeed();
        refetchManage();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Gagal mempublikasikan ulang');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Hapus permanen pengumuman ini? Tindakan tidak dapat dibatalkan.')) {
      try {
        await pengumumanController.delete(id);
        refetchFeed();
        refetchManage();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus pengumuman');
      }
    }
  };

  const handleSelectDetail = async (item: PengumumanItem) => {
    try {
      const fullDetail = await pengumumanController.getDetail(item.id);
      setSelectedDetail(fullDetail);
      refetchFeed();
    } catch {
      setSelectedDetail(item);
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        {/* Page Header */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-secondary-900 dark:text-white">Pengumuman</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-400 mt-0.5">
              Informasi akademik, pengumuman perkuliahan, dan pemberitahuan penting sivitas
            </p>
          </div>

          <Show when={canManage()}>
            <button
              type="button"
              onClick={handleOpenCreate}
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0066cc] hover:bg-[#0071e3] active:scale-95 shadow-md transition-all self-start sm:self-auto"
            >
              <span>+</span>
              <span>Buat Pengumuman</span>
            </button>
          </Show>
        </div>

        {/* Tab & Filter Navigation Bar */}
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-secondary-200 dark:border-secondary-800 pb-3">
          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              class={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab() === 'feed'
                  ? 'bg-secondary-900 text-white dark:bg-white dark:text-secondary-900 shadow-xs'
                  : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
              }`}
            >
              📢 Pengumuman Untuk Anda
            </button>

            <Show when={canManage()}>
              <button
                type="button"
                onClick={() => setActiveTab('manage')}
                class={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab() === 'manage'
                    ? 'bg-secondary-900 text-white dark:bg-white dark:text-secondary-900 shadow-xs'
                    : 'text-secondary-600 dark:text-secondary-400 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                }`}
              >
                ⚙️ Kelola Pengumuman
              </button>
            </Show>
          </div>

          <div class="flex items-center gap-2">
            <Show when={activeTab() === 'manage'}>
              <select
                value={statusFilter()}
                onChange={(e) => setStatusFilter(e.currentTarget.value)}
                class="px-3 py-1.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs text-secondary-800 dark:text-secondary-200 focus:outline-hidden"
              >
                <option value="all">Semua Status</option>
                <option value="published">Live</option>
                <option value="scheduled">Terjadwal</option>
                <option value="draft">Draf</option>
                <option value="withdrawn">Ditarik</option>
              </select>
            </Show>

            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
              class="px-3.5 py-1.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs text-secondary-800 dark:text-secondary-200 focus:outline-hidden focus:ring-2 focus:ring-[#0066cc] w-full sm:w-56"
            />
          </div>
        </div>

        {/* Tab 1: Feed Pembaca */}
        <Show when={activeTab() === 'feed'}>
          <div class="space-y-4">
            <Show
              when={!feedData.loading}
              fallback={<div class="py-12 text-center text-sm text-secondary-400">Memuat daftar pengumuman...</div>}
            >
              <Show
                when={feedData()?.data && feedData()!.data.length > 0}
                fallback={
                  <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl p-12 text-center space-y-2">
                    <span class="text-3xl">📭</span>
                    <h3 class="text-base font-bold text-secondary-900 dark:text-white">Belum Ada Pengumuman</h3>
                    <p class="text-xs text-secondary-500 max-w-md mx-auto">
                      Saat ini belum ada pengumuman aktif yang ditujukan untuk Anda.
                    </p>
                  </div>
                }
              >
                <div class="grid grid-cols-1 gap-4">
                  <For each={feedData()?.data}>
                    {(item) => (
                      <PengumumanCard item={item} isManageMode={false} onClick={() => handleSelectDetail(item)} />
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </Show>

        {/* Tab 2: Kelola Pengumuman */}
        <Show when={activeTab() === 'manage' && canManage()}>
          <div class="space-y-4">
            <Show
              when={!manageData.loading}
              fallback={
                <div class="py-12 text-center text-sm text-secondary-400">Memuat data kelola pengumuman...</div>
              }
            >
              <Show
                when={manageData()?.data && manageData()!.data.length > 0}
                fallback={
                  <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl p-12 text-center space-y-2">
                    <span class="text-3xl">📝</span>
                    <h3 class="text-base font-bold text-secondary-900 dark:text-white">
                      Belum Ada Pengumuman Yang Dikelola
                    </h3>
                    <p class="text-xs text-secondary-500 max-w-md mx-auto">
                      Mulai buat pengumuman baru untuk menyampaikan informasi ke sivitas.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenCreate}
                      class="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0066cc]"
                    >
                      + Buat Pengumuman Baru
                    </button>
                  </div>
                }
              >
                <div class="grid grid-cols-1 gap-4">
                  <For each={manageData()?.data}>
                    {(item) => (
                      <PengumumanCard
                        item={item}
                        isManageMode={true}
                        onEdit={handleOpenEdit}
                        onWithdraw={handleWithdraw}
                        onPublishAgain={handlePublishAgain}
                        onDelete={handleDelete}
                        onClick={() => handleSelectDetail(item)}
                      />
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </div>
        </Show>

        {/* Create/Edit Modal */}
        <PengumumanFormModal
          isOpen={isFormOpen()}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            refetchFeed();
            refetchManage();
          }}
          initialData={formInitialData()}
          targetOptions={targetOptions() || { prodi: [], kelas: [], rombel: [] }}
        />

        {/* Detail Modal */}
        <PengumumanDetailModal item={selectedDetail()} onClose={() => setSelectedDetail(null)} />
      </div>
    </MainLayout>
  );
}
