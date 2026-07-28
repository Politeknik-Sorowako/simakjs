import { createResource, createSignal, For, Show } from 'solid-js';
import { BarChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { khsController } from '../../controllers/khsController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanAkademik() {
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));

  const [rekap] = createResource(
    () => selectedPeriode(),
    async (periodeId) => {
      if (!periodeId) return null;
      try {
        return await khsController.getRekapPerProdi(periodeId);
      } catch {
        return null;
      }
    },
  );

  const columns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total Mahasiswa', accessor: 'totalMahasiswa' },
    {
      header: 'Rata-rata IP',
      accessor: (row: Record<string, unknown>) => (Number(row.rataIP) > 0 ? Number(row.rataIP).toFixed(2) : '-'),
    },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Akademik per Program Studi</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rata-rata IP dan performa akademik per prodi
            </p>
          </div>
          <Show when={rekap()}>
            <ExportButtonGroup
              data={() => rekap()?.prodi || []}
              columns={columns}
              filename={`Akademik_${selectedPeriode()}`}
              title="Laporan Akademik per Prodi"
              subtitle={`Periode: ${selectedPeriode()}`}
            />
          </Show>
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
            Periode Akademik
          </label>
          <select
            class="w-full sm:w-64 px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
            value={selectedPeriode()}
            onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
          >
            <option value="">Pilih Periode</option>
            <For each={periodes()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
          </select>
        </div>

        <Show when={rekap()}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Rata-rata IP per Prodi</h3>
              <BarChart
                labels={(rekap()?.prodi || []).map((p) => p.prodiNama)}
                datasets={[
                  {
                    label: 'Rata-rata IP',
                    data: (rekap()?.prodi || []).map((p) => p.rataIP),
                    backgroundColor: '#6366f1',
                  },
                ]}
                height={300}
                horizontal
              />
            </div>
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Jumlah Mahasiswa per Prodi</h3>
              <BarChart
                labels={(rekap()?.prodi || []).map((p) => p.prodiNama)}
                datasets={[
                  {
                    label: 'Total Mahasiswa',
                    data: (rekap()?.prodi || []).map((p) => p.totalMahasiswa),
                    backgroundColor: '#06b6d4',
                  },
                ]}
                height={300}
                horizontal
              />
            </div>
          </div>
        </Show>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
            <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Detail per Program Studi</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                  <th class="py-3 px-5">Program Studi</th>
                  <th class="py-3 px-5 text-center">Total Mahasiswa</th>
                  <th class="py-3 px-5 text-center">Rata-rata IP</th>
                </tr>
              </thead>
              <tbody>
                <For each={rekap()?.prodi || []}>
                  {(p) => (
                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                      <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{p.prodiNama}</td>
                      <td class="py-3 px-5 text-center">{p.totalMahasiswa}</td>
                      <td class="py-3 px-5 text-center font-bold text-brand-600">
                        {p.rataIP > 0 ? p.rataIP.toFixed(2) : '-'}
                      </td>
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
