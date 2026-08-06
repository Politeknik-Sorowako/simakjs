import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Pagination } from '../components/ui/Pagination';
import { Table } from '../components/ui/Table';
import { bimbinganController, MonitoringBimbinganLengkapItem } from '../controllers/bimbinganController';
import { dosenController } from '../controllers/dosenController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { usePagination } from '../hooks/usePagination';

export default function MonitoringBimbingan() {
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedDosenPa, setSelectedDosenPa] = createSignal<number | null>(null);
  const { page, limit, setPage, setLimit, search, setSearch, resetPage } = usePagination(10);

  // Load Periode Akademik
  const [periodes] = createResource(() => periodeAkademikController.getAll());

  // Load Dosen list
  const [dosenList] = createResource(() => dosenController.getAll('', 1, 500));

  // Load Monitoring Data
  const [monitoringData] = createResource(
    () => ({
      periodeId: selectedPeriode(),
      dosenPaId: selectedDosenPa(),
      search: search(),
      page: page(),
      limit: limit(),
    }),
    async ({ periodeId, dosenPaId, search, page, limit }) => {
      return await bimbinganController.getMonitoringLengkap({
        periodeId: periodeId || undefined,
        dosenPaId: dosenPaId || undefined,
        search: search || undefined,
        page,
        limit,
      });
    },
  );

  const data = () => monitoringData()?.data || [];

  const handleExportCSV = async () => {
    const exportRes = await bimbinganController.getMonitoringLengkap({
      periodeId: selectedPeriode() || undefined,
      dosenPaId: selectedDosenPa() || undefined,
      search: search() || undefined,
      page: 1,
      limit: 10000,
    });
    const exportData = exportRes.data || [];
    if (exportData.length === 0) return;

    const safeStr = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const headers = ['NIM', 'Nama Mahasiswa', 'Dosen PA', 'Periode', 'Jumlah Sesi Bimbingan', 'Status Persetujuan'];
    const rows = exportData.map((item) => [
      safeStr(item.nim),
      safeStr(item.namaMahasiswa),
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

  const handlePrint = () => {
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
                setSearch(e.currentTarget.value);
                resetPage();
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl p-6 shadow-sm">
          <Show
            when={!monitoringData.loading}
            fallback={<p class="text-center text-xs text-secondary-400 py-8">Memuat data monitoring bimbingan...</p>}
          >
            <Show
              when={data().length > 0}
              fallback={<p class="text-center text-xs text-secondary-400 py-8">Tidak ada data bimbingan ditemukan.</p>}
            >
              <Table headers={['No', 'NIM', 'Nama Mahasiswa', 'Dosen PA', 'Periode', 'Jumlah Sesi', 'Status Approval']}>
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
                        {item.namaMahasiswa}
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
          </Show>
        </div>
      </div>
    </MainLayout>
  );
}
