import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { AuditLog as AuditLogEntry, AuditLogFilters, auditController } from '../controllers/auditController';
import { fmtWaktu } from '../utils/format';

const MODULES = [
  'presensi',
  'apel',
  'users',
  'dosen',
  'mahasiswa',
  'mahasiswa-keluar',
  'mata-kuliah',
  'kelas-kuliah',
  'krs',
  'bap',
  'kompensasi-bayar',
  'kompensasi-manual',
  'pelanggaran',
  'pasal-pelanggaran',
  'bimbingan',
  'tagihan',
  'kurikulum',
  'rps',
  'cpmk',
  'cpl',
  'program-studi',
  'periode-akademik',
  'audit-logs',
  'system',
];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'];
const PAGE_SIZES = [20, 50, 100, 200, 500];

const actionBadge = (action: string) => {
  const styles: Record<string, string> = {
    CREATE: 'bg-green-50 text-green-700 border-green-200',
    UPDATE: 'bg-blue-50 text-blue-700 border-blue-200',
    DELETE: 'bg-rose-50 text-rose-700 border-rose-200',
    LOGIN: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    LOGOUT: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <span
      class={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[action] || 'bg-gray-50 text-gray-600 border-gray-200'}`}
    >
      {action}
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
  const [module, setModule] = createSignal<string>('');
  const [actionType, setActionType] = createSignal<string>('');
  const [startDate, setStartDate] = createSignal('');
  const [endDate, setEndDate] = createSignal('');
  const [detail, setDetail] = createSignal<AuditLogEntry | null>(null);
  const [notice, setNotice] = createSignal('');
  const [noticeType, setNoticeType] = createSignal<'success' | 'error'>('success');
  const [isExporting, setIsExporting] = createSignal(false);
  const [isPurging, setIsPurging] = createSignal(false);

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: search(),
      module: module(),
      actionType: actionType(),
      startDate: startDate(),
      endDate: endDate(),
    }),
    async (params) => {
      const filters: AuditLogFilters = { page: params.page, limit: params.limit };
      if (params.search) filters.search = params.search;
      if (params.module) filters.module = params.module;
      if (params.actionType) filters.actionType = params.actionType;
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
    if (startDate()) filters.startDate = startDate();
    if (endDate()) filters.endDate = endDate();
    return filters;
  };

  const applyFilter = () => {
    setPage(1);
    refetch();
  };

  const handleExport = async () => {
    setIsExporting(true);
    setNotice('');
    try {
      await auditController.exportCsv(currentFilters());
      setNoticeType('success');
      setNotice('Audit log berhasil diekspor.');
    } catch (e: unknown) {
      setNoticeType('error');
      setNotice(e instanceof Error ? e.message : 'Gagal mengekspor audit log.');
    } finally {
      setIsExporting(false);
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

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Audit Log Aktivitas</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Log aktivitas &amp; perubahan data user di sistem untuk keperluan audit dan pemantauan.
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
            class="rounded-xl bg-brand-600 hover:bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={isExporting()}
            onClick={handleExport}
          >
            {isExporting() ? 'Mengekspor...' : 'Ekspor CSV'}
          </button>
          <button
            class="rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 px-4 py-2 text-sm font-semibold disabled:opacity-50"
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
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">Cari</label>
              <input
                type="text"
                placeholder="Deskripsi / module / aksi..."
                class="w-full rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
              />
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">Module</label>
              <select
                class="rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={module()}
                onChange={(e) => {
                  setModule(e.currentTarget.value);
                  applyFilter();
                }}
              >
                <option value="">Semua</option>
                <For each={MODULES}>{(m) => <option value={m}>{m}</option>}</For>
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
                <option value="">Semua</option>
                <For each={ACTIONS}>{(a) => <option value={a}>{a}</option>}</For>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">Dari</label>
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
              <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-300 mb-1">Sampai</label>
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
                Baris / Halaman
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
                <For each={PAGE_SIZES}>{(size) => <option value={size}>{size} / halaman</option>}</For>
              </select>
            </div>
            <button
              class="rounded-xl border border-secondary-300 dark:border-secondary-700 px-4 py-2 text-sm font-semibold text-secondary-600 dark:text-secondary-200 hover:bg-secondary-50 dark:hover:bg-secondary-800"
              onClick={() => {
                setSearch('');
                setModule('');
                setActionType('');
                setStartDate('');
                setEndDate('');
                setPage(1);
                setLimit(20);
                refetch();
              }}
            >
              Reset
            </button>
          </div>

          {/* Table */}
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead>
                <tr class="border-b border-secondary-100 dark:border-secondary-800 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold">
                  <th class="py-3 px-4">Waktu</th>
                  <th class="py-3 px-4">User</th>
                  <th class="py-3 px-4">Role</th>
                  <th class="py-3 px-4">Aksi</th>
                  <th class="py-3 px-4">Module</th>
                  <th class="py-3 px-4">Entitas</th>
                  <th class="py-3 px-4">Deskripsi</th>
                  <th class="py-3 px-4">IP</th>
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
                        </td>
                        <td class="py-3 px-4 text-xs capitalize">{item.userRole || '-'}</td>
                        <td class="py-3 px-4">{actionBadge(item.actionType)}</td>
                        <td class="py-3 px-4 text-xs font-mono">
                          <div>{item.module}</div>
                          <Show when={item.tableName}>
                            <div class="text-[10px] text-secondary-400">{item.tableName}</div>
                          </Show>
                        </td>
                        <td class="py-3 px-4 max-w-[200px] truncate text-secondary-600 dark:text-secondary-300">
                          {item.entityName || item.entityId || '-'}
                        </td>
                        <td
                          class="py-3 px-4 max-w-xs truncate text-secondary-600 dark:text-secondary-300"
                          title={item.description}
                        >
                          {item.description}
                        </td>
                        <td class="py-3 px-4 text-xs font-mono">{item.ipAddress || '-'}</td>
                        <td class="py-3 px-4 text-center">
                          <button
                            class="text-brand-600 hover:text-brand-700 font-semibold text-xs"
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
                  {data()!.meta.total === 0 ? 0 : (data()!.meta.page - 1) * data()!.meta.limit + 1}–
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
                <span class="px-3 py-1 text-sm">
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
        </div>

        {/* Detail Modal */}
        <Show when={detail()}>
          <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDetail(null)}>
            <div
              class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 w-full max-w-lg mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 class="text-lg font-semibold mb-4">Detail Audit Log</h2>
              <div class="space-y-3 text-sm">
                <div>
                  <div class="text-xs font-semibold text-secondary-400 uppercase">Waktu</div>
                  <div>{fmtWaktu(detail()?.timestamp)}</div>
                </div>
                <div>
                  <div class="text-xs font-semibold text-secondary-400 uppercase">Deskripsi</div>
                  <div>{detail()?.description}</div>
                </div>
                <Show when={detail()?.detail}>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Detail</div>
                    <div>{detail()?.detail}</div>
                  </div>
                </Show>
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">User</div>
                    <div>{detail()?.userName || (detail()?.userId ? `User #${detail()?.userId}` : 'Sistem')}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Role</div>
                    <div>{detail()?.userRole || '-'}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Module</div>
                    <div>{detail()?.module}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Tabel</div>
                    <div>{detail()?.tableName || '-'}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Aksi</div>
                    <div>{detail()?.actionType}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Entity ID</div>
                    <div>{detail()?.entityId || '-'}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">Nama Entitas</div>
                    <div>{detail()?.entityName || '-'}</div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-secondary-400 uppercase">IP Address</div>
                    <div>{detail()?.ipAddress || '-'}</div>
                  </div>
                </div>
                <Show when={detail()?.metadata}>
                  <div class="grid grid-cols-3 gap-3">
                    <div>
                      <div class="text-xs font-semibold text-secondary-400 uppercase">Method</div>
                      <div>{metaValue(detail(), 'method')}</div>
                    </div>
                    <div class="col-span-2">
                      <div class="text-xs font-semibold text-secondary-400 uppercase">URL</div>
                      <div class="break-all">{metaValue(detail(), 'path')}</div>
                    </div>
                    <div>
                      <div class="text-xs font-semibold text-secondary-400 uppercase">Status</div>
                      <div>{metaValue(detail(), 'statusCode')}</div>
                    </div>
                  </div>
                </Show>
                <Show when={getResponseSummary(detail())}>
                  {(summary) => (
                    <div class="rounded-xl bg-secondary-50 dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 p-3">
                      <div class="text-xs font-semibold text-secondary-400 uppercase mb-2">Ringkasan Hasil</div>
                      <Show when={summary().kind === 'bulk'}>
                        <div class="text-sm">
                          Sukses: <strong>{summary().success ?? 0}</strong> · Gagal:{' '}
                          <strong>{summary().failed ?? 0}</strong> · Dilewati: <strong>{summary().skipped ?? 0}</strong>
                        </div>
                        <div class="mt-2 space-y-1">
                          <For each={summary().errors}>
                            {(err: ResponseSummaryError) => (
                              <div class="text-xs text-secondary-600 dark:text-secondary-300">
                                {err.line != null ? `Baris ${err.line}: ` : ''}
                                {err.message || '-'}
                              </div>
                            )}
                          </For>
                          <Show when={(summary().errorCount ?? 0) > (summary().errors?.length ?? 0)}>
                            <div class="text-xs text-secondary-400">
                              ... +{(summary().errorCount ?? 0) - (summary().errors?.length ?? 0)} error lainnya
                            </div>
                          </Show>
                        </div>
                      </Show>
                      <Show when={summary().kind === 'count'}>
                        <div class="text-sm">
                          Dihitung: <strong>{summary().count ?? 0}</strong>
                        </div>
                      </Show>
                      <Show when={summary().kind === 'error'}>
                        <div class="text-sm text-rose-600">{summary().message || '-'}</div>
                      </Show>
                    </div>
                  )}
                </Show>
              </div>
              <div class="flex justify-end mt-6">
                <button class="px-4 py-2 border rounded-lg text-sm" onClick={() => setDetail(null)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
