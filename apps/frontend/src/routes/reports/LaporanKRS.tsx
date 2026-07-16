import { createResource, createSignal, For, Show } from 'solid-js';
import { PieChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { krsController } from '../../controllers/krsController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanKRS() {
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));

  const [stats] = createResource(
    () => selectedPeriode(),
    async (periodeId) => {
      if (!periodeId) return null;
      try {
        return await krsController.getStats(periodeId);
      } catch {
        return null;
      }
    },
  );

  const columns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total KRS', accessor: 'total' },
    { header: 'Approved', accessor: 'approved' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan KRS</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Status pengisian dan approval KRS per periode
            </p>
          </div>
          <Show when={stats()}>
            <ExportButtonGroup
              data={() => stats()?.perProdi || []}
              columns={columns}
              filename={'KRS_' + selectedPeriode()}
              title="Laporan KRS"
              subtitle={'Periode: ' + selectedPeriode()}
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

        <Show when={stats()}>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="Total KRS"
              value={stats()?.total || 0}
              color="brand"
              icon={
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              }
            />
            <StatCard
              title="Disetujui"
              value={stats()?.approved || 0}
              color="green"
              icon={
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
            <StatCard
              title="Pending"
              value={stats()?.pending || 0}
              color={stats()?.pending > 0 ? 'yellow' : 'green'}
              icon={
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
            />
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Status Approval KRS</h3>
              <PieChart
                labels={['Disetujui', 'Pending']}
                data={[stats()?.approved || 0, stats()?.pending || 0]}
                height={250}
                donut
              />
            </div>
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">KRS per Program Studi</h3>
              <For each={stats()?.perProdi || []}>
                {(p: any) => (
                  <div class="flex justify-between items-center py-2 border-b border-secondary-50 last:border-0">
                    <span class="text-xs font-semibold text-secondary-800 dark:text-white">{p.prodiNama}</span>
                    <span class="text-xs">
                      {p.total} KRS <span class="text-green-600 font-bold">({p.approved} approved)</span>
                    </span>
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
