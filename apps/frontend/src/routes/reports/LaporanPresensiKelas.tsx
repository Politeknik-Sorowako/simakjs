import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { StatCard, PieChart } from '../../components/charts';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { presensiController } from '../../controllers/presensiController';
import { kelasKuliahController } from '../../controllers/kelasKuliahController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanPresensiKelas() {
  const [selectedKelas, setSelectedKelas] = createSignal('');
  const [selectedPeriode, setSelectedPeriode] = createSignal('');

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));
  const [kelasList] = createResource(
    () => selectedPeriode(),
    async (periodeId) => {
      if (!periodeId) return { data: [] };
      return await kelasKuliahController.getAll(undefined, 1, 100, undefined, periodeId);
    },
  );

  const [rekap] = createResource(
    () => selectedKelas(),
    async (kelasId) => {
      if (!kelasId) return null;
      try { return await presensiController.getRekapKehadiran(parseInt(kelasId)); }
      catch { return null; }
    },
  );

  const columns: ExportColumn[] = [
    { header: 'NIM', accessor: 'nim' },
    { header: 'Nama', accessor: 'nama' },
    { header: 'Hadir', accessor: 'hadir' },
    { header: 'Sakit', accessor: 'sakit' },
    { header: 'Izin', accessor: 'izin' },
    { header: 'Alpa', accessor: 'alpa' },
    { header: 'Telat', accessor: 'telat' },
    { header: '% Hadir', accessor: 'persentaseHadir' },
  ];

  const statusColumns: ExportColumn[] = [
    { header: 'Status', accessor: (row: any) => row.status },
    { header: 'Jumlah', accessor: 'jumlah' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Presensi Kelas</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">Rekapitulasi kehadiran mahasiswa per kelas / mata kuliah</p>
          </div>
          <Show when={rekap()}>
            <ExportButtonGroup
              data={() => rekap()?.mahasiswa || []}
              columns={columns}
              filename={`Presensi_Kelas_${selectedKelas()}`}
              title="Laporan Presensi Kelas"
              subtitle={rekap()?.kelas?.mataKuliah?.nama || ''}
            />
          </Show>
        </div>

        {/* Filters */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">Periode</label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedPeriode()}
              onChange={(e) => { setSelectedPeriode(e.currentTarget.value); setSelectedKelas(''); }}
            >
              <option value="">Pilih Periode</option>
              <For each={periodes()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">Kelas / Mata Kuliah</label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedKelas()}
              onChange={(e) => setSelectedKelas(e.currentTarget.value)}
              disabled={!selectedPeriode()}
            >
              <option value="">Pilih Kelas</option>
              <For each={kelasList()?.data || []}>
                {(k: any) => <option value={k.id}>{k.mataKuliah?.nama || k.namaKelas} ({k.namaKelas})</option>}
              </For>
            </select>
          </div>
        </div>

        <Show when={rekap()}>
          {() => {
            const data = rekap()!;
            const totalHadir = data.mahasiswa.reduce((s: number, m: any) => s + m.hadir, 0);
            const totalSakit = data.mahasiswa.reduce((s: number, m: any) => s + m.sakit, 0);
            const totalIzin = data.mahasiswa.reduce((s: number, m: any) => s + m.izin, 0);
            const totalAlpa = data.mahasiswa.reduce((s: number, m: any) => s + m.alpa, 0);
            const totalTelat = data.mahasiswa.reduce((s: number, m: any) => s + m.telat, 0);
            const rataHadir = data.mahasiswa.length > 0
              ? Math.round(data.mahasiswa.reduce((s: number, m: any) => s + m.persentaseHadir, 0) / data.mahasiswa.length)
              : 0;

            return (
              <>
                {/* Summary */}
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard title="Total Mahasiswa" value={data.mahasiswa.length} color="brand"
                    icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                  />
                  <StatCard title="Total Pertemuan" value={data.totalPertemuan} color="accent"
                    icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                  />
                  <StatCard title="Rata-rata Kehadiran" value={rataHadir + '%'} color="green"
                    icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                  <StatCard title="Total Alpa" value={totalAlpa} color="rose"
                    icon={<svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  />
                </div>

                {/* Charts */}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                    <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Status Kehadiran</h3>
                    <PieChart
                      labels={['Hadir', 'Sakit', 'Izin', 'Alpa', 'Telat']}
                      data={[totalHadir, totalSakit, totalIzin, totalAlpa, totalTelat]}
                      height={250}
                      donut
                    />
                  </div>
                  <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
                    <h3 class="text-sm font-bold text-secondary-800 dark:text-white mb-3">Info Kelas</h3>
                    <div class="space-y-2 text-xs">
                      <p><span class="text-secondary-400">Mata Kuliah:</span> <span class="font-bold text-secondary-800 dark:text-white">{data.kelas?.mataKuliah?.nama || '-'}</span></p>
                      <p><span class="text-secondary-400">Kelas:</span> <span class="font-bold text-secondary-800 dark:text-white">{data.kelas?.namaKelas || '-'}</span></p>
                      <p><span class="text-secondary-400">Periode:</span> <span class="font-bold text-secondary-800 dark:text-white">{data.kelas?.periodeId || '-'}</span></p>
                      <p><span class="text-secondary-400">Total Pertemuan:</span> <span class="font-bold text-secondary-800 dark:text-white">{data.totalPertemuan}</span></p>
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
                  <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
                    <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Detail Presensi Mahasiswa</h3>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                          <th class="py-3 px-5">NIM</th>
                          <th class="py-3 px-5">Nama</th>
                          <th class="py-3 px-5 text-center">Hadir</th>
                          <th class="py-3 px-5 text-center">Sakit</th>
                          <th class="py-3 px-5 text-center">Izin</th>
                          <th class="py-3 px-5 text-center">Alpa</th>
                          <th class="py-3 px-5 text-center">Telat</th>
                          <th class="py-3 px-5 text-center">% Hadir</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={data.mahasiswa}>
                          {(m: any) => (
                            <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                              <td class="py-3 px-5 font-mono text-secondary-500">{m.nim}</td>
                              <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{m.nama}</td>
                              <td class="py-3 px-5 text-center text-green-600 font-bold">{m.hadir}</td>
                              <td class="py-3 px-5 text-center">{m.sakit}</td>
                              <td class="py-3 px-5 text-center">{m.izin}</td>
                              <td class="py-3 px-5 text-center text-rose-600 font-bold">{m.alpa}</td>
                              <td class="py-3 px-5 text-center">{m.telat}</td>
                              <td class="py-3 px-5 text-center font-bold">{m.persentaseHadir}%</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            );
          }}
        </Show>
      </div>
    </MainLayout>
  );
}
