import { createEffect, createMemo, createResource, createSignal, For, onCleanup, Show, Suspense } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { PengumumanCard } from '../components/pengumuman/PengumumanCard';
import { PengumumanDetailModal } from '../components/pengumuman/PengumumanDetailModal';
import { PengumumanFormModal } from '../components/pengumuman/PengumumanFormModal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { TableLoadingFallback } from '../components/ui/TableLoadingFallback';
import { useAuth } from '../contexts/AuthContext';
import { PengumumanItem, pengumumanController } from '../controllers/pengumumanController';
import { usePagination } from '../hooks/usePagination';
import { fmtWaktu } from '../utils/format';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  published: {
    label: 'Live',
    cls: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  scheduled: {
    label: 'Terjadwal',
    cls: 'bg-amber-50 text-amber-700 ring-amber-600/10 dark:bg-amber-900/30 dark:text-amber-400',
  },
  draft: {
    label: 'Draf',
    cls: 'bg-secondary-100 text-secondary-600 ring-secondary-500/10 dark:bg-secondary-800 dark:text-secondary-300',
  },
  withdrawn: {
    label: 'Ditarik',
    cls: 'bg-rose-50 text-rose-600 ring-rose-600/10 dark:bg-rose-950/40 dark:text-rose-400',
  },
  archived: {
    label: 'Diarsipkan',
    cls: 'bg-secondary-100 text-secondary-500 ring-secondary-500/10 dark:bg-secondary-800 dark:text-secondary-400',
  },
};

const TARGET_ROLE_LABEL: Record<string, string> = {
  semua: 'Semua Sivitas',
  mahasiswa: 'Mahasiswa',
  dosen: 'Dosen',
  admin: 'Admin',
};

