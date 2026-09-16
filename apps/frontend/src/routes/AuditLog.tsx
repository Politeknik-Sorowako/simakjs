import { createResource, createSignal, For, onCleanup, Show, Suspense } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { TableLoadingFallback } from '../components/ui/TableLoadingFallback';
import { AuditLog as AuditLogEntry, AuditLogFilters, auditController } from '../controllers/auditController';
import { fmtWaktu } from '../utils/format';

const MODULE_OPTIONS = [
  { value: 'presensi', label: 'Presensi Perkuliahan' },
  { value: 'apel', label: 'Apel Kedisiplinan' },
  { value: 'users', label: 'Pengguna Sistem' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'mahasiswa-keluar', label: 'Mahasiswa Keluar' },
  { value: 'mata-kuliah', label: 'Mata Kuliah' },
  { value: 'kelas-kuliah', label: 'Kelas Perkuliahan' },
  { value: 'krs', label: 'Kartu Rencana Studi (KRS)' },
  { value: 'bap', label: 'Berita Acara Perkuliahan (BAP)' },
  { value: 'bap-praktikum', label: 'BAP Praktikum' },
  { value: 'presensi-praktikum', label: 'Presensi Praktikum' },
  { value: 'rombel-praktikum', label: 'Rombel Praktikum' },
  { value: 'kompensasi-bayar', label: 'Pembayaran Kompensasi' },
  { value: 'kompensasi-manual', label: 'Kompensasi Manual' },
  { value: 'pelanggaran', label: 'Kedisiplinan & Pelanggaran' },
  { value: 'pasal-pelanggaran', label: 'Pasal Pelanggaran' },
  { value: 'bimbingan', label: 'Bimbingan Akademik' },
  { value: 'tagihan', label: 'Tagihan Keuangan/SPP' },
  { value: 'kurikulum', label: 'Kurikulum OBE' },
  { value: 'rps', label: 'Rencana Pembelajaran Semester (RPS)' },
  { value: 'cpmk', label: 'CPMK' },
  { value: 'cpl', label: 'CPL' },
  { value: 'program-studi', label: 'Program Studi' },
  { value: 'periode-akademik', label: 'Periode Akademik' },
  { value: 'audit-logs', label: 'Audit Log' },
  { value: 'system', label: 'Sistem' },
];

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const PAGE_SIZES = [20, 50, 100, 200, 500];

