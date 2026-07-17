import { createResource, createSignal, For, Show } from 'solid-js';
import { StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { bimbinganController } from '../../controllers/bimbinganController';
import { dosenController } from '../../controllers/dosenController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanBKD() {
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedDosen, setSelectedDosen] = createSignal('');

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));
  const [dosens] = createResource(() => dosenController.getAll('', 1, 100));

  const [rekap] = createResource(
    () => ({ dosenId: selectedDosen(), periodeId: selectedPeriode() }),
    async ({ dosenId, periodeId }) => {
      try {
        return await bimbinganController.getRekapBkd(dosenId ? parseInt(dosenId) : undefined, periodeId || undefined);
      } catch {
        return { data: [] };
      }
    },
  );

  const columns: ExportColumn[] = [
    {
      header: 'NIM',
      accessor: (row: { mahasiswa?: { nim: string }; isApproved: boolean; statusBkd: boolean }) =>
        row.mahasiswa?.nim || '-',
    },
    {
      header: 'Mahasiswa',
      accessor: (row: { mahasiswa?: { nama: string }; isApproved: boolean; statusBkd: boolean }) =>
        row.mahasiswa?.nama || '-',
    },
    { header: 'Ringkasan', accessor: 'ringkasan' },
    { header: 'Status', accessor: (row: { isApproved: boolean }) => (row.isApproved ? 'Disetujui' : 'Pending') },
    { header: 'BKD', accessor: (row: { statusBkd: boolean }) => (row.statusBkd ? 'Ya' : 'Tidak') },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan BKD / Beban Dosen</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rekapitulasi beban kerja dosen (BKD) per semester
            </p>
          </div>
          <ExportButtonGroup data={() => rekap()?.data || []} columns={columns} filename="BKD" title="Laporan BKD" />
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">Periode</label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
            >
              <option value="">Semua Periode</option>
              <For each={periodes()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">Dosen</label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedDosen()}
              onChange={(e) => setSelectedDosen(e.currentTarget.value)}
            >
              <option value="">Semua Dosen</option>
              <For each={dosens()?.data || []}>
                {(d: { id: number; nama: string; nip: string }) => (
                  <option value={d.id}>
                    {d.nama} ({d.nip})
                  </option>
                )}
              </For>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Bimbingan"
            value={rekap()?.data?.length || 0}
            color="brand"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
          />
          <StatCard
            title="Disetujui"
            value={rekap()?.data?.filter((r: { isApproved: boolean }) => r.isApproved).length || 0}
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
            title="BKD Aktif"
            value={rekap()?.data?.filter((r: { statusBkd: boolean }) => r.statusBkd).length || 0}
            color="accent"
            icon={
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
          />
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
            <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Detail Bimbingan</h3>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                  <th class="py-3 px-5">Mahasiswa</th>
                  <th class="py-3 px-5">Ringkasan</th>
                  <th class="py-3 px-5 text-center">Status</th>
                  <th class="py-3 px-5 text-center">BKD</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={rekap()?.data || []}
                  fallback={
                    <tr>
                      <td colspan="4" class="text-center py-8 text-secondary-400">
                        Tidak ada data
                      </td>
                    </tr>
                  }
                >
                  {(r: {
                    mahasiswa?: { nama: string; nim: string };
                    ringkasan: string;
                    isApproved: boolean;
                    statusBkd: boolean;
                  }) => (
                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                      <td class="py-3 px-5">
                        <div class="font-semibold text-secondary-800 dark:text-white">{r.mahasiswa?.nama || '-'}</div>
                        <div class="text-[10px] text-secondary-400">{r.mahasiswa?.nim || ''}</div>
                      </td>
                      <td class="py-3 px-5 text-secondary-500">{r.ringkasan || '-'}</td>
                      <td class="py-3 px-5 text-center">
                        <span
                          class={
                            'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                            (r.isApproved ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700')
                          }
                        >
                          {r.isApproved ? 'Disetujui' : 'Pending'}
                        </span>
                      </td>
                      <td class="py-3 px-5 text-center">
                        <span
                          class={
                            'px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                            (r.statusBkd ? 'bg-blue-50 text-blue-700' : 'bg-secondary-50 text-secondary-500')
                          }
                        >
                          {r.statusBkd ? 'Ya' : 'Tidak'}
                        </span>
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
