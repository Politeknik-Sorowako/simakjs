import { createResource, createSignal, For, Show } from 'solid-js';
import { BarChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { khsController } from '../../controllers/khsController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { prodiController } from '../../controllers/prodiController';
import { ExportColumn } from '../../utils/export';

export default function LaporanAkademik() {
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal('');
  const [mkSearch, setMkSearch] = createSignal('');

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));
  const [prodis] = createResource(() => prodiController.getAll('', 1, 100));

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

  const [matriksNilai] = createResource(
    () => ({ periodeId: selectedPeriode(), prodiId: selectedProdi(), search: mkSearch() }),
    async ({ periodeId, prodiId, search }) => {
      try {
        const pId = prodiId ? parseInt(prodiId) : undefined;
        return await khsController.getMatriksNilaiMK(periodeId || undefined, pId, search || undefined);
      } catch {
        return [];
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

  const matriksColumns: ExportColumn[] = [
    { header: 'Kode MK', accessor: 'kodeMk' },
    { header: 'Nama Mata Kuliah', accessor: 'namaMk' },
    { header: 'SKS', accessor: 'sks' },
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'A (A/A-/A+)', accessor: 'gradeA' },
    { header: 'B (B/B-/B+)', accessor: 'gradeB' },
    { header: 'C (C/C+)', accessor: 'gradeC' },
    { header: 'D (D/D+)', accessor: 'gradeD' },
    { header: 'E', accessor: 'gradeE' },
    { header: 'Belum Ada', accessor: 'gradeNull' },
    { header: 'Total Peserta', accessor: 'totalPeserta' },
    { header: '% Lulus (A-D)', accessor: (r: Record<string, unknown>) => `${r.persenLulus}%` },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Akademik & Matriks Nilai MK</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rata-rata IP per prodi dan matriks sebaran nilai mata kuliah (A - E)
            </p>
          </div>
          <div class="flex gap-2">
            <Show when={rekap()}>
              <ExportButtonGroup
                data={() => rekap()?.prodi || []}
                columns={columns}
                filename={`Akademik_Prodi_${selectedPeriode()}`}
                title="Laporan Akademik per Prodi"
                subtitle={`Periode: ${selectedPeriode()}`}
              />
            </Show>
            <Show when={(matriksNilai() || []).length > 0}>
              <ExportButtonGroup
                data={() => matriksNilai() || []}
                columns={matriksColumns}
                filename={`Matriks_Nilai_MK_${selectedPeriode()}`}
                title="Matriks Sebaran Nilai Mata Kuliah (A-E)"
                subtitle={`Periode: ${selectedPeriode() || 'Semua'}`}
              />
            </Show>
          </div>
        </div>

        {/* Filter Controls */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Periode Akademik
            </label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
            >
              <option value="">Pilih Periode</option>
              <For each={periodes()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Program Studi
            </label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedProdi()}
              onChange={(e) => setSelectedProdi(e.currentTarget.value)}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Cari Kode / Nama MK
            </label>
            <input
              type="text"
              placeholder="Filter mata kuliah..."
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={mkSearch()}
              onInput={(e) => setMkSearch(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Rekap Graphs */}
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

        {/* Tabel Ringkasan Prodi */}
        <Show when={rekap()}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Detail Rekap IP per Program Studi</h3>
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
        </Show>

        {/* Matriks Nilai Mata Kuliah (A s.d. E) */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
            <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
              Matriks Mata Kuliah $\times$ Jumlah Mahasiswa Nilai (A - E)
            </h3>
            <span class="text-xs text-secondary-500">Total MK: {(matriksNilai() || []).length}</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                  <th class="py-3 px-4">Kode MK</th>
                  <th class="py-3 px-4">Mata Kuliah</th>
                  <th class="py-3 px-4 text-center">SKS</th>
                  <th class="py-3 px-4">Program Studi</th>
                  <th class="py-3 px-4 text-center bg-green-500/10 text-green-700 dark:text-green-400">A</th>
                  <th class="py-3 px-4 text-center bg-blue-500/10 text-blue-700 dark:text-blue-400">B</th>
                  <th class="py-3 px-4 text-center bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">C</th>
                  <th class="py-3 px-4 text-center bg-orange-500/10 text-orange-700 dark:text-orange-400">D</th>
                  <th class="py-3 px-4 text-center bg-rose-500/10 text-rose-700 dark:text-rose-400">E</th>
                  <th class="py-3 px-4 text-center text-secondary-400">Belum Ada</th>
                  <th class="py-3 px-4 text-center font-bold">Total</th>
                  <th class="py-3 px-4 text-center">% Kelulusan</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={matriksNilai() || []}
                  fallback={
                    <tr>
                      <td colspan="12" class="text-center py-8 text-secondary-400">
                        Tidak ada data sebaran nilai mata kuliah untuk filter yang dipilih
                      </td>
                    </tr>
                  }
                >
                  {(item) => (
                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                      <td class="py-3 px-4 font-mono text-secondary-600 dark:text-secondary-300">{item.kodeMk}</td>
                      <td class="py-3 px-4 font-semibold text-secondary-800 dark:text-white">{item.namaMk}</td>
                      <td class="py-3 px-4 text-center">{item.sks}</td>
                      <td class="py-3 px-4 text-secondary-500">{item.prodiNama}</td>
                      <td class="py-3 px-4 text-center font-bold text-green-600 bg-green-500/5">{item.gradeA}</td>
                      <td class="py-3 px-4 text-center font-bold text-blue-600 bg-blue-500/5">{item.gradeB}</td>
                      <td class="py-3 px-4 text-center font-bold text-yellow-600 bg-yellow-500/5">{item.gradeC}</td>
                      <td class="py-3 px-4 text-center font-bold text-orange-600 bg-orange-500/5">{item.gradeD}</td>
                      <td class="py-3 px-4 text-center font-bold text-rose-600 bg-rose-500/5">{item.gradeE}</td>
                      <td class="py-3 px-4 text-center text-secondary-400">{item.gradeNull}</td>
                      <td class="py-3 px-4 text-center font-bold">{item.totalPeserta}</td>
                      <td class="py-3 px-4 text-center font-bold">
                        <span
                          class={`px-2 py-0.5 rounded text-[10px] ${
                            item.persenLulus >= 80
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : item.persenLulus >= 50
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
                          }`}
                        >
                          {item.persenLulus}%
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
