import { createResource, createSignal, For, Show } from 'solid-js';
import { PieChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { bimbinganController } from '../../controllers/bimbinganController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanPeringatan() {
  const [selectedPeriode] = createSignal('');

  const [rekapPelanggaran] = createResource(async () => {
    try {
      const data = await bimbinganController.getAllPelanggaran();
      const rekap: Record<string, { jenis: string; jumlah: number; totalPoin: number }> = {};
      let totalPoin = 0;
      for (const p of data) {
        totalPoin += p.bobotPoin;
        const existing = rekap[p.jenisPelanggaran] || { jenis: p.jenisPelanggaran, jumlah: 0, totalPoin: 0 };
        existing.jumlah++;
        existing.totalPoin += p.bobotPoin;
        rekap[p.jenisPelanggaran] = existing;
      }
      return { total: data.length, totalPoin, perJenis: Object.values(rekap), data };
    } catch {
      return { total: 0, totalPoin: 0, perJenis: [], data: [] };
    }
  });

  const columns: ExportColumn[] = [
    { header: 'Tanggal', accessor: 'tanggal' },
    { header: 'Jenis Pelanggaran', accessor: 'jenisPelanggaran' },
    { header: 'Bobot Poin', accessor: 'bobotPoin' },
    { header: 'Keterangan', accessor: 'keterangan' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Status & Riwayat Peringatan</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rekapitulasi pelanggaran dan kedisiplinan mahasiswa
            </p>
          </div>
          <ExportButtonGroup
            data={() => rekapPelanggaran()?.data || []}
            columns={columns}
            filename="Laporan_Peringatan"
            title="Laporan Peringatan & Kedisiplinan Mahasiswa"
            subtitle={`Total: ${rekapPelanggaran()?.total || 0} pelanggaran`}
          />
        </div>

        {/* Summary Cards */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Pelanggaran"
            value={rekapPelanggaran()?.total || '...'}
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
            value={rekapPelanggaran()?.totalPoin || '...'}
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
            value={
              rekapPelanggaran()?.total ? (rekapPelanggaran()!.totalPoin / rekapPelanggaran()!.total).toFixed(1) : '0'
            }
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

        {/* Distribution Chart */}
        <Show when={(rekapPelanggaran()?.perJenis?.length || 0) > 0}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">
                Distribusi Pelanggaran per Jenis
              </h3>
              <PieChart
                labels={
                  rekapPelanggaran()?.perJenis.map(
                    (j: { jenis: string; jumlah: number; totalPoin: number }) => j.jenis,
                  ) || []
                }
                data={
                  rekapPelanggaran()?.perJenis.map(
                    (j: { jenis: string; jumlah: number; totalPoin: number }) => j.jumlah,
                  ) || []
                }
                height={250}
                donut
              />
            </div>
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Detail Pelanggaran</h3>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-100 dark:border-secondary-800">
                      <th class="py-2 font-semibold text-secondary-400">Jenis Pelanggaran</th>
                      <th class="py-2 text-center font-semibold text-secondary-400">Jumlah</th>
                      <th class="py-2 text-center font-semibold text-secondary-400">Total Poin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={rekapPelanggaran()?.perJenis || []}>
                      {(j: { jenis: string; jumlah: number; totalPoin: number }) => (
                        <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                          <td class="py-2 font-semibold text-secondary-800 dark:text-white">{j.jenis}</td>
                          <td class="py-2 text-center">{j.jumlah}</td>
                          <td class="py-2 text-center font-bold text-rose-600">{j.totalPoin}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Show>

        {/* Table */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
            <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Riwayat Pelanggaran</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                  <th class="py-3 px-5">Tanggal</th>
                  <th class="py-3 px-5">Jenis Pelanggaran</th>
                  <th class="py-3 px-5 text-center">Bobot Poin</th>
                  <th class="py-3 px-5">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={rekapPelanggaran()?.data || []}
                  fallback={
                    <tr>
                      <td colspan="4" class="text-center py-8 text-secondary-400">
                        Belum ada data pelanggaran
                      </td>
                    </tr>
                  }
                >
                  {(item: { tanggal: string; jenisPelanggaran: string; bobotPoin: number; keterangan: string }) => (
                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                      <td class="py-3 px-5">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                      <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">
                        {item.jenisPelanggaran}
                      </td>
                      <td class="py-3 px-5 text-center font-bold text-rose-600">{item.bobotPoin}</td>
                      <td class="py-3 px-5 text-secondary-500">{item.keterangan}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
