import { createResource, createSignal, For, onCleanup, Show, Suspense } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { StudentAvatar } from '../components/ui/StudentAvatar';
import { Table } from '../components/ui/Table';
import { TableLoadingFallback } from '../components/ui/TableLoadingFallback';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { bimbinganController, MonitoringBimbinganLengkapItem } from '../controllers/bimbinganController';
import { dosenController } from '../controllers/dosenController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';
import { usePagination } from '../hooks/usePagination';

export default function MonitoringBimbingan() {
  const workspace = useWorkspace();
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal<number | null>(null);
  const [selectedDosenPa, setSelectedDosenPa] = createSignal<number | null>(null);
  const [sortBy, setSortBy] = createSignal('');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const [printData, setPrintData] = createSignal<MonitoringBimbinganLengkapItem[]>([]);
  const { page, limit, setPage, setLimit, search, setSearch, resetPage } = usePagination(10);
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  let searchDebounceTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(searchDebounceTimer));

  const toggleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'totalSesi' ? 'desc' : 'asc');
    }
    resetPage();
  };

  // Load Periode Akademik
  const [periodes] = createResource(() => periodeAkademikController.getAll());

  // Load Dosen list
  const [dosenList] = createResource(() => dosenController.getAll('', 1, 500));

  // Load Prodi list
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Load Monitoring Data
  const [monitoringData] = createResource(
    () => ({
      periodeId: selectedPeriode(),
      prodiId: selectedProdi() ?? workspace.activeProdiId(),
      dosenPaId: selectedDosenPa(),
      search: debouncedSearch(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
      page: page(),
      limit: limit(),
    }),
    async ({ periodeId, prodiId, dosenPaId, search, sortBy, sortOrder, page, limit }) => {
      return await bimbinganController.getMonitoringLengkap({
        periodeId: periodeId || undefined,
        prodiId: prodiId || undefined,
        dosenPaId: dosenPaId || undefined,
        search: search || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortBy ? sortOrder : undefined,
        page,
        limit,
      });
    },
  );

  const data = () => monitoringData()?.data || [];

  const selectedProdiNama = () => {
    const id = selectedProdi() ?? workspace.activeProdiId();
    if (!id) return 'Semua Program Studi';
    return prodis()?.data?.find((p) => p.id === id)?.nama || 'Semua Program Studi';
  };

  const handleExportCSV = async () => {
    const exportRes = await bimbinganController.getMonitoringLengkap({
      periodeId: selectedPeriode() || undefined,
      prodiId: selectedProdi() ?? workspace.activeProdiId() ?? undefined,
      dosenPaId: selectedDosenPa() || undefined,
      search: debouncedSearch() || undefined,
      sortBy: sortBy() || undefined,
      sortOrder: sortBy() ? sortOrder() : undefined,
      page: 1,
      limit: 10000,
    });
    const exportData = exportRes.data || [];
    if (exportData.length === 0) return;

    const safeStr = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = [
      'NIM',
      'Nama Mahasiswa',
      'Prodi',
      'Dosen PA',
      'Periode',
      'Jumlah Sesi Bimbingan',
      'Status Persetujuan',
    ];
    const rows = exportData.map((item) => [
      safeStr(item.nim),
      safeStr(item.namaMahasiswa),
      safeStr(item.prodiNama || '-'),
      safeStr(item.dosenPaNama),
      safeStr(item.periodeId),
      item.totalSesi,
      safeStr(item.isApproved ? 'Disetujui' : 'Belum Disetujui'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `monitoring-bimbingan-${selectedPeriode() || 'semua'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = async () => {
    const printRes = await bimbinganController.getMonitoringLengkap({
      periodeId: selectedPeriode() || undefined,
      prodiId: selectedProdi() ?? workspace.activeProdiId() ?? undefined,
      dosenPaId: selectedDosenPa() || undefined,
      search: search() || undefined,
      sortBy: sortBy() || undefined,
      sortOrder: sortBy() ? sortOrder() : undefined,
      page: 1,
      limit: 10000,
    });
    setPrintData(printRes.data || []);
    window.print();
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6 print:p-0">
        <div class="flex items-center justify-between print:hidden">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Monitoring Pelaksanaan Bimbingan</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Pantau progres pembimbingan mahasiswa oleh Dosen Pembimbing Akademik (PA) per semester
            </p>
          </div>
          <div class="flex gap-2">
            <Button onClick={handleExportCSV} variant="secondary" size="sm">
              📥 Ekspor CSV
            </Button>
            <Button onClick={handlePrint} variant="primary" size="sm">
              🖨️ Cetak / PDF
            </Button>
          </div>
        </div>

        {/* Print Header */}
        <div class="hidden print:block mb-4 text-center">
          <h2 class="text-xl font-bold">LAPORAN MONITORING PELAKSANAAN BIMBINGAN MAHASISWA</h2>
          <p class="text-xs">Periode Akademik: {selectedPeriode() || 'Aktif'}</p>
          <p class="text-xs">Program Studi: {selectedProdiNama()}</p>
        </div>

        {/* Filters */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-4 shadow-sm flex flex-wrap gap-4 items-center justify-between print:hidden">
          <div class="flex flex-wrap gap-4 items-center">
            <div>
              <label class="block text-xs font-semibold text-secondary-600 dark:text-secondary-300 mb-1">
                Periode Semester
              </label>
              <select
                class="text-xs p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-800 dark:text-white"
                value={selectedPeriode()}
                onChange={(e) => {
                  setSelectedPeriode(e.currentTarget.value);
                  resetPage();
                }}
              >
                <option value="">-- Periode Aktif --</option>
                <For each={periodes()?.data || []}>
                  {(p) => (
                    <option value={p.id}>
                      {p.id} ({p.nama}) {p.aktif ? '[Aktif]' : ''}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-secondary-600 dark:text-secondary-300 mb-1">
                Program Studi
              </label>
              <select
                class="text-xs p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-800 dark:text-white"
                value={selectedProdi() ?? ''}
                onChange={(e) => {
                  setSelectedProdi(e.currentTarget.value ? Number(e.currentTarget.value) : null);
                  resetPage();
                }}
              >
                <option value="">-- Semua Program Studi --</option>
                <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-secondary-600 dark:text-secondary-300 mb-1">
                Dosen PA
              </label>
              <select
                class="text-xs p-2 rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-800 dark:text-white"
                value={selectedDosenPa() || ''}
                onChange={(e) => {
                  setSelectedDosenPa(e.currentTarget.value ? Number(e.currentTarget.value) : null);
                  resetPage();
                }}
              >
                <option value="">-- Semua Dosen PA --</option>
                <For each={(dosenList()?.data as { id: number; nama: string }[]) || []}>
                  {(d) => <option value={d.id}>{d.nama}</option>}
                </For>
              </select>
            </div>
          </div>

          <div class="w-64">
            <Input
              placeholder="Cari NIM, Mahasiswa, Dosen..."
              value={search()}
              onInput={(e) => {
                const value = e.currentTarget.value;
                setSearch(value);
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                  setDebouncedSearch(value);
                  resetPage();
                }, 400);
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-6 shadow-sm print:hidden">
          <Suspense fallback={<TableLoadingFallback />}>
            <Show
              when={data().length > 0}
              fallback={<p class="text-center text-xs text-secondary-400 py-8">Tidak ada data bimbingan ditemukan.</p>}
            >
              <Table
                headers={[
                  'No',
                  <SortableHeader field="nim" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    NIM
                  </SortableHeader>,
                  <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Nama Mahasiswa
                  </SortableHeader>,
                  <SortableHeader field="prodi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Prodi
                  </SortableHeader>,
                  <SortableHeader field="dosenPa" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Dosen PA
                  </SortableHeader>,
                  'Periode',
                  <SortableHeader field="totalSesi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Jumlah Sesi
                  </SortableHeader>,
                  'Status Approval',
                ]}
              >
                <For each={data()}>
                  {(item: MonitoringBimbinganLengkapItem, index: () => number) => (
                    <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40 transition-colors">
                      <td class="px-6 py-4 text-xs font-medium text-secondary-500">
                        {(page() - 1) * limit() + index() + 1}
                      </td>
                      <td class="px-6 py-4 text-xs font-mono font-medium text-secondary-900 dark:text-white">
                        {item.nim}
                      </td>
                      <td class="px-6 py-4 text-xs font-semibold text-secondary-800 dark:text-white">
                        <div class="flex items-center gap-2">
                          <StudentAvatar foto={item.foto} nama={item.namaMahasiswa} nim={item.nim} size="sm" />
                          {item.namaMahasiswa}
                        </div>
                      </td>
                      <td class="px-6 py-4 text-xs text-secondary-700 dark:text-secondary-300">
                        {item.prodiNama || '-'}
                      </td>
                      <td class="px-6 py-4 text-xs text-secondary-700 dark:text-secondary-300">{item.dosenPaNama}</td>
                      <td class="px-6 py-4 text-xs font-mono text-secondary-600 dark:text-secondary-400">
                        {item.periodeId}
                      </td>
                      <td class="px-6 py-4 text-xs font-bold text-primary-600 dark:text-primary-400">
                        {item.totalSesi} Sesi
                      </td>
                      <td class="px-6 py-4 text-xs">
                        <span
                          class={`px-2 py-0.5 rounded-full font-medium ${
                            item.isApproved
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}
                        >
                          {item.isApproved ? 'Disetujui' : 'Belum Disetujui'}
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </Table>
              <Pagination
                currentPage={page()}
                totalPages={Math.ceil((monitoringData()?.meta?.total || 0) / limit())}
                total={monitoringData()?.meta?.total || 0}
                limit={limit()}
                onPageChange={setPage}
                onLimitChange={setLimit}
              />
            </Show>
          </Suspense>
        </div>

        {/* Print-Only Table (renders all filtered rows) */}
        <div class="hidden print:block">
          <Table
            headers={['No', 'NIM', 'Nama Mahasiswa', 'Prodi', 'Dosen PA', 'Periode', 'Jumlah Sesi', 'Status Approval']}
          >
            <For each={printData()}>
              {(item: MonitoringBimbinganLengkapItem, index: () => number) => (
                <tr>
                  <td class="px-3 py-2 text-xs">{index() + 1}</td>
                  <td class="px-3 py-2 text-xs">{item.nim}</td>
                  <td class="px-3 py-2 text-xs">{item.namaMahasiswa}</td>
                  <td class="px-3 py-2 text-xs">{item.prodiNama || '-'}</td>
                  <td class="px-3 py-2 text-xs">{item.dosenPaNama}</td>
                  <td class="px-3 py-2 text-xs">{item.periodeId}</td>
                  <td class="px-3 py-2 text-xs">{item.totalSesi}</td>
                  <td class="px-3 py-2 text-xs">{item.isApproved ? 'Disetujui' : 'Belum Disetujui'}</td>
                </tr>
              )}
            </For>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
}
