import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { khsController } from '../../controllers/khsController';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { prodiController } from '../../controllers/prodiController';
import { ExportColumn } from '../../utils/export';

export default function LaporanRekapNilai() {
  const auth = useAuth();
  const toast = useToast();

  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal('');
  const [mkSearch, setMkSearch] = createSignal('');
  const [mhsSearch, setMhsSearch] = createSignal('');
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));
  const [prodis] = createResource(() => prodiController.getAll('', 1, 100));

  createEffect(() => {
    const list = periodes()?.data;
    if (list && list.length > 0 && !selectedPeriode()) {
      const active = list.find((p) => p.aktif);
      if (active) setSelectedPeriode(active.id);
      else setSelectedPeriode(list[0].id);
    }
  });

  const [rekapProdi] = createResource(
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

  const [rekapNilai] = createResource(
    () => ({ mhsId: selectedMhsId(), periode: selectedPeriode() }),
    async ({ mhsId, periode }) => {
      if (!mhsId) return null;
      try {
        return await khsController.getRekapNilai(mhsId, periode || undefined);
      } catch {
        return null;
      }
    },
  );

  const [mahasiswas] = createResource(
    () => ({ search: mhsSearch(), prodi: selectedProdi() }),
    async ({ search, prodi }) => {
      const prodiId = prodi ? parseInt(prodi) : undefined;
      return await mahasiswaController.getAll(search, 1, 50, prodiId);
    },
  );

  const matriksColumns: ExportColumn[] = [
    { header: 'Kode MK', accessor: 'kodeMk' },
    { header: 'Mata Kuliah', accessor: 'namaMk' },
    { header: 'SKS', accessor: 'sks' },
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'A (A/A-/A+)', accessor: 'gradeA' },
    { header: 'B (B/B-/B+)', accessor: 'gradeB' },
    { header: 'C (C/C+)', accessor: 'gradeC' },
    { header: 'D (D/D+)', accessor: 'gradeD' },
    { header: 'E', accessor: 'gradeE' },
    { header: 'Belum Dinilai', accessor: 'gradeNull' },
    { header: 'Total Peserta', accessor: 'totalPeserta' },
    { header: '% Kelulusan', accessor: (r: Record<string, unknown>) => `${r.persenLulus || 0}%` },
  ];

  const prodiColumns: ExportColumn[] = [
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total Mahasiswa', accessor: 'totalMahasiswa' },
    { header: 'Rata-rata IP', accessor: 'rataIP' },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Rekap Nilai</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Rekapitulasi sebaran nilai mata kuliah (A s.d. E) dan evaluasi akademik per semester
            </p>
          </div>
          <Show when={(matriksNilai()?.length || 0) > 0}>
            <ExportButtonGroup
              data={() => (matriksNilai() || []) as unknown as Record<string, unknown>[]}
              columns={matriksColumns}
              filename={`Matriks_Nilai_MK_${selectedPeriode()}`}
              title="Matriks Sebaran Nilai Mata Kuliah (A - E)"
              subtitle={`Periode: ${selectedPeriode()}`}
            />
          </Show>
        </div>

        {/* Filter */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Periode Akademik
            </label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white font-medium"
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
            >
              <option value="">Pilih Periode</option>
              <For each={periodes()?.data || []}>
                {(p) => (
                  <option value={p.id}>
                    {p.nama} {p.aktif ? '(Aktif)' : ''}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Program Studi
            </label>
            <select
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white font-medium"
              value={selectedProdi()}
              onChange={(e) => setSelectedProdi(e.currentTarget.value)}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Cari Mata Kuliah
            </label>
            <input
              type="text"
              placeholder="Kode atau Nama MK..."
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={mkSearch()}
              onInput={(e) => setMkSearch(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Matriks Sebaran Nilai Mata Kuliah (A s.d. E) */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
            <div>
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
                Matriks Sebaran Nilai Mata Kuliah (A s.d. E)
              </h3>
              <p class="text-[10px] text-secondary-400">
                Jumlah mahasiswa yang memperoleh grade nilai A, B, C, D, E pada tiap mata kuliah
              </p>
            </div>
            <span class="text-xs font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-lg">
              {matriksNilai()?.length || 0} Mata Kuliah
            </span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                  <th class="py-3 px-4">Kode MK</th>
                  <th class="py-3 px-4">Mata Kuliah</th>
                  <th class="py-3 px-4 text-center">SKS</th>
                  <th class="py-3 px-4">Program Studi</th>
                  <th class="py-3 px-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 font-bold">
                    A
                  </th>
                  <th class="py-3 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 font-bold">B</th>
                  <th class="py-3 px-3 text-center bg-yellow-50/50 dark:bg-yellow-950/20 text-yellow-700 font-bold">
                    C
                  </th>
                  <th class="py-3 px-3 text-center bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 font-bold">
                    D
                  </th>
                  <th class="py-3 px-3 text-center bg-rose-50/50 dark:bg-rose-950/20 text-rose-700 font-bold">E</th>
                  <th class="py-3 px-3 text-center text-secondary-400">Belum Ada</th>
                  <th class="py-3 px-4 text-center font-bold">Total Peserta</th>
                  <th class="py-3 px-4 text-center font-bold">% Kelulusan</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={matriksNilai() || []}
                  fallback={
                    <tr>
                      <td colspan="12" class="text-center py-8 text-secondary-400">
                        Tidak ada data matriks nilai untuk periode yang dipilih
                      </td>
                    </tr>
                  }
                >
                  {(row) => (
                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                      <td class="py-3 px-4 font-mono font-bold text-secondary-700 dark:text-secondary-300">
                        {row.kodeMk}
                      </td>
                      <td class="py-3 px-4 font-semibold text-secondary-800 dark:text-white">{row.namaMk}</td>
                      <td class="py-3 px-4 text-center">{row.sks}</td>
                      <td class="py-3 px-4 text-secondary-600 dark:text-secondary-300">{row.prodiNama}</td>
                      <td class="py-3 px-3 text-center font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/10">
                        {row.gradeA}
                      </td>
                      <td class="py-3 px-3 text-center font-bold text-blue-600 bg-blue-50/30 dark:bg-blue-950/10">
                        {row.gradeB}
                      </td>
                      <td class="py-3 px-3 text-center font-bold text-amber-600 bg-yellow-50/30 dark:bg-yellow-950/10">
                        {row.gradeC}
                      </td>
                      <td class="py-3 px-3 text-center font-bold text-orange-600 bg-orange-50/30 dark:bg-orange-950/10">
                        {row.gradeD}
                      </td>
                      <td class="py-3 px-3 text-center font-bold text-rose-600 bg-rose-50/30 dark:bg-rose-950/10">
                        {row.gradeE}
                      </td>
                      <td class="py-3 px-3 text-center text-secondary-400">{row.gradeNull}</td>
                      <td class="py-3 px-4 text-center font-bold text-secondary-800 dark:text-white">
                        {row.totalPeserta}
                      </td>
                      <td class="py-3 px-4 text-center">
                        <span
                          class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.persenLulus >= 85
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                              : row.persenLulus >= 70
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                          }`}
                        >
                          {row.persenLulus}%
                        </span>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        {/* Rekap per Prodi */}
        <Show when={rekapProdi()}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Rata-rata IP per Program Studi</h3>
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
                  <For each={rekapProdi()?.prodi || []}>
                    {(p) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{p.prodiNama}</td>
                        <td class="py-3 px-5 text-center text-secondary-600">{p.totalMahasiswa}</td>
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

        {/* Pencarian Individual Mahasiswa */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm">
          <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
            Pencarian Detail Nilai Mahasiswa
          </label>
          <input
            type="text"
            placeholder="Ketik NIM atau Nama Mahasiswa..."
            class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
            value={mhsSearch()}
            onInput={(e) => setMhsSearch(e.currentTarget.value)}
          />
        </div>

        {/* Pencarian Mahasiswa & Detail Nilai */}
        <Show when={mhsSearch()}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">Hasil Pencarian Mahasiswa</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">NIM</th>
                    <th class="py-3 px-5">Nama</th>
                    <th class="py-3 px-5">Status</th>
                    <th class="py-3 px-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={mahasiswas()?.data || []}>
                    {(m) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5 font-mono text-secondary-600">{m.nim}</td>
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{m.nama}</td>
                        <td class="py-3 px-5">
                          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                            {m.status}
                          </span>
                        </td>
                        <td class="py-3 px-5 text-center">
                          <button
                            onClick={() => setSelectedMhsId(selectedMhsId() === m.id ? null : m.id)}
                            class="text-[10px] font-bold text-brand-600 hover:text-brand-700 underline"
                          >
                            {selectedMhsId() === m.id ? 'Tutup' : 'Lihat Nilai'}
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>

        {/* Detail Nilai Mahasiswa Individual */}
        <Show when={rekapNilai()}>
          {(() => {
            const data = rekapNilai()!;
            return (
              <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
                <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
                  <div>
                    <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
                      Detail Nilai: {data.mahasiswa.nama}
                    </h3>
                    <p class="text-[10px] text-secondary-400">
                      {data.mahasiswa.nim} - {data.mahasiswa.prodi}
                    </p>
                  </div>
                  <div class="flex items-center gap-4">
                    <div class="text-right">
                      <p class="text-[10px] text-secondary-400">Total SKS</p>
                      <p class="text-sm font-bold text-secondary-800 dark:text-white">{data.summary.totalSks}</p>
                    </div>
                    <div class="text-right bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800">
                      <p class="text-[10px] text-brand-600 dark:text-brand-400 font-bold">IPK</p>
                      <p class="text-sm font-bold text-brand-700 dark:text-brand-300">{data.summary.ip}</p>
                    </div>
                  </div>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 font-medium border-b border-secondary-100 dark:border-secondary-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th class="py-3 px-5">Kode MK</th>
                        <th class="py-3 px-5">Mata Kuliah</th>
                        <th class="py-3 px-5 text-center">SKS</th>
                        <th class="py-3 px-5 text-center">Nilai Angka</th>
                        <th class="py-3 px-5 text-center">Nilai Huruf</th>
                        <th class="py-3 px-5 text-center">Indeks</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800 text-secondary-600 dark:text-secondary-300">
                      <For each={data.mataKuliah}>
                        {(mk) => (
                          <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                            <td class="py-3 px-5 font-mono text-secondary-500">{mk.kodeMk}</td>
                            <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{mk.namaMk}</td>
                            <td class="py-3 px-5 text-center">{mk.sks}</td>
                            <td class="py-3 px-5 text-center">{mk.nilaiAngka || '-'}</td>
                            <td class="py-3 px-5 text-center font-bold">{mk.nilaiHuruf || '-'}</td>
                            <td class="py-3 px-5 text-center font-bold text-brand-600">{mk.nilaiIndeks || '-'}</td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </Show>
      </div>
    </MainLayout>
  );
}
