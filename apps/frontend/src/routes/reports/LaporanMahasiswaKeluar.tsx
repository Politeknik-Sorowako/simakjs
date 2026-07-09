import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { StatCard, PieChart, BarChart } from '../../components/charts';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { khsController } from '../../controllers/khsController';
import { ExportColumn } from '../../utils/export';

export default function LaporanMahasiswaKeluar() {
  const [stats] = createResource(async () => {
    try { return await khsController.getMahasiswaKeluarStats(); }
    catch { return null; }
  });

  const columns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total', accessor: 'total' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Mahasiswa Keluar / Dropout</h1><p class="text-sm text-secondary-500 dark:text-secondary-200">Rekapitulasi mahasiswa keluar, dropout, pindah, dan wafat</p></div>
          <ExportButtonGroup data={() => stats()?.perProdi || []} columns={columns} filename="Mahasiswa_Keluar" title="Laporan Mahasiswa Keluar" />
        </div>

        <Show when={stats()}>
          {() => { const s = stats()!;
            return (<>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard title="Total Keluar" value={s.total} color="rose" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>} />
                <StatCard title="Drop Out" value={s.perStatus?.find((x: any) => x.status === 'drop_out')?.jumlah || 0} color="yellow" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Lulus" value={s.perStatus?.find((x: any) => x.status === 'lulus')?.jumlah || 0} color="green" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                  <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Distribusi Status Keluar</h3>
                  <PieChart labels={(s.perStatus || []).map((x: any) => x.status)} data={(s.perStatus || []).map((x: any) => x.jumlah)} height={250} donut />
                </div>
                <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                  <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Per Prodi</h3>
                  <BarChart labels={(s.perProdi || []).map((p: any) => p.prodiNama)} datasets={[{ label: 'Jumlah', data: (s.perProdi || []).map((p: any) => p.total), backgroundColor: '#f43f5e' }]} height={280} horizontal />
                </div>
              </div>
            </>);
          }}
        </Show>
      </div>
    </MainLayout>
  );
}
