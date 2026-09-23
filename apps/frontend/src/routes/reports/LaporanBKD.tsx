import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { ExportButtonGroup } from '../../components/reports/ExportButton';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { type BkdRekap, bkdController } from '../../controllers/bkdController';
import { dosenController } from '../../controllers/dosenController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import { exportBapBulkPDF, exportPresensiBulkPDF } from '../../utils/bkd-bulk-print';
import { hitungRekapPerTanggal, hitungRincianSesi } from '../../utils/bkd-helpers';
import { ExportColumn } from '../../utils/export';

const PRESENSI_STATUS: {
  key: keyof { hadir: number; sakit: number; izin: number; alpa: number; telat: number };
  label: string;
}[] = [
  { key: 'hadir', label: 'H' },
  { key: 'sakit', label: 'S' },
  { key: 'izin', label: 'I' },
  { key: 'alpa', label: 'A' },
  { key: 'telat', label: 'T' },
];

export default function LaporanBKD() {
  const auth = useAuth();
  const toast = useToast();
  const isDosenRole = () => auth.hasRole(['dosen']);

  const [selectedPeriode, setSelectedPeriode] = createSignal('');
  const [selectedDosen, setSelectedDosen] = createSignal('');

  const [periodes] = createResource(() => periodeAkademikController.getAll('', 1, 100));
  const [dosens] = createResource(() => dosenController.getAll('', 1, 1000));

  const [rekap] = createResource(
    () => ({ dosenId: selectedDosen(), periodeId: selectedPeriode() }),
    async ({ dosenId, periodeId }) => {
      if (!periodeId) return null;
      // Dosen dipaksa self di backend; kirim placeholder bila role dosen tanpa pilihan.
      const targetDosen = isDosenRole() ? Number(dosenId) || 0 : Number(dosenId);
      if (!targetDosen) return null;
      try {
        return await bkdController.getRekap(targetDosen, periodeId);
      } catch {
        return null;
      }
    },
  );

  // Auto-resolve dosen pertama untuk role dosen agar langsung terisi.
  createEffect(() => {
    if (isDosenRole() && !selectedDosen() && dosens()?.data?.length) {
      const d = dosens()?.data[0];
      if (d) setSelectedDosen(String(d.id));
    }
  });

  const rows = (): BkdRekap['mengajar'] => rekap()?.data.mengajar || [];
  const bimbingan = () => rekap()?.data.bimbingan || [];
  const ringkasan = () => rekap()?.data.ringkasan;

  const handleBapPdf = () => {
    const data = rekap()?.data;
    if (!data) {
      toast.showToast('Pilih periode (dan dosen) terlebih dahulu', 'info');
      return;
    }
    if (data.mengajar.length === 0) {
      toast.showToast('Tidak ada sesi BAP untuk dicetak', 'info');
      return;
    }
    try {
      exportBapBulkPDF(data);
      toast.showToast('PDF BAP berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal membuat PDF BAP', 'error');
    }
  };

  const handlePresensiPdf = () => {
    const data = rekap()?.data;
    if (!data) {
      toast.showToast('Pilih periode (dan dosen) terlebih dahulu', 'info');
      return;
    }
    if (data.mengajar.length === 0) {
      toast.showToast('Tidak ada data presensi untuk dicetak', 'info');
      return;
    }
    try {
      exportPresensiBulkPDF(data);
      toast.showToast('PDF rekap presensi berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal membuat PDF rekap presensi', 'error');
    }
  };

  // Tabel A: rekap bimbingan per tanggal.
  const rekapBimbingan = createMemo(() => hitungRekapPerTanggal(bimbingan()));

  // Tabel B: rincian per sesi bimbingan.
  const rincianBimbingan = createMemo(() => hitungRincianSesi(bimbingan()));

  const columns: ExportColumn[] = [
    {
      header: 'Kode MK',
      accessor: (row: Record<string, unknown>) => (row.mataKuliah as { kode?: string })?.kode || '-',
    },
    {
      header: 'Mata Kuliah',
      accessor: (row: Record<string, unknown>) => (row.mataKuliah as { nama?: string })?.nama || '-',
    },
    { header: 'Kelas', accessor: 'namaKelas' },
    { header: 'SKS', accessor: (row: Record<string, unknown>) => (row.mataKuliah as { sks?: number })?.sks ?? '-' },
    { header: 'Pertemuan', accessor: 'jumlahPertemuan' },
    { header: 'Total Menit', accessor: 'totalMenit' },
    {
      header: 'Hadir',
      accessor: (row: Record<string, unknown>) => (row.presensi as { hadir?: number })?.hadir ?? 0,
    },
    {
      header: 'Alpa',
      accessor: (row: Record<string, unknown>) => (row.presensi as { alpa?: number })?.alpa ?? 0,
    },
    {
      header: '% Hadir',
      accessor: (row: Record<string, unknown>) => (row.presensi as { persen?: number })?.persen ?? 0,
    },
  ];

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="page-title">Laporan BKD / Beban Dosen</h1>
            <p class="text-base text-secondary-500 dark:text-secondary-200">
              Rekapitulasi beban kerja dosen: mengajar, presensi, dan bimbingan akademik per periode
            </p>
          </div>
          <div class="flex items-center gap-2">
            <Show when={selectedPeriode()}>
              <a
                href={`/bkd/cetak?dosenId=${selectedDosen() || (isDosenRole() ? 0 : '')}&periodeId=${selectedPeriode()}`}
                target="_blank"
                class="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 print:hidden"
              >
                🖨️ Cetak Mandiri
              </a>
            </Show>
            <Show when={rekap()?.data}>
              <button
                type="button"
                onClick={handleBapPdf}
                disabled={rekap.loading}
                class="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-600 border border-brand-300 shadow-sm transition-all hover:bg-brand-50 active:scale-95 disabled:opacity-50"
              >
                📄 BAP (PDF)
              </button>
              <button
                type="button"
                onClick={handlePresensiPdf}
                disabled={rekap.loading}
                class="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-brand-600 border border-brand-300 shadow-sm transition-all hover:bg-brand-50 active:scale-95 disabled:opacity-50"
              >
                📊 Presensi (PDF)
              </button>
            </Show>
            <ExportButtonGroup data={() => rows()} columns={columns} filename="BKD" title="Laporan BKD / Beban Dosen" />
          </div>
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <label class="block text-caption font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-1">
              Periode
            </label>
            <select
              class="w-full px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={selectedPeriode()}
              onChange={(e) => setSelectedPeriode(e.currentTarget.value)}
            >
              <option value="">Pilih Periode</option>
              <For each={periodes()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
            </select>
          </div>
          <div class="flex-1">
            <label class="block text-caption font-semibold text-secondary-500 dark:text-secondary-300 uppercase tracking-wider mb-1">
              Dosen
            </label>
            <Show
              when={!isDosenRole()}
              fallback={
                <div class="px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white">
                  Diri sendiri (sesuai login)
                </div>
              }
            >
              <select
                class="w-full px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={selectedDosen()}
                onChange={(e) => setSelectedDosen(e.currentTarget.value)}
              >
                <option value="">Pilih Dosen</option>
                <For each={dosens()?.data || []}>
                  {(d: { id: number; nama: string; nip: string }) => (
                    <option value={d.id}>
                      {d.nama} ({d.nip})
                    </option>
                  )}
                </For>
              </select>
            </Show>
          </div>
        </div>

        <Show when={!rekap()}>
          <div class="rounded-2xl border border-secondary-100 bg-white p-10 text-center text-secondary-400 dark:bg-secondary-900 dark:border-secondary-800">
            {rekap.loading ? 'Memuat laporan...' : 'Pilih periode (dan dosen) untuk menampilkan laporan.'}
          </div>
        </Show>

        <Show when={rekap()}>
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard
              title="Total SKS"
              value={ringkasan()?.totalSks || 0}
              color="brand"
              icon={<span class="text-2xl">📚</span>}
            />
            <StatCard
              title="Total Pertemuan"
              value={ringkasan()?.totalPertemuan || 0}
              color="green"
              icon={<span class="text-2xl">🗓️</span>}
            />
            <StatCard
              title="Total Menit"
              value={ringkasan()?.totalMenit || 0}
              color="accent"
              icon={<span class="text-2xl">⏱️</span>}
            />
            <StatCard
              title="Total Kelas"
              value={ringkasan()?.totalMengajar || 0}
              color="brand"
              icon={<span class="text-2xl">🏫</span>}
            />
            <StatCard
              title="Bimbingan"
              value={ringkasan()?.totalBimbingan || 0}
              color="green"
              icon={<span class="text-2xl">🤝</span>}
            />
          </div>

          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">Rekap Mengajar &amp; Presensi</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Mata Kuliah</th>
                    <th class="py-3 px-5">Kelas</th>
                    <th class="py-3 px-5 text-center">SKS</th>
                    <th class="py-3 px-5 text-center">Pertemuan</th>
                    <th class="py-3 px-5 text-center">Menit</th>
                    <th class="py-3 px-5 text-center">Presensi (H/S/I/A/T)</th>
                    <th class="py-3 px-5 text-center">% Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={rows()}
                    fallback={
                      <tr>
                        <td colspan="7" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
                          Tidak ada data mengajar
                        </td>
                      </tr>
                    }
                  >
                    {(r) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5">
                          <div class="font-semibold text-secondary-800 dark:text-white">{r.mataKuliah.nama}</div>
                          <div class="text-caption text-secondary-400 dark:text-secondary-300">{r.mataKuliah.kode}</div>
                        </td>
                        <td class="py-3 px-5 text-secondary-500 dark:text-secondary-300">{r.namaKelas}</td>
                        <td class="py-3 px-5 text-center">{r.mataKuliah.sks}</td>
                        <td class="py-3 px-5 text-center">{r.jumlahPertemuan}</td>
                        <td class="py-3 px-5 text-center">{r.totalMenit}</td>
                        <td class="py-3 px-5 text-center whitespace-nowrap">
                          <For each={PRESENSI_STATUS}>
                            {(st) => (
                              <span class="mx-1 inline-block">
                                <span class="font-bold text-secondary-800 dark:text-white">{st.label}</span>:{' '}
                                {r.presensi[st.key]}
                              </span>
                            )}
                          </For>
                        </td>
                        <td class="py-3 px-5 text-center">
                          <span
                            class={
                              'px-2 py-0.5 rounded-full text-caption font-bold ' +
                              (r.presensi.persen >= 80 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700')
                            }
                          >
                            {r.presensi.persen}%
                          </span>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">Rekap Bimbingan per Tanggal</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Tanggal Bimbingan</th>
                    <th class="py-3 px-5 text-center">Jumlah Sesi</th>
                    <th class="py-3 px-5">Daftar Mahasiswa</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={rekapBimbingan()}
                    fallback={
                      <tr>
                        <td colspan="3" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
                          Tidak ada data bimbingan
                        </td>
                      </tr>
                    }
                  >
                    {(r) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{r.tanggal}</td>
                        <td class="py-3 px-5 text-center">
                          <span class="px-2 py-0.5 rounded-full text-caption font-bold bg-blue-50 text-blue-700">
                            {r.jumlahSesi}
                          </span>
                        </td>
                        <td class="py-3 px-5 text-secondary-500 dark:text-secondary-300">{r.daftarMahasiswa}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">Riwayat Bimbingan (Detail)</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Tanggal Bimbingan</th>
                    <th class="py-3 px-5">NIM</th>
                    <th class="py-3 px-5">Nama Mahasiswa</th>
                    <th class="py-3 px-5">Topik Bimbingan</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={rincianBimbingan()}
                    fallback={
                      <tr>
                        <td colspan="4" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
                          Tidak ada data bimbingan
                        </td>
                      </tr>
                    }
                  >
                    {(r) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{r.tanggal}</td>
                        <td class="py-3 px-5">{r.nim}</td>
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{r.nama}</td>
                        <td class="py-3 px-5 text-secondary-500 dark:text-secondary-300">{r.topik}</td>
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
