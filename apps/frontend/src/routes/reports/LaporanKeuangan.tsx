import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { StatCard, PieChart, BarChart } from '../../components/charts';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { tagihanController } from '../../controllers/tagihanController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanKeuangan() {
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));

  const [stats] = createResource(
    () => selectedPeriode(),
    async (periodeId) => {
      if (!periodeId) return null;
      try { return await tagihanController.getStats(periodeId); }
      catch { return null; }
    },
  );

  const columns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total', accessor: 'total' },
    { header: 'Terbayar', accessor: (row: any) => formatRupiah(row.terbayar) },
    { header: 'Tunggakan', accessor: (row: any) => formatRupiah(row.tunggakan) },
  ];

  function formatRupiah(num: number) { return 'Rp ' + num.toLocaleString('id-ID'); }

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div><h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Keuangan per Periode</h1><p class="text-sm text-secondary-500 dark:text-secondary-200">Rekapitulasi tagihan dan pembayaran per periode akademik</p></div>
          <Show when={stats()}><ExportButtonGroup data={() => stats()?.rekapPerProdi || []} columns={columns} filename={'Keuangan_' + selectedPeriode()} title="Laporan Keuangan" subtitle={'Periode: ' + selectedPeriode()} /></Show>
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">Periode Akademik</label>
          <select class="w-full sm:w-64 px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white" value={selectedPeriode()} onChange={(e) => setSelectedPeriode(e.currentTarget.value)}>
            <option value="">Pilih Periode</option>
            <For each={periodes()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
          </select>
        </div>

        <Show when={stats()}>
          {() => { const s = stats()!;
            return (<>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Total Mahasiswa" value={s.totalMahasiswa} color="brand" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
                <StatCard title="Total Tagihan" value={formatRupiah(s.totalTagihan)} color="accent" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Total Terbayar" value={formatRupiah(s.totalTerbayar)} color="green" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Sisa Tunggakan" value={formatRupiah(s.totalTunggakan)} color="rose" icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              </div>
              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                  <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Status Pembayaran</h3>
                  <PieChart labels={['Lunas', 'Cicilan', 'Belum Bayar']} data={[s.statusBreakdown?.lunas || 0, s.statusBreakdown?.cicilan || 0, s.statusBreakdown?.belum_bayar || 0]} height={250} donut />
                </div>
                <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                  <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Tunggakan per Prodi</h3>
                  <BarChart labels={(s.rekapPerProdi || []).map((p: any) => p.prodiNama)} datasets={[{ label: 'Tunggakan', data: (s.rekapPerProdi || []).map((p: any) => p.tunggakan), backgroundColor: '#f43f5e' }]} height={280} horizontal />
                </div>
              </div>
              <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800"><h3 class="text-sm font-bold text-secondary-800 dark:text-white">Rekap per Program Studi</h3></div>
                <div class="overflow-x-auto"><table class="w-full text-left text-xs border-collapse">
                  <thead><tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Prodi</th><th class="py-3 px-5 text-center">Total</th><th class="py-3 px-5 text-center">Terbayar</th><th class="py-3 px-5 text-center">Tunggakan</th>
                  </tr></thead>
                  <tbody>
                    <For each={s.rekapPerProdi || []}>{(p: any) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{p.prodiNama}</td>
                        <td class="py-3 px-5 text-center">{p.total}</td>
                        <td class="py-3 px-5 text-center font-bold text-green-600">{formatRupiah(p.terbayar)}</td>
                        <td class="py-3 px-5 text-center font-bold text-rose-600">{formatRupiah(p.tunggakan)}</td>
                      </tr>
                    )}</For>
                  </tbody>
                </table></div>
              </div>
            </>);
          }}
        </Show>
      </div>
    </MainLayout>
  );
}
