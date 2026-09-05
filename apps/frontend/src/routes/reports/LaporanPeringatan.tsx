import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { PieChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { bimbinganController } from '../../controllers/bimbinganController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanPeringatan() {
  const [page, setPage] = createSignal(1);
  const [search, setSearch] = createSignal('');
  const [selectedPeriode, setSelectedPeriode] = createSignal('');

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));

  createEffect(() => {
    const list = periodes()?.data;
    if (list && list.length > 0 && !selectedPeriode()) {
      const active = list.find((p) => p.aktif);
      if (active) setSelectedPeriode(active.id);
    }
  });

  const [rekapPasal] = createResource(
    () => selectedPeriode(),
    async (periodeId) => {
      try {
        return await bimbinganController.getRekapPasal(undefined, periodeId || undefined);
      } catch {
        return { total: 0, totalPoin: 0, perPasal: [] };
      }
    },
  );

  const [riwayatData] = createResource(
    () => ({ page: page(), search: search(), periode: selectedPeriode() }),
    async (params) => {
      try {
        const res = await bimbinganController.getAllPelanggaran({
          page: params.page,
          limit: 20,
          search: params.search,
          periodeId: params.periode || undefined,
        });
        if (Array.isArray(res)) {
          return { data: res, pagination: { total: res.length, page: 1, totalPages: 1 } };
        }
        return res;
      } catch {
        return { data: [], pagination: { total: 0, page: 1, totalPages: 1 } };
      }
    },
  );

  const columns: ExportColumn[] = [
    { header: 'Tanggal', accessor: 'tanggal' },
    { header: 'NIM', accessor: 'nim' },
    { header: 'Mahasiswa', accessor: 'namaMahasiswa' },
    { header: 'Jenis Pelanggaran', accessor: 'jenisPelanggaran' },
    { header: 'Pasal', accessor: (r: Record<string, unknown>) => `${r.nomorPasal || '-'}` },
    { header: 'Bobot Poin', accessor: 'bobotPoin' },
    { header: 'Pelapor', accessor: 'pelapor' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Status & Riwayat Peringatan</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rekapitulasi pelanggaran dan kedisiplinan mahasiswa berdasarkan pasal
            </p>
          </div>
          <ExportButtonGroup
            data={() => riwayatData()?.data || []}
            columns={columns}
            filename="Laporan_Peringatan"
            title="Laporan Peringatan & Kedisiplinan Mahasiswa"
            subtitle={`Total: ${rekapPasal()?.total || 0} pelanggaran`}
          />
        </div>

        {/* Filter Periode */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div class="w-full sm:w-72">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Periode Semester
            </label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white font-medium"
              value={selectedPeriode()}
              onChange={(e) => {
                setSelectedPeriode(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="">Semua Periode</option>
              <For each={periodes()?.data || []}>
                {(p) => (
                  <option value={p.id}>
                    {p.nama} {p.aktif ? '(Aktif)' : ''}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="text-xs text-secondary-500 dark:text-secondary-400">
            <Show when={selectedPeriode()} fallback={<span>Menampilkan akumulasi seluruh periode</span>}>
              <span>
                Menampilkan data periode:{' '}
                <strong class="text-brand-600 dark:text-brand-400">
                  {periodes()?.data?.find((p) => p.id === selectedPeriode())?.nama || selectedPeriode()}
                </strong>
              </span>
            </Show>
          </div>
        </div>

        {/* Summary Cards */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Pelanggaran"
            value={rekapPasal()?.total ?? '...'}
            color="rose"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="Total Poin"
            value={rekapPasal()?.totalPoin ?? '...'}
            color="yellow"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                />
              </svg>
            }
          />
          <StatCard
            title="Rata-rata Poin"
            value={rekapPasal()?.total ? (rekapPasal()!.totalPoin / rekapPasal()!.total).toFixed(1) : '0'}
            subtitle="per pelanggaran"
            color="brand"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          />
        </div>

        {/* Distribution Chart (Top 10 Pasal + Lainnya) */}
        <Show when={(rekapPasal()?.perPasal?.length || 0) > 0}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">
                Agregasi Top 10 Pasal Pelanggaran (Terbanyak)
              </h3>
              <PieChart
                labels={
                  rekapPasal()?.perPasal.map((p) =>
                    p.nomorPasal !== 'Lainnya' && p.nomorPasal !== 'N/A' ? `Pasal ${p.nomorPasal}` : p.nomorPasal,
                  ) || []
                }
                data={rekapPasal()?.perPasal.map((p) => p.jumlah) || []}
                height={260}
                donut
              />
            </div>
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
              <div>
                <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Detail Agregasi Pasal</h3>
                <div class="overflow-x-auto max-h-[260px] overflow-y-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="sticky top-0 bg-white dark:bg-secondary-900">
                      <tr class="border-b border-secondary-100 dark:border-secondary-800">
                        <th class="py-2 font-semibold text-secondary-400">Pasal / Jenis</th>
                        <th class="py-2 text-center font-semibold text-secondary-400">Jumlah</th>
                        <th class="py-2 text-center font-semibold text-secondary-400">Total Poin</th>
                      </tr>
                    </thead>
                    <tbody>
                      <For each={rekapPasal()?.perPasal || []}>
                        {(p) => (
                          <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                            <td class="py-2 font-semibold text-secondary-800 dark:text-white">
                              {p.nomorPasal !== 'Lainnya' && p.nomorPasal !== 'N/A' ? `Pasal ${p.nomorPasal}: ` : ''}
                              {p.bunyiPasal}
                            </td>
                            <td class="py-2 text-center font-bold">{p.jumlah}</td>
                            <td class="py-2 text-center font-bold text-rose-600">{p.totalPoin}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Table Riwayat with Search & Pagination */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Riwayat Pelanggaran Detail</h3>
            <input
              type="text"
              placeholder="Cari NIM, Nama, atau Pelanggaran..."
              class="px-3 py-1.5 text-xs border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white w-full sm:w-64"
              value={search()}
              onInput={(e) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                  <th class="py-3 px-5">Tanggal</th>
                  <th class="py-3 px-5">Mahasiswa</th>
                  <th class="py-3 px-5">Jenis Pelanggaran & Pasal</th>
                  <th class="py-3 px-5 text-center">Bobot Poin</th>
                  <th class="py-3 px-5">Pelapor</th>
                  <th class="py-3 px-5">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={riwayatData()?.data || []}
                  fallback={
                    <tr>
                      <td colspan="6" class="text-center py-8 text-secondary-400">
                        Belum ada data pelanggaran
                      </td>
                    </tr>
                  }
                >
                  {(item: {
                    tanggal: string;
                    nim?: string;
                    namaMahasiswa?: string;
                    jenisPelanggaran: string;
                    nomorPasal?: string | null;
                    bobotPoin?: number;
                    jenisSanksi?: number;
                    pelapor?: string | null;
                    keterangan: string;
                  }) => (
                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                      <td class="py-3 px-5 whitespace-nowrap">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                      <td class="py-3 px-5">
                        <div class="font-bold text-secondary-800 dark:text-white">{item.namaMahasiswa || '-'}</div>
                        <div class="text-[10px] text-secondary-400">{item.nim}</div>
                      </td>
                      <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">
                        <div>{item.jenisPelanggaran}</div>
                        <Show when={item.nomorPasal}>
                          <span class="inline-block text-[10px] text-brand-600 dark:text-brand-400 font-normal">
                            Pasal {item.nomorPasal}
                          </span>
                        </Show>
                      </td>
                      <td class="py-3 px-5 text-center font-bold text-rose-600">
                        {item.jenisSanksi ?? item.bobotPoin}
                      </td>
                      <td class="py-3 px-5 text-secondary-600 dark:text-secondary-300 font-medium">
                        {item.pelapor || '-'}
                      </td>
                      <td class="py-3 px-5 text-secondary-500">{item.keterangan}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <Show when={riwayatData()?.pagination && riwayatData()!.pagination.totalPages > 1}>
            <div class="px-5 py-3 border-t border-secondary-100 dark:border-secondary-800 flex justify-between items-center text-xs">
              <span class="text-secondary-500">
                Halaman {riwayatData()?.pagination.page} dari {riwayatData()?.pagination.totalPages}
              </span>
              <div class="flex gap-2">
                <button
                  disabled={page() <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  class="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 rounded disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page() >= (riwayatData()?.pagination.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  class="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 rounded disabled:opacity-50"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>
    </MainLayout>
  );
}