const actionBadge = (action: string) => {
  const styles: Record<string, string> = {
    CREATE:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800',
    UPDATE: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    LOGIN: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    LOGOUT:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  };
  return (
    <span
      class={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[action] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
    >
      {action}
    </span>
  );
};

const statusBadge = (item: AuditLogEntry) => {
  const code = item.statusCode ?? (item.metadata?.statusCode as number | undefined) ?? 200;
  const isSuccess = item.isSuccess ?? code < 400;

  if (isSuccess) {
    return (
      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
        SUKSES ({code})
      </span>
    );
  }
  if (code >= 500) {
    return (
      <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
        ERROR ({code})
      </span>
    );
  }
  return (
    <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
      GAGAL ({code})
    </span>
  );
};

const metaValue = (entry: AuditLogEntry | null, key: string): string => {
  const value = entry?.metadata?.[key];
  if (value == null) return '-';
  return String(value);
};

interface ResponseSummaryError {
  line?: string | number | null;
  message?: string;
}

interface ResponseSummaryData {
  kind?: string;
  success?: number;
  failed?: number;
  skipped?: number;
  errorCount?: number;
  count?: number;
  message?: string;
  errors?: ResponseSummaryError[];
}

const getResponseSummary = (entry: AuditLogEntry | null): ResponseSummaryData | null => {
  const raw = entry?.metadata?.responseSummary;
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as ResponseSummaryData;
};

export default function AuditLog() {
  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(20);
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [module, setModule] = createSignal<string>('');
  const [actionType, setActionType] = createSignal<string>('');
  const [statusCategory, setStatusCategory] = createSignal<
    'all' | 'success' | 'client_error' | 'server_error' | 'failed'
  >('all');
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [detail, setDetail] = createSignal<AuditLogEntry | null>(null);
  const [notice, setNotice] = createSignal('');
  const [noticeType, setNoticeType] = createSignal<'success' | 'error'>('success');
  const [isExportingFiltered, setIsExportingFiltered] = createSignal(false);
  const [isExportingAll, setIsExportingAll] = createSignal(false);
  const [isPurging, setIsPurging] = createSignal(false);
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(searchDebounceTimer));

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: debouncedSearch(),
      module: module(),
      actionType: actionType(),
      statusCategory: statusCategory(),
      startDate: startDate(),
      endDate: endDate(),
    }),
    async (params) => {
      const filters: AuditLogFilters = { page: params.page, limit: params.limit };
      if (params.search) filters.search = params.search;
      if (params.module) filters.module = params.module;
      if (params.actionType) filters.actionType = params.actionType;
      if (params.statusCategory && params.statusCategory !== 'all') filters.statusCategory = params.statusCategory;
      if (params.startDate) filters.startDate = params.startDate;
      if (params.endDate) filters.endDate = params.endDate;
      return auditController.getAll(filters);
    },
  );

  const currentFilters = (): AuditLogFilters => {
    const filters: AuditLogFilters = {};
    if (search()) filters.search = search();
    if (module()) filters.module = module();
    if (actionType()) filters.actionType = actionType();
    if (statusCategory() !== 'all') filters.statusCategory = statusCategory();
    if (startDate()) filters.startDate = startDate();
    if (endDate()) filters.endDate = endDate();
    return filters;
  };

  const applyFilter = () => {
    setPage(1);
    refetch();
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
  };

  const commitSearch = () => {
    clearTimeout(searchDebounceTimer);
    setDebouncedSearch(search());
    setPage(1);
  };

  const handleExportFiltered = async () => {
    setIsExportingFiltered(true);
    setNotice('');
    try {
      await auditController.exportCsv(currentFilters(), false);
      setNoticeType('success');
      setNotice('Audit log terfilter berhasil diekspor.');
    } catch (e: unknown) {
      setNoticeType('error');
      setNotice(e instanceof Error ? e.message : 'Gagal mengekspor audit log.');
    } finally {
      setIsExportingFiltered(false);
    }
  };

  const handleExportAll = async () => {
    setIsExportingAll(true);
    setNotice('');
    try {
      await auditController.exportCsv({}, true);
      setNoticeType('success');
      setNotice('Seluruh arsip audit log berhasil diekspor.');
    } catch (e: unknown) {
      setNoticeType('error');
      setNotice(e instanceof Error ? e.message : 'Gagal mengekspor seluruh audit log.');
    } finally {
      setIsExportingAll(false);
    }
  };

  const handlePurge = async () => {
    if (
      !window.confirm(
        'Hapus semua audit log yang lebih lama dari 200 hari (1 semester)? Tindakan ini tidak dapat dibatalkan.',
      )
    ) {
      return;
    }
    setIsPurging(true);
    setNotice('');
    try {
      const res = await auditController.purge(200);
      setNoticeType('success');
      setNotice(res.message);
      refetch();
    } catch (e: unknown) {
      setNoticeType('error');
      setNotice(e instanceof Error ? e.message : 'Gagal membersihkan audit log.');
    } finally {
      setIsPurging(false);
    }
  };

  const getModuleLabel = (modSlug: string) => {
    const found = MODULE_OPTIONS.find((m) => m.value === modSlug);
    return found ? found.label : modSlug;
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Audit Log Aktivitas</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Log aktivitas &amp; perubahan data user di sistem untuk keperluan audit, akuntabilitas, dan pemantauan.
          </p>
        </div>

        <Show when={notice()}>
          <div
            class={`rounded-xl px-4 py-3 text-sm ${
              noticeType() === 'error'
                ? 'bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800 dark:text-rose-400'
                : 'bg-success-50 border border-success-200 text-success-700 dark:bg-success-900/30 dark:border-success-800 dark:text-success-400'
            }`}
          >
            {notice()}
          </div>
        </Show>

        <div class="flex flex-wrap items-center gap-3">
          <button
            class="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 active:scale-95 transition-all shadow-sm"
            disabled={isExportingFiltered()}
            onClick={handleExportFiltered}
          >
            {isExportingFiltered() ? 'Mengekspor Hasil Filter...' : 'Download Hasil Filter (CSV)'}
          </button>
          <button
            class="rounded-xl border border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/40 px-4 py-2 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all"
            disabled={isExportingAll()}
            onClick={handleExportAll}
          >
            {isExportingAll() ? 'Mengekspor Seluruh Log...' : 'Export Seluruh Log (CSV)'}
          </button>
          <button
            class="rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 px-4 py-2 text-sm font-semibold disabled:opacity-50 active:scale-95 transition-all ml-auto"
            disabled={isPurging()}
            onClick={handlePurge}
          >
            {isPurging() ? 'Membersihkan...' : 'Hapus Log > 200 Hari'}
          </button>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl p-6 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          {/* Filters */}
          <div class="flex flex-wrap gap-3 items-end mb-4">
            <div class="flex-1 min-w-[180px]">
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">
                Cari Keyword
              </label>
              <input
                type="text"
                placeholder="Deskripsi / entitas / user / IP..."
                class="w-full rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={search()}
                onInput={(e) => handleSearchChange(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitSearch()}
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">
                Status Respons
              </label>
              <select
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={statusCategory()}
                onChange={(e) => {
                  setStatusCategory(
                    e.currentTarget.value as 'all' | 'success' | 'client_error' | 'server_error' | 'failed',
                  );
                  applyFilter();
                }}
              >
                <option value="all">Semua Status</option>
                <option value="success">Sukses (2xx)</option>
                <option value="failed">Semua Gagal (4xx &amp; 5xx)</option>
                <option value="client_error">Gagal Validasi / Izin (4xx)</option>
                <option value="server_error">Error Server (5xx)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">
                Modul / Fitur
              </label>
              <select
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 max-w-[200px]"
                value={module()}
                onChange={(e) => {
                  setModule(e.currentTarget.value);
                  applyFilter();
                }}
              >
                <option value="">Semua Modul</option>
                <For each={MODULE_OPTIONS}>{(m) => <option value={m.value}>{m.label}</option>}</For>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">Aksi</label>
              <select
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={actionType()}
                onChange={(e) => {
                  setActionType(e.currentTarget.value);
                  applyFilter();
                }}
              >
                <option value="">Semua Aksi</option>
                <For each={ACTIONS}>{(a) => <option value={a}>{a}</option>}</For>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">
                Dari Tanggal
              </label>
              <input
                type="date"
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={startDate()}
                onInput={(e) => {
                  setStartDate(e.currentTarget.value);
                  applyFilter();
                }}
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">
                Sampai Tanggal
              </label>
              <input
                type="date"
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={endDate()}
                onInput={(e) => {
                  setEndDate(e.currentTarget.value);
                  applyFilter();
                }}
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">
                Baris / Hal
              </label>
              <select
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={limit()}
                onChange={(e) => {
                  setLimit(Number(e.currentTarget.value));
                  setPage(1);
                  refetch();
                }}
              >
                <For each={PAGE_SIZES}>{(size) => <option value={size}>{size}</option>}</For>
              </select>
            </div>
            <button
              class="rounded-xl border border-secondary-300 dark:border-secondary-700 px-4 py-2 text-sm font-semibold text-secondary-600 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800 active:scale-95 transition-transform"
              onClick={() => {
                setSearch('');
                setDebouncedSearch('');
                setModule('');
                setActionType('');
                setStatusCategory('all');
                setStartDate('');
                setEndDate('');
                setPage(1);
                setLimit(20);
                clearTimeout(searchDebounceTimer);
                refetch();
              }}
            >
              Reset Filter
            </button>
          </div>

          {/* Table */}
          <Suspense fallback={<TableLoadingFallback />}>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead>
                  <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold">
                    <th class="py-3 px-4">Waktu</th>
                    <th class="py-3 px-4">User</th>
                    <th class="py-3 px-4">Role</th>
                    <th class="py-3 px-4">Aksi</th>
                    <th class="py-3 px-4">Status</th>
                    <th class="py-3 px-4">Modul / Fitur</th>
                    <th class="py-3 px-4">Entitas</th>
                    <th class="py-3 px-4">Deskripsi</th>
                    <th class="py-3 px-4 text-center">Detail</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                  <Show
                    when={!data.loading}
                    fallback={
                      <tr>
                        <td colspan="9" class="py-8 text-center text-secondary-400">
                          Memuat data...
                        </td>
                      </tr>
                    }
                  >
                    <For each={data()?.data}>
                      {(item) => (
                        <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                          <td class="py-3 px-4 text-xs whitespace-nowrap">{fmtWaktu(item.timestamp)}</td>
                          <td class="py-3 px-4">
                            <div class="font-semibold text-secondary-800 dark:text-white">
                              {item.userName || (item.userId ? `User #${item.userId}` : 'Sistem')}
                            </div>
                            <div class="text-[10px] text-secondary-400 font-mono">{item.ipAddress || '-'}</div>
                          </td>
                          <td class="py-3 px-4 text-xs capitalize">{item.userRole || '-'}</td>
                          <td class="py-3 px-4">{actionBadge(item.actionType)}</td>
                          <td class="py-3 px-4">{statusBadge(item)}</td>
                          <td class="py-3 px-4 text-xs">
                            <div class="font-semibold text-secondary-700 dark:text-secondary-200">
                              {getModuleLabel(item.module)}
                            </div>
                            <Show when={item.tableName}>
                              <div class="text-[10px] text-secondary-400 font-mono">{item.tableName}</div>
                            </Show>
                          </td>
                          <td class="py-3 px-4 max-w-[180px] truncate text-secondary-600 dark:text-secondary-300">
                            {item.entityName || item.entityId || '-'}
                          </td>
                          <td
                            class="py-3 px-4 max-w-xs truncate text-secondary-600 dark:text-secondary-300"
                            title={item.description}
                          >
                            {item.description}
                          </td>
                          <td class="py-3 px-4 text-center">
                            <button
                              class="text-brand-600 hover:text-brand-700 font-semibold text-xs active:scale-95 transition-transform"
                              onClick={() => setDetail(item)}
                            >
                              Lihat →
                            </button>
                          </td>
                        </tr>
                      )}
                    </For>
                    <Show when={!data()?.data?.length}>
                      <tr>
                        <td colspan="9" class="py-8 text-center text-secondary-400">
                          Tidak ada data audit log
                        </td>
                      </tr>
                    </Show>
                  </Show>
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Show when={data() && (data()!.meta?.total ?? 0) > 0}>
              <div class="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3">
                <span class="text-xs text-secondary-500 dark:text-secondary-300">
                  Menampilkan{' '}
                  <strong>
                    {(data()!.meta.page - 1) * data()!.meta.limit + 1}–
                    {Math.min(data()!.meta.page * data()!.meta.limit, data()!.meta.total)}
                  </strong>{' '}
                  dari <strong>{data()!.meta.total}</strong> log
                </span>
                <div class="flex gap-2 items-center">
                  <button
                    class="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    disabled={page() <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <span class="px-3 py-1 text-sm font-semibold">
                    {page()} / {data()!.meta.totalPages}
                  </span>
                  <button
                    class="px-3 py-1 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
                    disabled={page() >= (data()!.meta.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </Show>
          </Suspense>
        </div>

        {/* Detail Modal */}
        <Show when={detail()}>
          <div
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDetail(null)}
          >
            <div
              class="bg-white dark:bg-secondary-900 rounded-2xl shadow-xl p-6 w-full max-w-lg overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div class="flex items-center justify-between mb-4 pb-3 border-b border-secondary-100 dark:border-secondary-800">
                <h2 class="text-lg font-bold text-secondary-800 dark:text-white">Detail Audit Log</h2>
                <button
                  class="text-secondary-400 hover:text-secondary-600 dark:hover:text-white text-lg font-bold"
                  onClick={() => setDetail(null)}
                >
                  ✕
                </button>
              </div>
              <div class="space-y-4 text-sm">
                <div>
                  <div class="text-xs font-semibold text-secondary-400 uppercase mb-0.5">Waktu</div>
                  <div class="font-medium text-secondary-800 dark:text-white">{fmtWaktu(detail()?.timestamp)}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-secondary-400 uppercase mb-0.5">Deskripsi</div>
                  <div class="font-medium text-secondary-800 dark:text-white leading-relaxed">
                    {detail()?.description}
                  </div>
                </div>
                <Show when={detail()?.detail}>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase mb-0.5">
                      Detail &amp; Entitas Terdampak
                    </div>
                    <div class="p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-xl text-xs font-mono text-secondary-700 dark:text-secondary-200">
                      {detail()?.detail}
                    </div>
                  </div>
                </Show>
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">User</div>
                    <div class="font-semibold text-secondary-800 dark:text-white">
                      {detail()?.userName || (detail()?.userId ? `User #${detail()?.userId}` : 'Sistem')}
                    </div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Role</div>
                    <div class="capitalize text-secondary-700 dark:text-secondary-300">{detail()?.userRole || '-'}</div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Modul / Fitur</div>
                    <div class="font-semibold text-secondary-800 dark:text-white">
                      {getModuleLabel(detail()?.module || '')}
                    </div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Tabel DB</div>
                    <div class="font-mono text-secondary-700 dark:text-secondary-300">{detail()?.tableName || '-'}</div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Aksi</div>
                    <div>{actionBadge(detail()?.actionType || '')}</div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Status HTTP</div>
                    <div>{statusBadge(detail()!)}</div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Entity ID</div>
                    <div class="font-mono">{detail()?.entityId || '-'}</div>
                  </div>
                  <div>
                    <div class="text-secondary-400 font-semibold uppercase">Nama Entitas</div>
                    <div>{detail()?.entityName || '-'}</div>
                  </div>
                  <div class="col-span-2">
                    <div class="text-secondary-400 font-semibold uppercase">IP Address</div>
                    <div class="font-mono text-secondary-700 dark:text-secondary-300">{detail()?.ipAddress || '-'}</div>
                  </div>
                </div>

                <Show when={getResponseSummary(detail())}>
                  {(summary) => (
                    <div class="p-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-xl text-xs space-y-1">
                      <div class="font-bold text-secondary-700 dark:text-secondary-200 uppercase text-[10px]">
                        Ringkasan Operasi Batch
                      </div>
                      <Show when={summary().kind === 'bulk'}>
                        <div>
                          <strong>{summary().success}</strong> sukses, <strong>{summary().failed}</strong> gagal,{' '}
                          <strong>{summary().skipped}</strong> dilewati
                        </div>
                      </Show>
                      <Show when={summary().errors && summary().errors!.length > 0}>
                        <div class="text-rose-600 dark:text-rose-400 pt-1">
                          <strong>Contoh Error:</strong> {summary().errors![0].message}
                        </div>
                      </Show>
                    </div>
                  )}
                </Show>

                <div class="flex justify-end pt-2">
                  <button
                    class="px-4 py-2 bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 rounded-xl text-xs font-semibold hover:bg-secondary-200 dark:hover:bg-secondary-700 active:scale-95 transition-transform"
                    onClick={() => setDetail(null)}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
