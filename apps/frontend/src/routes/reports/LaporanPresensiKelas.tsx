import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { presensiController, RekapKelasListItem, RekapMahasiswaListItem } from '../../controllers/presensiController';
import { prodiController } from '../../controllers/prodiController';
import { ExportColumn } from '../../utils/export';

export default function LaporanPresensiKelas() {
  const [activeTab, setActiveTab] = createSignal<'kelas' | 'mahasiswa'>('kelas');
  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedProdi, setSelectedProdi] = createSignal('');
  const [search, setSearch] = createSignal('');

  // Sorting signals (default: rataPersentaseHadir desc)
  const [sortField, setSortField] = createSignal<string>('rataPersentaseHadir');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  // Detail Modal signals
  const [detailKelasId, setDetailKelasId] = createSignal<number | null>(null);
  const [detailMahasiswaId, setDetailMahasiswaId] = createSignal<number | null>(null);

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

  // Resources for list data
  const [rekapKelasData] = createResource(
    () => ({ periodeId: selectedPeriode(), prodiId: selectedProdi(), search: search() }),
    async ({ periodeId, prodiId, search }) => {
      try {
        const pId = prodiId ? parseInt(prodiId) : undefined;
        return await presensiController.getRekapKelasList(periodeId || undefined, pId, search || undefined);
      } catch {
        return [];
      }
    },
  );

  const [rekapMahasiswaData] = createResource(
    () => ({ periodeId: selectedPeriode(), prodiId: selectedProdi(), search: search() }),
    async ({ periodeId, prodiId, search }) => {
      try {
        const pId = prodiId ? parseInt(prodiId) : undefined;
        return await presensiController.getRekapMahasiswaList(periodeId || undefined, pId, search || undefined);
      } catch {
        return [];
      }
    },
  );

  // Detail resources
  const [kelasDetailData] = createResource(
    () => detailKelasId(),
    async (kelasId) => {
      if (!kelasId) return null;
      try {
        return await presensiController.getRekapKehadiran(kelasId);
      } catch {
        return null;
      }
    },
  );

  const [mahasiswaDetailData] = createResource(
    () => ({ mhsId: detailMahasiswaId(), periodeId: selectedPeriode() }),
    async ({ mhsId, periodeId }) => {
      if (!mhsId) return null;
      try {
        return await presensiController.getRekapKehadiranMahasiswa(mhsId, periodeId || undefined);
      } catch {
        return null;
      }
    },
  );

  // Sorted data memos
  const sortedKelasList = createMemo(() => {
    const data = [...(rekapKelasData() || [])];
    const field = sortField();
    const order = sortOrder();

    return data.sort((a, b) => {
      const valA = (a as unknown as Record<string, unknown>)[field];
      const valB = (b as unknown as Record<string, unknown>)[field];
      if (valA === valB) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  });

  const sortedMahasiswaList = createMemo(() => {
    const data = [...(rekapMahasiswaData() || [])];
    const field = sortField();
    const order = sortOrder();

    return data.sort((a, b) => {
      const valA = (a as unknown as Record<string, unknown>)[field];
      const valB = (b as unknown as Record<string, unknown>)[field];
      if (valA === valB) return 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA;
      }
      const strA = String(valA || '').toLowerCase();
      const strB = String(valB || '').toLowerCase();
      return order === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  });

  const handleSort = (field: string) => {
    if (sortField() === field) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const kelasColumns: ExportColumn[] = [
    { header: 'Kode MK', accessor: 'kodeMk' },
    { header: 'Mata Kuliah', accessor: 'namaMk' },
    { header: 'Kelas', accessor: 'namaKelas' },
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Dosen Pengajar', accessor: 'dosenPengajar' },
    { header: 'Total Mahasiswa', accessor: 'totalMahasiswa' },
    { header: 'Total Pertemuan', accessor: 'totalPertemuan' },
    { header: '% Kehadiran Rata-rata', accessor: (r: Record<string, unknown>) => `${r.rataPersentaseHadir || 0}%` },
  ];

  const mhsColumns: ExportColumn[] = [
    { header: 'NIM', accessor: 'nim' },
    { header: 'Nama Mahasiswa', accessor: 'nama' },
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total Kelas Diikuti', accessor: 'totalKelas' },
    { header: '% Kehadiran Rata-rata', accessor: (r: Record<string, unknown>) => `${r.rataPersentaseHadir || 0}%` },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Rekapitulasi Presensi</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Pemantauan persentase kehadiran perkuliahan per kelas dan per mahasiswa
            </p>
          </div>

          <Show when={activeTab() === 'kelas'}>
            <ExportButtonGroup
              data={() => sortedKelasList() as unknown as Record<string, unknown>[]}
              columns={kelasColumns}
              filename={`Rekap_Presensi_Kelas_${selectedPeriode()}`}
              title="Laporan Rekapitulasi Kehadiran per Kelas"
              subtitle={`Periode: ${selectedPeriode()}`}
            />
          </Show>
          <Show when={activeTab() === 'mahasiswa'}>
            <ExportButtonGroup
              data={() => sortedMahasiswaList() as unknown as Record<string, unknown>[]}
              columns={mhsColumns}
              filename={`Rekap_Presensi_Mahasiswa_${selectedPeriode()}`}
              title="Laporan Rekapitulasi Kehadiran per Mahasiswa"
              subtitle={`Periode: ${selectedPeriode()}`}
            />
          </Show>
        </div>

        {/* Tab Navigation */}
        <div class="flex border-b border-secondary-200 dark:border-secondary-800 text-sm font-semibold">
          <button
            onClick={() => {
              setActiveTab('kelas');
              setSortField('rataPersentaseHadir');
              setSortOrder('desc');
            }}
            class={`py-3 px-6 border-b-2 transition-colors duration-150 flex items-center gap-2 ${
              activeTab() === 'kelas'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-800 dark:hover:text-white'
            }`}
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0a2 2 0 012-2v-5a2 2 0 012-2h2a2 2 0 012 2v5a2 2 0 012 2m-6 0h6"
              />
            </svg>
            Rekap per Kelas Kuliah
          </button>
          <button
            onClick={() => {
              setActiveTab('mahasiswa');
              setSortField('rataPersentaseHadir');
              setSortOrder('desc');
            }}
            class={`py-3 px-6 border-b-2 transition-colors duration-150 flex items-center gap-2 ${
              activeTab() === 'mahasiswa'
                ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-secondary-500 hover:text-secondary-800 dark:hover:text-white'
            }`}
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            Rekap per Mahasiswa
          </button>
        </div>

        {/* Filters */}
        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-semibold text-secondary-500 uppercase tracking-wider mb-1">
              Periode Semester
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
              {activeTab() === 'kelas' ? 'Cari Kelas / MK' : 'Cari Mahasiswa (NIM/Nama)'}
            </label>
            <input
              type="text"
              placeholder={activeTab() === 'kelas' ? 'Kode MK, Nama MK, Kelas...' : 'NIM atau Nama...'}
              class="w-full px-3 py-2 text-sm bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </div>
        </div>

        {/* Tab 1 Content: Rekap per Kelas */}
        <Show when={activeTab() === 'kelas'}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
                Daftar Persentase Kehadiran per Kelas Kuliah
              </h3>
              <span class="text-xs text-secondary-400">Default urutan: % Kehadiran tertinggi</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800 select-none">
                    <th class="py-3 px-4 cursor-pointer hover:text-brand-600" onClick={() => handleSort('kodeMk')}>
                      Kode MK {sortField() === 'kodeMk' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="py-3 px-4 cursor-pointer hover:text-brand-600" onClick={() => handleSort('namaMk')}>
                      Mata Kuliah / Kelas {sortField() === 'namaMk' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="py-3 px-4">Program Studi</th>
                    <th class="py-3 px-4">Dosen Pengajar</th>
                    <th
                      class="py-3 px-4 text-center cursor-pointer hover:text-brand-600"
                      onClick={() => handleSort('totalMahasiswa')}
                    >
                      Mhs {sortField() === 'totalMahasiswa' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      class="py-3 px-4 text-center cursor-pointer hover:text-brand-600"
                      onClick={() => handleSort('totalPertemuan')}
                    >
                      Sesi BAP {sortField() === 'totalPertemuan' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      class="py-3 px-4 text-center cursor-pointer hover:text-brand-600"
                      onClick={() => handleSort('rataPersentaseHadir')}
                    >
                      % Kehadiran Rata-rata{' '}
                      {sortField() === 'rataPersentaseHadir' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={sortedKelasList()}
                    fallback={
                      <tr>
                        <td colspan="8" class="text-center py-8 text-secondary-400">
                          Belum ada data kelas pada periode ini
                        </td>
                      </tr>
                    }
                  >
                    {(row: RekapKelasListItem) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-secondary-700 dark:text-secondary-300">
                          {row.kodeMk}
                        </td>
                        <td class="py-3 px-4">
                          <div class="font-semibold text-secondary-800 dark:text-white">{row.namaMk}</div>
                          <div class="text-[10px] text-brand-600 font-bold">Kelas: {row.namaKelas}</div>
                        </td>
                        <td class="py-3 px-4 text-secondary-600 dark:text-secondary-300">{row.prodiNama}</td>
                        <td class="py-3 px-4 text-secondary-600 dark:text-secondary-300">{row.dosenPengajar}</td>
                        <td class="py-3 px-4 text-center font-bold">{row.totalMahasiswa}</td>
                        <td class="py-3 px-4 text-center">{row.totalPertemuan}</td>
                        <td class="py-3 px-4 text-center">
                          <span
                            class={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              row.rataPersentaseHadir >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                                : row.rataPersentaseHadir >= 60
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {row.rataPersentaseHadir}%
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <button
                            onClick={() => setDetailKelasId(row.kelasKuliahId)}
                            class="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold rounded-lg dark:bg-brand-900/40 dark:text-brand-300 transition-colors"
                          >
                            Lihat Detail Mhs
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

        {/* Tab 2 Content: Rekap per Mahasiswa */}
        <Show when={activeTab() === 'mahasiswa'}>
          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center">
              <h3 class="text-sm font-bold text-secondary-800 dark:text-white">
                Daftar Persentase Kehadiran per Mahasiswa
              </h3>
              <span class="text-xs text-secondary-400">Default urutan: % Kehadiran tertinggi</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-[10px] font-semibold bg-secondary-50/50 dark:bg-secondary-800 select-none">
                    <th class="py-3 px-4 cursor-pointer hover:text-brand-600" onClick={() => handleSort('nim')}>
                      NIM {sortField() === 'nim' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="py-3 px-4 cursor-pointer hover:text-brand-600" onClick={() => handleSort('nama')}>
                      Mahasiswa {sortField() === 'nama' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="py-3 px-4">Program Studi</th>
                    <th
                      class="py-3 px-4 text-center cursor-pointer hover:text-brand-600"
                      onClick={() => handleSort('totalKelas')}
                    >
                      Total Kelas {sortField() === 'totalKelas' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th
                      class="py-3 px-4 text-center cursor-pointer hover:text-brand-600"
                      onClick={() => handleSort('rataPersentaseHadir')}
                    >
                      % Kehadiran Rata-rata{' '}
                      {sortField() === 'rataPersentaseHadir' ? (sortOrder() === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th class="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={sortedMahasiswaList()}
                    fallback={
                      <tr>
                        <td colspan="6" class="text-center py-8 text-secondary-400">
                          Belum ada data mahasiswa pada periode ini
                        </td>
                      </tr>
                    }
                  >
                    {(row: RekapMahasiswaListItem) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30 transition-colors">
                        <td class="py-3 px-4 font-mono font-bold text-secondary-700 dark:text-secondary-300">
                          {row.nim}
                        </td>
                        <td class="py-3 px-4 font-semibold text-secondary-800 dark:text-white">{row.nama}</td>
                        <td class="py-3 px-4 text-secondary-600 dark:text-secondary-300">{row.prodiNama}</td>
                        <td class="py-3 px-4 text-center font-bold">{row.totalKelas}</td>
                        <td class="py-3 px-4 text-center">
                          <span
                            class={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              row.rataPersentaseHadir >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300'
                                : row.rataPersentaseHadir >= 60
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            {row.rataPersentaseHadir}%
                          </span>
                        </td>
                        <td class="py-3 px-4 text-center">
                          <button
                            onClick={() => setDetailMahasiswaId(row.mahasiswaId)}
                            class="px-3 py-1 bg-brand-50 hover:bg-brand-100 text-brand-700 text-[11px] font-bold rounded-lg dark:bg-brand-900/40 dark:text-brand-300 transition-colors"
                          >
                            Lihat Detail Kelas
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

        {/* Modal Detail Presensi per Kelas */}
        <Show when={detailKelasId()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
              <div class="px-6 py-4 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center bg-secondary-50/50 dark:bg-secondary-800/50">
                <div>
                  <h3 class="text-base font-bold text-secondary-800 dark:text-white">Detail Kehadiran Mahasiswa</h3>
                  <p class="text-xs text-secondary-500 dark:text-secondary-300">
                    {kelasDetailData()?.kelas?.mataKuliah?.nama || ''} ({kelasDetailData()?.kelas?.namaKelas || ''})
                  </p>
                </div>
                <button
                  onClick={() => setDetailKelasId(null)}
                  class="text-secondary-400 hover:text-secondary-600 dark:hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <div class="p-6 overflow-y-auto space-y-4">
                <Show when={kelasDetailData()} fallback={<div class="py-8 text-center text-xs">Memuat detail...</div>}>
                  {(() => {
                    const data = kelasDetailData()!;
                    return (
                      <div class="space-y-4">
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-secondary-50 dark:bg-secondary-800 p-3.5 rounded-xl">
                          <div>
                            <span class="text-secondary-400">Total Pertemuan:</span>{' '}
                            <strong class="text-secondary-800 dark:text-white">{data.totalPertemuan}</strong>
                          </div>
                          <div>
                            <span class="text-secondary-400">Total Mahasiswa:</span>{' '}
                            <strong class="text-secondary-800 dark:text-white">{data.mahasiswa.length}</strong>
                          </div>
                        </div>

                        <div class="overflow-x-auto">
                          <table class="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr class="border-b border-secondary-100 text-secondary-400 uppercase text-[10px] font-semibold">
                                <th class="py-2 px-3">NIM</th>
                                <th class="py-2 px-3">Nama Mahasiswa</th>
                                <th class="py-2 px-3 text-center text-green-600">Hadir</th>
                                <th class="py-2 px-3 text-center">Sakit</th>
                                <th class="py-2 px-3 text-center">Izin</th>
                                <th class="py-2 px-3 text-center text-rose-600">Alpa</th>
                                <th class="py-2 px-3 text-center">Telat</th>
                                <th class="py-2 px-3 text-center font-bold">% Hadir</th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={data.mahasiswa}>
                                {(m) => (
                                  <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                                    <td class="py-2 px-3 font-mono text-secondary-500">{m.nim}</td>
                                    <td class="py-2 px-3 font-semibold text-secondary-800 dark:text-white">{m.nama}</td>
                                    <td class="py-2 px-3 text-center font-bold text-green-600">{m.hadir}</td>
                                    <td class="py-2 px-3 text-center">{m.sakit}</td>
                                    <td class="py-2 px-3 text-center">{m.izin}</td>
                                    <td class="py-2 px-3 text-center font-bold text-rose-600">{m.alpa}</td>
                                    <td class="py-2 px-3 text-center">{m.telat}</td>
                                    <td class="py-2 px-3 text-center font-bold text-brand-600">{m.persentaseHadir}%</td>
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

              <div class="px-6 py-3 border-t border-secondary-100 dark:border-secondary-800 flex justify-end">
                <button
                  onClick={() => setDetailKelasId(null)}
                  class="px-4 py-1.5 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 text-xs font-bold rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Show>

        {/* Modal Detail Presensi per Mahasiswa */}
        <Show when={detailMahasiswaId()}>
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary-900/60 backdrop-blur-sm">
            <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
              <div class="px-6 py-4 border-b border-secondary-100 dark:border-secondary-800 flex justify-between items-center bg-secondary-50/50 dark:bg-secondary-800/50">
                <div>
                  <h3 class="text-base font-bold text-secondary-800 dark:text-white">
                    Detail Kehadiran Per Kelas Perkuliahan
                  </h3>
                  <p class="text-xs text-secondary-500 dark:text-secondary-300">
                    {mahasiswaDetailData()?.mahasiswa?.nama} ({mahasiswaDetailData()?.mahasiswa?.nim})
                  </p>
                </div>
                <button
                  onClick={() => setDetailMahasiswaId(null)}
                  class="text-secondary-400 hover:text-secondary-600 dark:hover:text-white p-1"
                >
                  ✕
                </button>
              </div>

              <div class="p-6 overflow-y-auto space-y-4">
                <Show
                  when={mahasiswaDetailData()}
                  fallback={<div class="py-8 text-center text-xs">Memuat detail...</div>}
                >
                  {(() => {
                    const data = mahasiswaDetailData()!;
                    return (
                      <div class="space-y-4">
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-secondary-50 dark:bg-secondary-800 p-3.5 rounded-xl">
                          <div>
                            <span class="text-secondary-400">Total Kelas Diikuti:</span>{' '}
                            <strong class="text-secondary-800 dark:text-white">{data.summary.totalKelas}</strong>
                          </div>
                          <div>
                            <span class="text-secondary-400">Rata-rata % Kehadiran:</span>{' '}
                            <strong class="text-brand-600 font-bold">{data.summary.rataPersentaseHadir}%</strong>
                          </div>
                        </div>

                        <div class="overflow-x-auto">
                          <table class="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr class="border-b border-secondary-100 text-secondary-400 uppercase text-[10px] font-semibold">
                                <th class="py-2 px-3">Mata Kuliah / Kelas</th>
                                <th class="py-2 px-3 text-center">Total Sesi</th>
                                <th class="py-2 px-3 text-center text-green-600">Hadir</th>
                                <th class="py-2 px-3 text-center">Sakit</th>
                                <th class="py-2 px-3 text-center">Izin</th>
                                <th class="py-2 px-3 text-center text-rose-600">Alpa</th>
                                <th class="py-2 px-3 text-center">Telat</th>
                                <th class="py-2 px-3 text-center font-bold">% Hadir</th>
                              </tr>
                            </thead>
                            <tbody>
                              <For each={data.detail || []}>
                                {(k) => (
                                  <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                                    <td class="py-2 px-3 font-semibold text-secondary-800 dark:text-white">
                                      {k.kodeMk} - {k.namaMk} ({k.namaKelas})
                                    </td>
                                    <td class="py-2 px-3 text-center font-bold">{k.totalPertemuan}</td>
                                    <td class="py-2 px-3 text-center font-bold text-green-600">{k.hadir}</td>
                                    <td class="py-2 px-3 text-center">{k.sakit}</td>
                                    <td class="py-2 px-3 text-center">{k.izin}</td>
                                    <td class="py-2 px-3 text-center font-bold text-rose-600">{k.alpa}</td>
                                    <td class="py-2 px-3 text-center">{k.telat}</td>
                                    <td class="py-2 px-3 text-center font-bold text-brand-600">{k.persentaseHadir}%</td>
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

              <div class="px-6 py-3 border-t border-secondary-100 dark:border-secondary-800 flex justify-end">
                <button
                  onClick={() => setDetailMahasiswaId(null)}
                  class="px-4 py-1.5 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 text-xs font-bold rounded-lg"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
