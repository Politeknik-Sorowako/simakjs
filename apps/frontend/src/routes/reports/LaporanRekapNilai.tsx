import { createEffect, createResource, createSignal, For, onCleanup, Show, Suspense } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { khsController } from '../../controllers/khsController';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { prodiController } from '../../controllers/prodiController';
import { ExportColumn } from '../../utils/export';

function TableLoadingFallback() {
  return (
    <div class="w-full overflow-hidden rounded-2xl border border-secondary-200/80 dark:border-secondary-800 bg-white dark:bg-secondary-900 shadow-card dark:shadow-card-dark transition-colors duration-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-base">
          <tbody class="divide-y divide-secondary-200/50 dark:divide-secondary-800/60">
            <For each={Array.from({ length: 5 })}>
              {() => (
                <tr>
                  <td class="px-6 py-4">
                    <div class="h-4 w-3/4 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
                  </td>
                  <td class="px-6 py-4">
                    <div class="h-4 w-1/2 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
                  </td>
                  <td class="px-6 py-4">
                    <div class="h-4 w-2/3 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function LaporanRekapNilai() {
  const auth = useAuth();
  const toast = useToast();

  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(20);
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal('');
  const [mkSearch, setMkSearch] = createSignal('');
  const [debouncedMkSearch, setDebouncedMkSearch] = createSignal('');
  const [mhsSearch, setMhsSearch] = createSignal('');
  const [debouncedMhsSearch, setDebouncedMhsSearch] = createSignal('');
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  let mkSearchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  let mhsSearchDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    clearTimeout(mkSearchDebounceTimer);
    clearTimeout(mhsSearchDebounceTimer);
  });

  const handleMkSearchChange = (value: string) => {
    setMkSearch(value);
    clearTimeout(mkSearchDebounceTimer);
    mkSearchDebounceTimer = setTimeout(() => setDebouncedMkSearch(value), 350);
  };

  const handleMhsSearchChange = (value: string) => {
    setMhsSearch(value);
    clearTimeout(mhsSearchDebounceTimer);
    mhsSearchDebounceTimer = setTimeout(() => setDebouncedMhsSearch(value), 350);
  };

  const [selectedMkDetail, setSelectedMkDetail] = createSignal<{
    mataKuliahId: number;
    kodeMk: string;
    namaMk: string;
  } | null>(null);
  const [detailData] = createResource(
    () => ({ mkId: selectedMkDetail()?.mataKuliahId, periodeId: selectedPeriode() }),
    async ({ mkId, periodeId }) => {
      if (!mkId) return null;
      try {
        return await khsController.getDetailNilaiMK(mkId, periodeId || undefined);
      } catch {
        return null;
      }
    },
  );

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
    () => ({
      periodeId: selectedPeriode(),
      prodiId: selectedProdi(),
      search: debouncedMkSearch(),
      page: page(),
      limit: limit(),
    }),
    async ({ periodeId, prodiId, search, page, limit }) => {
      try {
        const pId = prodiId ? parseInt(prodiId) : undefined;
        const res = await khsController.getMatriksNilaiMK(
          periodeId || undefined,
          pId,
          search || undefined,
          page,
          limit,
        );
        if (Array.isArray(res)) {
          return { data: res, pagination: { total: res.length, page: 1, limit: res.length, totalPages: 1 } };
        }
        return res;
      } catch {
        return { data: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } };
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
    () => ({ search: debouncedMhsSearch(), prodi: selectedProdi() }),
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
            <h1 class="page-title">Laporan Rekap Nilai</h1>
            <p class="text-base text-secondary-500 dark:text-secondary-200">
              Rekapitulasi sebaran nilai mata kuliah (A s.d. E) dan evaluasi akademik per semester
            </p>
          </div>
          <Suspense fallback={null}>
            <Show when={(matriksNilai()?.data?.length || 0) > 0}>
              <ExportButtonGroup
                data={() => (matriksNilai()?.data || []) as unknown as Record<string, unknown>[]}
                columns={matriksColumns}
                filename={`Matriks_Nilai_MK_${selectedPeriode()}`}
                title="Matriks Sebaran Nilai Mata Kuliah (A - E)"
                subtitle={`Periode: ${selectedPeriode()}`}
              />
            </Show>
          </Suspense>
        </div>

        {/* Filter */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-caption font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-1">
              Periode Akademik
            </label>
            <select
              class="w-full px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white font-medium"
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
            <label class="block text-caption font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-1">
              Program Studi
            </label>
            <select
              class="w-full px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white font-medium"
              value={selectedProdi()}
              onChange={(e) => setSelectedProdi(e.currentTarget.value)}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
          <div>
            <label class="block text-caption font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-1">
              Cari Mata Kuliah
            </label>
            <input
              type="text"
              placeholder="Kode atau Nama MK..."
              class="w-full px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={mkSearch()}
              onInput={(e) => handleMkSearchChange(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Matriks Sebaran Nilai Mata Kuliah (A s.d. E) */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">
                Matriks Sebaran Nilai Mata Kuliah (A s.d. E)
              </h3>
              <p class="text-caption text-secondary-400 dark:text-secondary-300">
                Jumlah mahasiswa yang memperoleh grade nilai A, B, C, D, E pada tiap mata kuliah
              </p>
            </div>
            <div class="flex items-center gap-2">
              <select
                class="px-3 py-1.5 text-caption border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white font-medium"
                value={limit()}
                onChange={(e) => {
                  setLimit(Number(e.currentTarget.value));
                  setPage(1);
                }}
              >
                <option value={10}>10 Data / Hal</option>
                <option value={20}>20 Data / Hal</option>
                <option value={50}>50 Data / Hal</option>
                <option value={100}>100 Data / Hal</option>
              </select>
              <Suspense
                fallback={
                  <span class="text-caption font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-lg">
                    … Mata Kuliah
                  </span>
                }
              >
                <span class="text-caption font-bold text-brand-600 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-lg">
                  {matriksNilai()?.pagination?.total || 0} Mata Kuliah
                </span>
              </Suspense>
            </div>
          </div>

          <Suspense fallback={<TableLoadingFallback />}>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
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
                    <th class="py-3 px-3 text-center text-secondary-400 dark:text-secondary-300">Belum Ada</th>
                    <th class="py-3 px-4 text-center font-bold">Total Peserta</th>
                    <th class="py-3 px-4 text-center font-bold">% Kelulusan</th>
                    <th class="py-3 px-4 text-center font-bold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={matriksNilai()?.data || []}
                    fallback={
                      <tr>
                        <td colspan="13" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
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
                        <td class="py-3 px-3 text-center text-secondary-400 dark:text-secondary-300">
                          {row.gradeNull}
                        </td>
                        <td class="py-3 px-4 text-center font-bold text-secondary-800 dark:text-white">
                          {row.totalPeserta}
                        </td>
                        <td class="py-3 px-4 text-center">
                          <span
                            class={`px-2 py-0.5 rounded-full text-caption font-bold ${
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
                        <td class="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              setSelectedMkDetail({
                                mataKuliahId: row.mataKuliahId,
                                kodeMk: row.kodeMk,
                                namaMk: row.namaMk,
                              })
                            }
                            class="px-2.5 py-1 text-caption font-bold bg-brand-50 text-brand-700 hover:bg-brand-100 rounded-lg dark:bg-brand-900/40 dark:text-brand-300"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <Show when={matriksNilai()?.pagination && (matriksNilai()?.pagination.totalPages || 0) > 1}>
              <div class="px-5 py-3 border-t border-secondary-100 dark:border-secondary-800 flex justify-between items-center text-caption">
                <span class="text-secondary-500 dark:text-secondary-300">
                  Halaman {matriksNilai()?.pagination.page} dari {matriksNilai()?.pagination.totalPages}
                </span>
                <div class="flex gap-2">
                  <button
                    disabled={page() <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    class="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 rounded disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <button
                    disabled={page() >= (matriksNilai()?.pagination.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                    class="px-3 py-1 bg-secondary-100 dark:bg-secondary-800 rounded disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            </Show>
          </Suspense>
        </div>

        {/* Rekap per Prodi */}
        <Show when={rekapProdi()}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">Rata-rata IP per Program Studi</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
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
          <label class="block text-caption font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-1">
            Pencarian Detail Nilai Mahasiswa
          </label>
          <input
            type="text"
            placeholder="Ketik NIM atau Nama Mahasiswa..."
            class="w-full px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
            value={mhsSearch()}
            onInput={(e) => handleMhsSearchChange(e.currentTarget.value)}
          />
        </div>

        {/* Pencarian Mahasiswa & Detail Nilai */}
        <Show when={mhsSearch()}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">Hasil Pencarian Mahasiswa</h3>
            </div>
            <Suspense fallback={<TableLoadingFallback />}>
              <div class="overflow-x-auto">
                <table class="w-full text-left text-table border-collapse">
                  <thead>
                    <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
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
                            <span class="px-2 py-0.5 rounded-full text-caption font-bold bg-green-50 text-green-700">
                              {m.status}
                            </span>
                          </td>
                          <td class="py-3 px-5 text-center">
                            <button
                              onClick={() => setSelectedMhsId(selectedMhsId() === m.id ? null : m.id)}
                              class="text-caption font-bold text-brand-600 hover:text-brand-700 underline"
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
            </Suspense>
          </div>
        </Show>

        {/* Detail Nilai Mahasiswa Individual */}
        <Suspense fallback={<TableLoadingFallback />}>
          <Show when={rekapNilai()}>
            {(() => {
              const data = rekapNilai()!;
              return (
                <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
                  <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
                    <div>
                      <h3 class="text-base font-bold text-secondary-800 dark:text-white">
                        Detail Nilai: {data.mahasiswa.nama}
                      </h3>
                      <p class="text-caption text-secondary-400 dark:text-secondary-300">
                        {data.mahasiswa.nim} - {data.mahasiswa.prodi}
                      </p>
                    </div>
                    <div class="flex items-center gap-4">
                      <div class="text-right">
                        <p class="text-caption text-secondary-400 dark:text-secondary-300">Total SKS</p>
                        <p class="text-base font-bold text-secondary-800 dark:text-white">{data.summary.totalSks}</p>
                      </div>
                      <div class="text-right bg-brand-50 dark:bg-brand-900/30 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800">
                        <p class="text-caption text-brand-600 dark:text-brand-400 font-bold">IPK</p>
                        <p class="text-base font-bold text-brand-700 dark:text-brand-300">{data.summary.ip}</p>
                      </div>
                    </div>
                  </div>

                  <div class="overflow-x-auto">
                    <table class="w-full text-left text-table">
                      <thead class="bg-secondary-50 dark:bg-secondary-800/50 text-secondary-500 font-medium border-b border-secondary-100 dark:border-secondary-800 uppercase tracking-wider text-caption">
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
                              <td class="py-3 px-5 font-mono text-secondary-500 dark:text-secondary-300">
                                {mk.kodeMk}
                              </td>
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
        </Suspense>
        {/* Modal Detail Nilai Mata Kuliah & Cetak */}
        <Show when={selectedMkDetail()}>
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl">
              <div class="flex justify-between items-start border-b border-secondary-100 dark:border-secondary-800 pb-4">
                <div>
                  <h2 class="text-lg font-bold text-secondary-800 dark:text-white">
                    Detail Nilai & BAP: {selectedMkDetail()?.namaMk}
                  </h2>
                  <p class="text-caption text-secondary-500 dark:text-secondary-300 font-mono">
                    Kode: {selectedMkDetail()?.kodeMk} | Periode: {selectedPeriode() || 'Aktif'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMkDetail(null)}
                  class="text-secondary-400 hover:text-secondary-600 dark:hover:text-white text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <Suspense
                fallback={
                  <div class="py-8 text-center text-caption text-secondary-400 dark:text-secondary-300">
                    Memuat detail nilai...
                  </div>
                }
              >
                <Show
                  when={detailData()}
                  fallback={
                    <div class="py-8 text-center text-caption text-secondary-400 dark:text-secondary-300">
                      Memuat detail nilai...
                    </div>
                  }
                >
                  {(() => {
                    const d = detailData()!;
                    return (
                      <div class="space-y-6">
                        <div class="flex flex-wrap gap-3 justify-end border-b border-secondary-100 dark:border-secondary-800 pb-4">
                          <button
                            onClick={() => {
                              const printWin = window.open('', '_blank');
                              if (!printWin) return;
                              const html = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Daftar Nilai - ${d.mataKuliah.nama}</title>
                                <style>
                                  body { font-family: sans-serif; padding: 20px; color: #333; }
                                  h2 { text-align: center; margin-bottom: 5px; }
                                  p { text-align: center; margin-top: 0; font-size: 13px; color: #555; }
                                  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                  th { background-color: #f4f4f4; text-align: center; }
                                  .center { text-align: center; }
                                  .ttd { margin-top: 40px; float: right; width: 250px; text-align: center; font-size: 12px; }
                                </style>
                              </head>
                              <body>
                                <h2>DAFTAR NILAI KULIAH</h2>
                                <p><strong>${d.mataKuliah.nama}</strong> (${d.mataKuliah.kode}) - ${d.mataKuliah.sksTotal} SKS<br>Program Studi: ${d.mataKuliah.prodiNama} | Periode: ${selectedPeriode()}</p>
                                <table>
                                  <thead>
                                    <tr>
                                      <th width="5%">No</th>
                                      <th width="20%">NIM</th>
                                      <th>Nama Mahasiswa</th>
                                      <th width="15%">Nilai Angka</th>
                                      <th width="15%">Nilai Huruf</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${(d.peserta || [])
                                      .map(
                                        (p, idx) => `
                                      <tr>
                                        <td class="center">${idx + 1}</td>
                                        <td class="center">${p.nim}</td>
                                        <td>${p.nama}</td>
                                        <td class="center">${p.nilaiAngka || '-'}</td>
                                        <td class="center"><strong>${p.nilaiHuruf || '-'}</strong></td>
                                      </tr>
                                    `,
                                      )
                                      .join('')}
                                  </tbody>
                                </table>
                                <div class="ttd">
                                  <p>Dosen Pengampu,<br><br><br><br><strong>${(d.dosenPengampu || []).join(', ') || '(...........................)'}</strong></p>
                                </div>
                                <script>window.onload = () => { window.print(); };</script>
                              </body>
                              </html>
                            `;
                              printWin.document.write(html);
                              printWin.document.close();
                            }}
                            class="px-4 py-2 text-caption font-bold bg-brand-600 text-white hover:bg-brand-700 rounded-lg shadow-sm"
                          >
                            🖨️ Cetak Daftar Nilai
                          </button>
                          <button
                            onClick={() => {
                              const printWin = window.open('', '_blank');
                              if (!printWin) return;
                              const html = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>BAP Perkuliahan - ${d.mataKuliah.nama}</title>
                                <style>
                                  body { font-family: sans-serif; padding: 20px; color: #333; }
                                  h2 { text-align: center; margin-bottom: 5px; }
                                  p { text-align: center; margin-top: 0; font-size: 13px; color: #555; }
                                  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                  th { background-color: #f4f4f4; text-align: center; }
                                  .center { text-align: center; }
                                </style>
                              </head>
                              <body>
                                <h2>BERITA ACARA PERKULIAHAN (BAP)</h2>
                                <p><strong>${d.mataKuliah.nama}</strong> (${d.mataKuliah.kode})<br>Dosen: ${(d.dosenPengampu || []).join(', ') || '-'}</p>
                                <table>
                                  <thead>
                                    <tr>
                                      <th width="8%">Pertemuan</th>
                                      <th width="15%">Tanggal</th>
                                      <th>Materi / Pokok Bahasan</th>
                                      <th width="15%">Durasi (Menit)</th>
                                      <th width="20%">Dosen Pengajar</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${(d.bapList || [])
                                      .map(
                                        (b) => `
                                      <tr>
                                        <td class="center">${b.pertemuanKe}</td>
                                        <td class="center">${new Date(b.tanggal).toLocaleDateString('id-ID')}</td>
                                        <td>${b.materi}</td>
                                        <td class="center">${b.durasiMenit}</td>
                                        <td>${b.dosenNama}</td>
                                      </tr>
                                    `,
                                      )
                                      .join('')}
                                  </tbody>
                                </table>
                                <script>window.onload = () => { window.print(); };</script>
                              </body>
                              </html>
                            `;
                              printWin.document.write(html);
                              printWin.document.close();
                            }}
                            class="px-4 py-2 text-caption font-bold bg-secondary-700 text-white hover:bg-secondary-800 rounded-lg shadow-sm"
                          >
                            📄 Lihat & Cetak BAP Perkuliahan
                          </button>
                        </div>

                        <div class="space-y-3">
                          <h4 class="text-caption font-bold uppercase text-secondary-500 dark:text-secondary-300 tracking-wider">
                            Daftar Nilai Peserta Kelas
                          </h4>
                          <div class="max-h-60 overflow-y-auto border border-secondary-100 dark:border-secondary-800 rounded-lg">
                            <table class="w-full text-left text-table">
                              <thead class="bg-secondary-50 dark:bg-secondary-800 text-secondary-500 font-semibold sticky top-0">
                                <tr>
                                  <th class="py-2 px-3">NIM</th>
                                  <th class="py-2 px-3">Nama Mahasiswa</th>
                                  <th class="py-2 px-3 text-center">Nilai Angka</th>
                                  <th class="py-2 px-3 text-center">Nilai Huruf</th>
                                </tr>
                              </thead>
                              <tbody>
                                <For each={d.peserta || []}>
                                  {(p) => (
                                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                                      <td class="py-2 px-3 font-mono">{p.nim}</td>
                                      <td class="py-2 px-3 font-medium text-secondary-800 dark:text-white">{p.nama}</td>
                                      <td class="py-2 px-3 text-center">{p.nilaiAngka || '-'}</td>
                                      <td class="py-2 px-3 text-center font-bold">{p.nilaiHuruf || '-'}</td>
                                    </tr>
                                  )}
                                </For>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div class="space-y-3">
                          <h4 class="text-caption font-bold uppercase text-secondary-500 dark:text-secondary-300 tracking-wider">
                            BAP Jurnal Perkuliahan (${d.bapList?.length || 0} Pertemuan)
                          </h4>
                          <div class="max-h-48 overflow-y-auto border border-secondary-100 dark:border-secondary-800 rounded-lg">
                            <table class="w-full text-left text-table">
                              <thead class="bg-secondary-50 dark:bg-secondary-800 text-secondary-500 font-semibold sticky top-0">
                                <tr>
                                  <th class="py-2 px-3 text-center">P.Ke</th>
                                  <th class="py-2 px-3">Tanggal</th>
                                  <th class="py-2 px-3">Materi</th>
                                  <th class="py-2 px-3">Dosen</th>
                                </tr>
                              </thead>
                              <tbody>
                                <For each={d.bapList || []}>
                                  {(b) => (
                                    <tr class="border-b border-secondary-50 hover:bg-secondary-50/50 dark:hover:bg-secondary-800/30">
                                      <td class="py-2 px-3 text-center font-bold">{b.pertemuanKe}</td>
                                      <td class="py-2 px-3">{new Date(b.tanggal).toLocaleDateString('id-ID')}</td>
                                      <td class="py-2 px-3">{b.materi}</td>
                                      <td class="py-2 px-3">{b.dosenNama}</td>
                                    </tr>
                                  )}
                                </For>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </Show>
              </Suspense>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
