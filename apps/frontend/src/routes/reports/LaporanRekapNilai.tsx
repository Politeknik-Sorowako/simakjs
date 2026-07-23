import { createResource, createSignal, For, Show } from 'solid-js';
import { BarChart, StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { khsController } from '../../controllers/khsController';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { ExportColumn } from '../../utils/export';

export default function LaporanRekapNilai() {
  const auth = useAuth();
  const toast = useToast();
  const role = () => auth.user()?.role;

  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal('');
  const [mhsSearch, setMhsSearch] = createSignal('');
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));

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

  const columns: ExportColumn[] = [
    { header: 'Kode MK', accessor: 'kodeMk' },
    { header: 'Mata Kuliah', accessor: 'namaMk' },
    { header: 'SKS', accessor: 'sks' },
    { header: 'Nilai Angka', accessor: 'nilaiAngka' },
    { header: 'Nilai Huruf', accessor: 'nilaiHuruf' },
    { header: 'Bobot', accessor: 'nilaiIndeks' },
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
              Rekapitulasi nilai per semester untuk evaluasi akademik dan penentuan kelulusan
            </p>
          </div>
          <Show when={rekapProdi()}>
            <ExportButtonGroup
              data={() => rekapProdi()?.prodi || []}
              columns={prodiColumns}
              filename={`Rekap_Nilai_${selectedPeriode()}`}
              title="Laporan Rekap Nilai per Program Studi"
              subtitle={`Periode: ${selectedPeriode()}`}
            />
          </Show>
        </div>

        {/* Filter */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
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
          <div class="flex-1">
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Cari Mahasiswa
            </label>
            <input
              type="text"
              placeholder="NIM atau Nama..."
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={mhsSearch()}
              onInput={(e) => setMhsSearch(e.currentTarget.value)}
            />
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
                    {(p: { prodiNama: string; totalMahasiswa: number; rataIP: number }) => (
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
                    {(m: { id: number; nim: string; nama: string; status: string }) => (
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

        {/* Detail Nilai Mahasiswa */}
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
                      <p class="text-sm font-bold text-secondary-800 dark:text-white">{data.totalSks}</p>
                    </div>
                    <div class="text-right bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800">
                      <p class="text-[10px] text-brand-600 dark:text-brand-400 font-bold">IPK</p>
                      <p class="text-sm font-bold text-brand-700 dark:text-brand-300">{data.ipk}</p>
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
                      <For each={data.matakuliah}>
                        {(mk: {
                          kodeMk: string;
                          namaMk: string;
                          sks: number;
                          nilaiAngka?: number;
                          nilaiHuruf?: string;
                          nilaiIndeks?: number;
                        }) => (
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
