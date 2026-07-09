import { createEffect, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { StatCard, BarChart } from '../../components/charts';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { ExportColumn } from '../../utils/export';

export default function LaporanMahasiswaBaru() {
  const [angkatan, setAngkatan] = createSignal(new Date().getFullYear().toString());
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<any>(null);
  const [stats, setStats] = createSignal<any>({ total: 0, perProdi: [], trend: [] });

  createEffect(() => {
    const thn = angkatan();
    setLoading(true);
    setError(null);
    mahasiswaController.getMahasiswaBaru(thn)
      .then((result) => {
        setStats(result || { total: 0, perProdi: [], trend: [] });
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  });

  const columns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total', accessor: 'total' },
    { header: 'Laki-laki', accessor: 'laki' },
    { header: 'Perempuan', accessor: 'perempuan' },
  ];

  const angkatanList = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Penerimaan Mahasiswa Baru</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">Statistik penerimaan mahasiswa baru per program studi</p>
          </div>
          <ExportButtonGroup
            data={() => stats()?.perProdi || []}
            columns={columns}
            filename={`PMB_${angkat()}`}
            title="Laporan Penerimaan Mahasiswa Baru"
            subtitle={`Angkatan: ${angkat()}`}
          />
        </div>

        {/* Filter */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <div class="w-full sm:w-48">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">Angkatan</label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={angkatan()}
              onChange={(e) => setAngkatan(e.currentTarget.value)}
            >
              <For each={angkatList}>{(a) => <option value={a}>{a}</option>}</For>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total Mahasiswa Baru" value={stats()?.total ?? '...'} loading={loading()} color="brand"
            icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
          <StatCard title="Perempuan" value={stats()?.perProdi?.reduce((s: number, p: any) => s + p.perempuan, 0) ?? '...'} loading={loading()} color="accent"
            icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
          <StatCard title="Laki-laki" value={stats()?.perProdi?.reduce((s: number, p: any) => s + p.laki, 0) ?? '...'} loading={loading()} color="green"
            icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
          />
        </div>

        {/* Error */}
        <Show when={error()}>
          <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 p-4 rounded-xl text-sm text-rose-700 dark:text-rose-400">
            Gagal memuat data: {error()?.message || 'Unknown error'}
          </div>
        </Show>

        {/* Chart + Table */}
        <Show when={!loading()}>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Mahasiswa Baru per Prodi</h3>
              <BarChart
                labels={(stats()?.perProdi || []).map((p: any) => p.prodiNama)}
                datasets={[{
                  label: 'Mahasiswa Baru',
                  data: (stats()?.perProdi || []).map((p: any) => p.total),
                  backgroundColor: '#6366f1',
                }]}
                height={280}
                horizontal
              />
            </div>
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Tren Penerimaan per Angkatan</h3>
              <BarChart
                labels={(stats()?.trend || []).map((t: any) => t.angkatan)}
                datasets={[{
                  label: 'Total Mahasiswa',
                  data: (stats()?.trend || []).map((t: any) => t.total),
                  backgroundColor: '#06b6d4',
                }]}
                height={280}
              />
            </div>
          </div>
        </Show>

        {/* Table */}
        <Show when={!loading()}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Detail per Program Studi</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Program Studi</th>
                    <th class="py-3 px-5 text-center">Total</th>
                    <th class="py-3 px-5 text-center">Laki-laki</th>
                    <th class="py-3 px-5 text-center">Perempuan</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={stats()?.perProdi || []}>
                    {(p: any) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{p.prodiNama}</td>
                        <td class="py-3 px-5 text-center font-bold">{p.total}</td>
                        <td class="py-3 px-5 text-center">{p.laki}</td>
                        <td class="py-3 px-5 text-center">{p.perempuan}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