export default function Pengumuman() {
  const auth = useAuth();
  const canManage = () => auth.hasRole(['admin', 'super_admin', 'prodi', 'kaprodi', 'dosen', 'instruktur']);

  const [activeTab, setActiveTab] = createSignal<'feed' | 'manage'>('feed');
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('all');
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  // Manage tab: paging & sorting state
  const managePagination = usePagination(10);
  const [manageSortBy, setManageSortBy] = createSignal('createdAt');
  const [manageSortOrder, setManageSortOrder] = createSignal<'asc' | 'desc'>('desc');

  onCleanup(() => clearTimeout(searchDebounceTimer));

  const handleSearchInput = (e: Event) => {
    const value = (e.currentTarget as HTMLInputElement).value;
    setSearch(value);
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      setDebouncedSearch(value);
      managePagination.resetPage();
    }, 400);
  };

  const toggleManageSort = (field: string) => {
    if (manageSortBy() === field) setManageSortOrder(manageSortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setManageSortBy(field);
      setManageSortOrder('asc');
    }
    managePagination.resetPage();
  };

  // Feed items & Load More state
  const [feedItems, setFeedItems] = createSignal<PengumumanItem[]>([]);
  const [feedPage, setFeedPage] = createSignal(1);
  const [hasMoreFeed, setHasMoreFeed] = createSignal(false);
  const [isLoadingMore, setIsLoadingMore] = createSignal(false);

  // Modals state
  const [isFormOpen, setIsFormOpen] = createSignal(false);
  const [formInitialData, setFormInitialData] = createSignal<PengumumanItem | null>(null);
  const [selectedDetail, setSelectedDetail] = createSignal<PengumumanItem | null>(null);

  // Target options resource for creation modal
  const [targetOptions] = createResource(() => pengumumanController.getTargetOptions());

  // Initial feed resource (page 1)
  const [initialFeedData, { refetch: refetchFeedResource }] = createResource(
    () => ({ search: debouncedSearch() }),
    async (params) => {
      const res = await pengumumanController.getFeed(params.search, 1, 10);
      return res;
    },
  );

  // Synchronize feedItems with initial resource results
  createEffect(() => {
    const data = initialFeedData();
    if (data) {
      setFeedItems(data.data);
      setFeedPage(1);
      setHasMoreFeed(data.page < data.totalPages);
    }
  });

  // Load more feed items
  const handleLoadMoreFeed = async () => {
    if (isLoadingMore() || !hasMoreFeed()) return;
    setIsLoadingMore(true);
    const nextPage = feedPage() + 1;
    try {
      const res = await pengumumanController.getFeed(debouncedSearch(), nextPage, 10);
      setFeedItems((prev) => [...prev, ...res.data]);
      setFeedPage(nextPage);
      setHasMoreFeed(res.page < res.totalPages);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memuat pengumuman selanjutnya');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const refetchFeed = () => {
    refetchFeedResource();
  };

  // Manage list resource (server-side paging & sorting)
  const [manageData, { refetch: refetchManage }] = createResource(
    () => ({
      search: debouncedSearch(),
      status: statusFilter(),
      page: managePagination.page(),
      limit: managePagination.limit(),
      sortBy: manageSortBy(),
      sortOrder: manageSortOrder(),
    }),
    (params) =>
      pengumumanController.getManageList(
        params.search,
        params.status,
        params.page,
        params.limit,
        params.sortBy,
        params.sortOrder,
      ),
  );

  // Filter pinned vs regular items from loaded feed items
  const pinnedFeedItems = createMemo(() => feedItems().filter((item) => item.isPinned));
  const regularFeedItems = createMemo(() => feedItems().filter((item) => !item.isPinned));

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
    if (confirm(`Publikasikan kembali pengumuman"${item.judul}"?`)) {
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
          thumbnailUrl: item.thumbnailUrl,
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
      // Update isRead status in local list
      setFeedItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, isRead: true } : p)));
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
              class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-[#0066cc] hover:bg-[#0071e3] active:scale-95 transition-all self-start sm:self-auto"
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
                onChange={(e) => {
                  setStatusFilter(e.currentTarget.value);
                  managePagination.resetPage();
                }}
                class="px-3 py-1.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs text-secondary-800 dark:text-secondary-200 focus:outline-hidden"
              >
                <option value="all">Semua Status</option>
                <option value="published">Live</option>
                <option value="scheduled">Terjadwal</option>
                <option value="draft">Draf</option>
                <option value="withdrawn">Ditarik</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </Show>

            <input
              type="text"
              placeholder="Cari pengumuman..."
              value={search()}
              onInput={handleSearchInput}
              class="px-3.5 py-1.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs text-secondary-800 dark:text-secondary-200 focus:outline-hidden focus:ring-2 focus:ring-[#0066cc] w-full sm:w-56"
            />
          </div>
        </div>

        {/* Tab 1: Feed Pembaca (Slide Pinned di Atas + 2-Kolom Grid di Bawah + Tombol Muat Lainnya) */}
        <Show when={activeTab() === 'feed'}>
          <div class="space-y-6">
            <Show
              when={!initialFeedData.loading || feedItems().length > 0}
              fallback={<div class="py-12 text-center text-sm text-secondary-400">Memuat daftar pengumuman...</div>}
            >
              <Show
                when={feedItems().length > 0}
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
                {/* 1. Baris Slide Card Paling Atas (Pinned Announcements) */}
                <Show when={pinnedFeedItems().length > 0}>
                  <div class="space-y-2.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-bold text-secondary-900 dark:text-white uppercase tracking-wider text-xs">
                          📌 Pengumuman Penting Disematkan
                        </span>
                        <span class="text-xs text-secondary-400">({pinnedFeedItems().length})</span>
                      </div>
                      <span class="text-[11px] text-secondary-400 hidden sm:inline">Geser horizontal →</span>
                    </div>

                    <div class="flex gap-4 overflow-x-auto pb-3 snap-x scrollbar-thin scrollbar-thumb-secondary-300 dark:scrollbar-thumb-secondary-700">
                      <For each={pinnedFeedItems()}>
                        {(item) => (
                          <PengumumanCard
                            item={item}
                            variant="slide"
                            isManageMode={false}
                            onClick={() => handleSelectDetail(item)}
                          />
                        )}
                      </For>
                    </div>
                  </div>
                </Show>

                {/* 2. Dua Baris Card (2-Kolom Grid) untuk Pengumuman Reguler */}
                <div class="space-y-3">
                  <Show when={pinnedFeedItems().length > 0 && regularFeedItems().length > 0}>
                    <div class="text-xs font-bold uppercase tracking-wider text-secondary-500 pt-2">
                      Semua Berita & Pengumuman Terbaru
                    </div>
                  </Show>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <For each={regularFeedItems()}>
                      {(item) => (
                        <PengumumanCard
                          item={item}
                          variant="grid"
                          isManageMode={false}
                          onClick={() => handleSelectDetail(item)}
                        />
                      )}
                    </For>
                  </div>
                </div>

                {/* 3. Tombol Muat Pengumuman Lainnya (Load More) */}
                <Show when={hasMoreFeed()}>
                  <div class="pt-4 flex justify-center">
                    <button
                      type="button"
                      disabled={isLoadingMore()}
                      onClick={handleLoadMoreFeed}
                      class="px-6 py-2.5 rounded-xl text-xs font-bold text-secondary-800 dark:text-secondary-100 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 hover:bg-secondary-50 dark:hover:bg-secondary-750 active:scale-95 shadow-xs transition-all flex items-center gap-2"
                    >
                      <Show when={isLoadingMore()}>
                        <span class="inline-block w-3 h-3 border-2 border-action border-t-transparent rounded-full animate-spin" />
                      </Show>
                      <span>{isLoadingMore() ? 'Memuat...' : 'Muat Pengumuman Lainnya'}</span>
                    </button>
                  </div>
                </Show>
              </Show>
            </Show>
          </div>
        </Show>

        {/* Tab 2: Kelola Pengumuman */}
        <Show when={activeTab() === 'manage' && canManage()}>
          <div class="space-y-4">
            <Suspense fallback={<TableLoadingFallback />}>
              <Show
                when={(manageData()?.data.length ?? 0) > 0}
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
                      class="mt-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0066cc] active:scale-95 transition-transform"
                    >
                      + Buat Pengumuman Baru
                    </button>
                  </div>
                }
              >
                <Table
                  headers={[
                    <SortableHeader
                      field="judul"
                      sortBy={manageSortBy()}
                      sortOrder={manageSortOrder()}
                      onSort={toggleManageSort}
                    >
                      Judul
                    </SortableHeader>,
                    <SortableHeader
                      field="status"
                      sortBy={manageSortBy()}
                      sortOrder={manageSortOrder()}
                      onSort={toggleManageSort}
                    >
                      Status
                    </SortableHeader>,
                    'Target',
                    'Penulis',
                    <SortableHeader
                      field="publishedAt"
                      sortBy={manageSortBy()}
                      sortOrder={manageSortOrder()}
                      onSort={toggleManageSort}
                    >
                      Terbit
                    </SortableHeader>,
                    <SortableHeader
                      field="viewCount"
                      sortBy={manageSortBy()}
                      sortOrder={manageSortOrder()}
                      onSort={toggleManageSort}
                    >
                      Dibaca
                    </SortableHeader>,
                    'Sematkan',
                    'Aksi',
                  ]}
                >
                  <For each={manageData()?.data}>
                    {(item) => (
                      <tr class="hover:bg-secondary-50/70 dark:hover:bg-secondary-800/40 transition-colors">
                        <td class="px-6 py-4 max-w-[320px]">
                          <button type="button" onClick={() => handleSelectDetail(item)} class="group text-left">
                            <span class="font-semibold text-secondary-800 dark:text-white group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff] transition-colors line-clamp-2">
                              {item.judul}
                            </span>
                          </button>
                          <Show when={item.lampiran && item.lampiran.length > 0}>
                            <div class="mt-1 text-fine text-secondary-400">📎 {item.lampiran!.length} lampiran</div>
                          </Show>
                        </td>
                        <td class="px-6 py-4">
                          <span
                            class={`inline-flex items-center px-2.5 py-1 rounded-full text-fine font-medium ring-1 ring-inset ${
                              STATUS_BADGE[item.status]?.cls ?? STATUS_BADGE.draft.cls
                            }`}
                          >
                            {STATUS_BADGE[item.status]?.label ?? item.status}
                          </span>
                        </td>
                        <td class="px-6 py-4 text-xs text-secondary-500 dark:text-secondary-400">
                          <div class="font-medium text-secondary-700 dark:text-secondary-200">
                            {TARGET_ROLE_LABEL[item.targetRole] ?? item.targetRole}
                          </div>
                          <div class="text-fine">
                            {item.targetProdiType === 'spesifik'
                              ? `${item.targetProdiIds?.length ?? 0} prodi`
                              : 'Seluruh prodi'}
                            <Show when={item.targetScopeType !== 'umum'}>
                              {` · ${item.targetKelasIds?.length ?? 0} kelas / ${
                                item.targetRombelIds?.length ?? 0
                              } rombel`}
                            </Show>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="text-xs font-medium text-secondary-700 dark:text-secondary-200">
                            {item.authorNama || '-'}
                          </div>
                          <div class="text-fine text-secondary-400">{item.authorRole}</div>
                        </td>
                        <td class="px-6 py-4 text-xs text-secondary-500 dark:text-secondary-400 whitespace-nowrap">
                          {fmtWaktu(item.publishedAt || item.createdAt)}
                        </td>
                        <td class="px-6 py-4 text-xs font-medium text-secondary-700 dark:text-secondary-200 text-right tabular-nums">
                          {item.viewCount ?? 0}
                        </td>
                        <td class="px-6 py-4 text-center">
                          <Show when={item.isPinned} fallback={<span class="text-secondary-300">-</span>}>
                            <span title="Disematkan">📌</span>
                          </Show>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-2 flex-wrap">
                            <Show when={item.status === 'published' || item.status === 'scheduled'}>
                              <button
                                type="button"
                                onClick={() => handleWithdraw(item.id)}
                                class="px-3 py-1.5 rounded-lg text-fine font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
                              >
                                Tarik
                              </button>
                            </Show>
                            <Show when={item.status === 'withdrawn'}>
                              <button
                                type="button"
                                onClick={() => handlePublishAgain(item)}
                                class="px-3 py-1.5 rounded-lg text-fine font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
                              >
                                Publikasikan Ulang
                              </button>
                            </Show>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              class="px-3 py-1.5 rounded-lg text-fine font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:text-secondary-200 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id)}
                              class="px-3 py-1.5 rounded-lg text-fine font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </Table>

                {/* Pagination */}
                <Show when={manageData() && manageData()!.totalPages > 0}>
                  <Pagination
                    currentPage={managePagination.page()}
                    totalPages={manageData()!.totalPages}
                    total={manageData()!.total}
                    limit={managePagination.limit()}
                    onPageChange={managePagination.setPage}
                    onLimitChange={managePagination.setLimit}
                  />
                </Show>
              </Show>
            </Suspense>
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
