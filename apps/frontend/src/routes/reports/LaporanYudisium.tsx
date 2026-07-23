import { createResource, createSignal, For, Show } from 'solid-js';
import { PieChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { khsController } from '../../controllers/khsController';
import { ExportColumn } from '../../utils/export';

export default function LaporanYudisium() {
  const [stats] = createResource(async () => {
    try {
      return await khsController.getYudisiumStats();
    } catch {
      return null;
    }
  });

  const columns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total Pengajuan', accessor: 'total' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Yudisium / Kelulusan</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rekapitulasi pengajuan yudisium dan status kelulusan
            </p>
          </div>
          <ExportButtonGroup
            data={() => stats()?.perProdi || []}
            columns={columns}
            filename="Yudisium"
            title="Laporan Yudisium"
          />
        </div>

        <Show when={stats()}>
          {(() => {
            const s = stats()!;
            return (
              <>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    title="Total Pengajuan"
                    value={s.totalPengajuan}
                    color="brand"
                    icon={
                      <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                        />
                      </svg>
                    }
                  />
                  <StatCard
                    title="Disetujui"
                    value={s.statusBreakdown?.disetujui || 0}
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
                    value={s.statusBreakdown?.diajukan || s.statusBreakdown?.diverifikasi || 0}
                    color="yellow"
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
                    <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Status Pengajuan</h3>
                    <PieChart
                      labels={Object.keys(s.statusBreakdown || {})}
                      data={Object.values(s.statusBreakdown || {})}
                      height={250}
                      donut
                    />
                  </div>
                  <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                    <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Pengajuan per Prodi</h3>
                    <For each={s.perProdi || []}>
                      {(p) => (
                        <div class="flex justify-between items-center py-2 border-b border-secondary-50 last:border-0">
                          <span class="text-xs font-semibold text-secondary-800 dark:text-white">{p.prodiNama}</span>
                          <span class="text-xs font-bold">{p.total} pengajuan</span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </>
            );
          })()}
        </Show>
      </div>
    </MainLayout>
  );
}
