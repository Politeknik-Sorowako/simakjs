import { createEffect, createMemo, createResource, createSignal, For, onCleanup, onMount, Show } from 'solid-js';
import { StatCard } from '../../components/charts';
import { MainLayout } from '../../components/MainLayout';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import {
  type BkdRekap,
  type BkdRekapMahasiswaPraktikumRow,
  type BkdRiwayatPraktikumRow,
  bkdController,
} from '../../controllers/bkdController';
import { dosenController } from '../../controllers/dosenController';
import { periodeAkademikController } from '../../controllers/periodeAkademikController';
import {
  exportBapBulkPDF,
  exportBapPraktikumBulkPDF,
  exportPresensiBulkPDF,
  exportPresensiPraktikumBulkPDF,
  filterKelasBerBap,
  filterKelasBerpresensi,
  filterRombelBerBap,
  filterRombelBerpresensi,
} from '../../utils/bkd-bulk-print';
import { exportBkdRekapCSV, exportBkdRekapExcel } from '../../utils/bkd-export';
import { hitungRekapPerTanggal, hitungRincianSesi } from '../../utils/bkd-helpers';
import { type ExportColumn, exportToCSV, exportToExcel, exportToPDF } from '../../utils/export';

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

const MENU_ITEM_CLASS =
  'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-secondary-700 transition-colors hover:bg-secondary-100 hover:text-secondary-900 dark:text-secondary-200 dark:hover:bg-secondary-800';

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
      if (!targetDosen && !isDosenRole()) return null;
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

  // Periode diurutkan dari terbaru -> terlama (id berbentuk YYYYT, mis. 20251 > 20241).
  const periodeOptions = createMemo(() =>
    [...(periodes()?.data || [])].sort((a, b) => b.id.localeCompare(a.id)).map((p) => ({ label: p.nama, value: p.id })),
  );

  // Default: pilih periode aktif; bila tidak ada, gunakan periode terbaru.
  createEffect(() => {
    if (selectedPeriode() || !periodes()?.data?.length) return;
    const active = periodes()?.data?.find((p) => p.aktif);
    const target = active ?? [...(periodes()?.data || [])].sort((a, b) => b.id.localeCompare(a.id))[0];
    if (target) setSelectedPeriode(target.id);
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
    if (filterKelasBerBap(data.mengajar).length === 0) {
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
    if (filterKelasBerpresensi(data.rekapPresensi || []).length === 0) {
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

  const handleBapPraktikumPdf = () => {
    const data = rekap()?.data;
    if (!data) {
      toast.showToast('Pilih periode (dan dosen) terlebih dahulu', 'info');
      return;
    }
    if (filterRombelBerBap(data.mengajarPraktikum || []).length === 0) {
      toast.showToast('Tidak ada sesi BAP praktikum untuk dicetak', 'info');
      return;
    }
    try {
      exportBapPraktikumBulkPDF(data);
      toast.showToast('PDF BAP praktikum berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal membuat PDF BAP praktikum', 'error');
    }
  };

  const handlePresensiPraktikumPdf = () => {
    const data = rekap()?.data;
    if (!data) {
      toast.showToast('Pilih periode (dan dosen) terlebih dahulu', 'info');
      return;
    }
    if (filterRombelBerpresensi(data.rekapPresensiPraktikum || []).length === 0) {
      toast.showToast('Tidak ada data presensi praktikum untuk dicetak', 'info');
      return;
    }
    try {
      exportPresensiPraktikumBulkPDF(data);
      toast.showToast('PDF rekap presensi praktikum berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal membuat PDF rekap presensi praktikum', 'error');
    }
  };

  const handleRekapCsv = () => {
    const data = rekap()?.data;
    if (!data) {
      toast.showToast('Pilih periode (dan dosen) terlebih dahulu', 'info');
      return;
    }
    try {
      exportBkdRekapCSV(data);
      toast.showToast('CSV rekap BKD berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal membuat CSV rekap BKD', 'error');
    }
  };

  const handleRekapExcel = () => {
    const data = rekap()?.data;
    if (!data) {
      toast.showToast('Pilih periode (dan dosen) terlebih dahulu', 'info');
      return;
    }
    try {
      exportBkdRekapExcel(data);
      toast.showToast('Excel rekap BKD berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal membuat Excel rekap BKD', 'error');
    }
  };

  // Tabel A: rekap bimbingan per tanggal.
  const rekapBimbingan = createMemo(() => hitungRekapPerTanggal(bimbingan()));

  // Tabel B: rincian per sesi bimbingan.
  const rincianBimbingan = createMemo(() => hitungRincianSesi(bimbingan()));
  const rowsPraktikum = (): NonNullable<BkdRekap['mengajarPraktikum']> => rekap()?.data.mengajarPraktikum || [];
  const rekapPresensiPraktikum = (): NonNullable<BkdRekap['rekapPresensiPraktikum']> =>
    rekap()?.data.rekapPresensiPraktikum || [];

  // Riwayat pertemuan praktikum: satu baris per sesi BAP praktikum.
  const riwayatPraktikum = createMemo(() => {
    const list: BkdRiwayatPraktikumRow[] = [];
    for (const m of rowsPraktikum()) {
      for (const p of m.pertemuan) {
        list.push({
          namaGroup: m.namaGroup,
          namaKelas: m.namaKelas,
          kode: m.mataKuliah.kode,
          namaMk: m.mataKuliah.nama,
          sesiKe: p.sesiKe,
          tanggal: p.tanggal,
          materi: p.materi,
          durasiMenit: p.durasiMenit,
          presensiRingkasan: p.presensiRingkasan,
        });
      }
    }
    return list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  });

  // Rekap presensi praktikum per mahasiswa: satu baris per mahasiswa per rombel.
  const rekapMhsPraktikum = createMemo(() => {
    const list: BkdRekapMahasiswaPraktikumRow[] = [];
    for (const r of rekapPresensiPraktikum()) {
      for (const m of r.mahasiswa) {
        list.push({
          namaGroup: r.namaGroup,
          namaKelas: r.namaKelas,
          kode: r.mataKuliah.kode,
          namaMk: r.mataKuliah.nama,
          nim: m.nim,
          nama: m.nama,
          hadir: m.hadir,
          sakit: m.sakit,
          izin: m.izin,
          alpa: m.alpa,
          telat: m.telat,
          totalKehadiran: m.totalKehadiran,
          persentaseHadir: m.persentaseHadir,
        });
      }
    }
    return list;
  });

  const columns: ExportColumn[] = [
    { header: 'Jenis', accessor: 'jenis' },
    {
      header: 'Kode MK',
      accessor: (row: Record<string, unknown>) => (row.mataKuliah as { kode?: string })?.kode || '-',
    },
    {
      header: 'Mata Kuliah',
      accessor: (row: Record<string, unknown>) => (row.mataKuliah as { nama?: string })?.nama || '-',
    },
    { header: 'Kelas', accessor: 'namaKelas' },
    { header: 'Group', accessor: 'group' },
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

  // Data ekspor mencakup teori + praktikum; kolom 'Jenis'/'Group' membedakan keduanya.
  const exportRows = (): Record<string, unknown>[] => [
    ...rows().map((r) => ({ ...r, jenis: 'Teori', group: '-' })),
    ...rowsPraktikum().map((r) => ({ ...r, jenis: 'Praktikum', group: r.namaGroup })),
  ];

  // Dropdown "Cetak & Ekspor" — satu pintu akses untuk seluruh aksi cetak/ekspor BKD.
  const [actionsOpen, setActionsOpen] = createSignal(false);
  let actionsRef: HTMLDivElement | undefined;

  const closeActions = () => setActionsOpen(false);
  const runAction = (fn: () => void) => () => {
    closeActions();
    fn();
  };

  const handleClickOutsideActions = (e: MouseEvent) => {
    if (actionsRef && !actionsRef.contains(e.target as Node)) closeActions();
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutsideActions);
    onCleanup(() => document.removeEventListener('click', handleClickOutsideActions));
  });

  const handleCetakMandiri = () => {
    if (!selectedPeriode()) {
      toast.showToast('Pilih periode terlebih dahulu', 'info');
      return;
    }
    const url = `/bkd/cetak?dosenId=${selectedDosen() || (isDosenRole() ? 0 : '')}&periodeId=${selectedPeriode()}`;
    window.open(url, '_blank');
  };

  const handleTableExcel = () => {
    const data = exportRows();
    if (data.length === 0) {
      toast.showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }
    try {
      exportToExcel(data, columns, 'BKD');
      toast.showToast('Ekspor berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal mengunduh data ekspor', 'error');
    }
  };

  const handleTablePdf = () => {
    const data = exportRows();
    if (data.length === 0) {
      toast.showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }
    try {
      exportToPDF(data, columns, 'BKD', 'Laporan BKD / Beban Dosen');
      toast.showToast('Ekspor berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal mengunduh data ekspor', 'error');
    }
  };

  const handleTableCsv = () => {
    const data = exportRows();
    if (data.length === 0) {
      toast.showToast('Tidak ada data untuk diekspor', 'info');
      return;
    }
    try {
      exportToCSV(data, columns, 'BKD');
      toast.showToast('Ekspor berhasil diunduh', 'success');
    } catch {
      toast.showToast('Gagal mengunduh data ekspor', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="page-title">Laporan BKD / Beban Dosen</h1>
            <p class="text-base text-secondary-500 dark:text-secondary-200">
              Rekapitulasi beban kerja dosen: mengajar, praktikum, presensi, dan bimbingan akademik per periode
            </p>
          </div>
          <div class="relative" ref={actionsRef}>
            <button
              type="button"
              onClick={() => setActionsOpen(!actionsOpen())}
              disabled={rekap.loading}
              class="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95 disabled:opacity-50 print:hidden"
            >
              <span class="text-base">🖨️</span>
              <span>Cetak &amp; Ekspor</span>
              <svg
                class={`h-4 w-4 transition-transform ${actionsOpen() ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <Show when={actionsOpen()}>
              <div class="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-secondary-200 bg-white p-2 shadow-xl dark:border-secondary-700 dark:bg-secondary-900">
                <p class="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wider text-secondary-400">
                  Cetak Dokumen
                </p>
                <button type="button" onClick={runAction(handleCetakMandiri)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">🖨️</span>
                  <span>Cetak Mandiri (Halaman)</span>
                </button>
                <button type="button" onClick={runAction(handleBapPdf)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📄</span>
                  <span>BAP Perkuliahan (PDF)</span>
                </button>
                <button type="button" onClick={runAction(handlePresensiPdf)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📊</span>
                  <span>Rekap Presensi Teori (PDF)</span>
                </button>
                <button type="button" onClick={runAction(handleBapPraktikumPdf)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">🧪</span>
                  <span>BAP Praktikum (PDF)</span>
                </button>
                <button type="button" onClick={runAction(handlePresensiPraktikumPdf)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📊</span>
                  <span>Rekap Presensi Praktikum (PDF)</span>
                </button>

                <div class="my-1 border-t border-secondary-100 dark:border-secondary-700" />
                <p class="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wider text-secondary-400">
                  Ekspor Rekap
                </p>
                <button type="button" onClick={runAction(handleRekapCsv)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📄</span>
                  <span>Rekap Lengkap (CSV)</span>
                </button>
                <button type="button" onClick={runAction(handleRekapExcel)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📊</span>
                  <span>Rekap Lengkap (Excel)</span>
                </button>

                <div class="my-1 border-t border-secondary-100 dark:border-secondary-700" />
                <p class="px-3 pb-1 pt-2 text-caption font-semibold uppercase tracking-wider text-secondary-400">
                  Ekspor Tabel
                </p>
                <button type="button" onClick={runAction(handleTableExcel)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📊</span>
                  <span>Tabel Mengajar (Excel)</span>
                </button>
                <button type="button" onClick={runAction(handleTablePdf)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📄</span>
                  <span>Tabel Mengajar (PDF)</span>
                </button>
                <button type="button" onClick={runAction(handleTableCsv)} class={MENU_ITEM_CLASS}>
                  <span class="text-base">📋</span>
                  <span>Tabel Mengajar (CSV)</span>
                </button>
              </div>
            </Show>
          </div>
        </div>

        <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4">
          <div class="flex-1">
            <SearchableSelect
              label="Periode"
              placeholder="Pilih Periode"
              isLoading={periodes.loading}
              value={selectedPeriode()}
              onChange={(v) => setSelectedPeriode(String(v))}
              options={[{ label: 'Pilih Periode', value: '' }, ...periodeOptions()]}
            />
          </div>
          <div class="flex-1">
            <Show
              when={!isDosenRole()}
              fallback={
                <div class="flex flex-col gap-1.5">
                  <label class="block text-caption font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-200">
                    Dosen
                  </label>
                  <div class="px-3 py-2 text-base bg-secondary-50 border border-secondary-200 rounded-lg dark:bg-secondary-800 dark:border-secondary-700 dark:text-white">
                    Diri sendiri (sesuai login)
                  </div>
                </div>
              }
            >
              <SearchableSelect
                label="Dosen"
                placeholder="Pilih Dosen"
                isLoading={dosens.loading}
                value={selectedDosen()}
                onChange={(v) => setSelectedDosen(String(v))}
                options={[
                  { label: 'Pilih Dosen', value: '' },
                  ...(dosens()?.data || []).map((d) => ({
                    label: `${d.nama} (${d.nip})`,
                    value: d.id,
                  })),
                ]}
              />
            </Show>
          </div>
        </div>

        <Show when={!rekap()}>
          <div class="rounded-2xl border border-secondary-100 bg-white p-10 text-center text-secondary-400 dark:bg-secondary-900 dark:border-secondary-800">
            {rekap.loading ? 'Memuat laporan...' : 'Pilih periode (dan dosen) untuk menampilkan laporan.'}
          </div>
        </Show>

        <Show when={rekap()}>
          <div class="flex flex-col gap-4">
            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-widest text-secondary-400 dark:text-secondary-300">
                Perkuliahan Teori
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="Total SKS Teori"
                  value={ringkasan()?.totalSksTeori ?? ringkasan()?.totalSks ?? 0}
                  color="brand"
                  icon={<span class="text-2xl">📚</span>}
                />
                <StatCard
                  title="Pertemuan Teori"
                  value={ringkasan()?.totalPertemuan || 0}
                  color="green"
                  icon={<span class="text-2xl">🗓️</span>}
                />
                <StatCard
                  title="Menit Teori"
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
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-widest text-secondary-400 dark:text-secondary-300">
                Praktikum Lab / Bengkel
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  title="SKS Praktikum"
                  value={ringkasan()?.totalSksPraktikum || 0}
                  color="brand"
                  icon={<span class="text-2xl">🧪</span>}
                />
                <StatCard
                  title="Rombel Praktikum"
                  value={ringkasan()?.totalRombelPraktikum || 0}
                  color="green"
                  icon={<span class="text-2xl">🔬</span>}
                />
                <StatCard
                  title="Pertemuan Praktikum"
                  value={ringkasan()?.totalPertemuanPraktikum || 0}
                  color="accent"
                  icon={<span class="text-2xl">🧫</span>}
                />
                <StatCard
                  title="Menit Praktikum"
                  value={ringkasan()?.totalMenitPraktikum || 0}
                  color="brand"
                  icon={<span class="text-2xl">⏲️</span>}
                />
              </div>
            </div>

            <div>
              <p class="mb-2 text-xs font-bold uppercase tracking-widest text-secondary-400 dark:text-secondary-300">
                Bimbingan &amp; Total Beban
              </p>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Bimbingan"
                  value={ringkasan()?.totalBimbingan || 0}
                  color="green"
                  icon={<span class="text-2xl">🤝</span>}
                />
                <StatCard
                  title="Grand Total SKS"
                  value={ringkasan()?.grandSks ?? ringkasan()?.totalSks ?? 0}
                  color="brand"
                  icon={<span class="text-2xl">🎓</span>}
                />
                <StatCard
                  title="Grand Total"
                  value={`${ringkasan()?.grandPertemuan ?? ringkasan()?.totalPertemuan ?? 0} ptm / ${
                    ringkasan()?.grandMenit ?? ringkasan()?.totalMenit ?? 0
                  } mnt`}
                  color="accent"
                  icon={<span class="text-2xl">🎯</span>}
                />
              </div>
            </div>
          </div>

          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">A. Rekap Mengajar &amp; Presensi</h3>
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
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">
                C1. Rekap Mengajar Praktikum &amp; Presensi
              </h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Mata Kuliah</th>
                    <th class="py-3 px-5">Kelas</th>
                    <th class="py-3 px-5">Group</th>
                    <th class="py-3 px-5 text-center">Pertemuan</th>
                    <th class="py-3 px-5 text-center">Menit</th>
                    <th class="py-3 px-5 text-center">Presensi (H/S/I/A/T)</th>
                    <th class="py-3 px-5 text-center">% Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={rowsPraktikum()}
                    fallback={
                      <tr>
                        <td colspan="7" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
                          Tidak ada data praktikum
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
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{r.namaGroup}</td>
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
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">C2. Riwayat Pertemuan Praktikum</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Mata Kuliah</th>
                    <th class="py-3 px-5">Group</th>
                    <th class="py-3 px-5 text-center">Sesi</th>
                    <th class="py-3 px-5">Tanggal</th>
                    <th class="py-3 px-5">Materi</th>
                    <th class="py-3 px-5 text-center">Durasi</th>
                    <th class="py-3 px-5 text-center">H/S/I/A/T</th>
                    <th class="py-3 px-5 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={riwayatPraktikum()}
                    fallback={
                      <tr>
                        <td colspan="8" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
                          Tidak ada riwayat pertemuan praktikum
                        </td>
                      </tr>
                    }
                  >
                    {(p) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5">
                          <div class="font-semibold text-secondary-800 dark:text-white">{p.namaMk}</div>
                          <div class="text-caption text-secondary-400 dark:text-secondary-300">{p.kode}</div>
                        </td>
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{p.namaGroup}</td>
                        <td class="py-3 px-5 text-center">{p.sesiKe}</td>
                        <td class="py-3 px-5">{p.tanggal}</td>
                        <td class="py-3 px-5 text-secondary-500 dark:text-secondary-300">{p.materi}</td>
                        <td class="py-3 px-5 text-center">{p.durasiMenit}</td>
                        <td class="py-3 px-5 text-center whitespace-nowrap">
                          <span class="font-bold text-secondary-800 dark:text-white">H</span>:
                          {p.presensiRingkasan.hadir}{' '}
                          <span class="font-bold text-secondary-800 dark:text-white">S</span>:
                          {p.presensiRingkasan.sakit}{' '}
                          <span class="font-bold text-secondary-800 dark:text-white">I</span>:{p.presensiRingkasan.izin}{' '}
                          <span class="font-bold text-secondary-800 dark:text-white">A</span>:{p.presensiRingkasan.alpa}{' '}
                          <span class="font-bold text-secondary-800 dark:text-white">T</span>:
                          {p.presensiRingkasan.telat}
                        </td>
                        <td class="py-3 px-5 text-center">{p.presensiRingkasan.total}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">
                C3. Rekap Presensi Praktikum per Mahasiswa
              </h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-table border-collapse">
                <thead>
                  <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-fine font-semibold bg-secondary-50/50 dark:bg-secondary-800">
                    <th class="py-3 px-5">Mata Kuliah</th>
                    <th class="py-3 px-5">Group</th>
                    <th class="py-3 px-5">NIM</th>
                    <th class="py-3 px-5">Nama</th>
                    <th class="py-3 px-5 text-center">H</th>
                    <th class="py-3 px-5 text-center">S</th>
                    <th class="py-3 px-5 text-center">I</th>
                    <th class="py-3 px-5 text-center">A</th>
                    <th class="py-3 px-5 text-center">T</th>
                    <th class="py-3 px-5 text-center">Total Hadir</th>
                    <th class="py-3 px-5 text-center">% Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={rekapMhsPraktikum()}
                    fallback={
                      <tr>
                        <td colspan="11" class="text-center py-8 text-secondary-400 dark:text-secondary-300">
                          Tidak ada data presensi praktikum
                        </td>
                      </tr>
                    }
                  >
                    {(m) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 dark:hover:bg-secondary-800/30">
                        <td class="py-3 px-5">
                          <div class="font-semibold text-secondary-800 dark:text-white">{m.namaMk}</div>
                          <div class="text-caption text-secondary-400 dark:text-secondary-300">{m.kode}</div>
                        </td>
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{m.namaGroup}</td>
                        <td class="py-3 px-5">{m.nim}</td>
                        <td class="py-3 px-5 font-semibold text-secondary-800 dark:text-white">{m.nama}</td>
                        <td class="py-3 px-5 text-center">{m.hadir}</td>
                        <td class="py-3 px-5 text-center">{m.sakit}</td>
                        <td class="py-3 px-5 text-center">{m.izin}</td>
                        <td class="py-3 px-5 text-center">{m.alpa}</td>
                        <td class="py-3 px-5 text-center">{m.telat}</td>
                        <td class="py-3 px-5 text-center">{m.totalKehadiran}</td>
                        <td class="py-3 px-5 text-center">{m.persentaseHadir}%</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <p class="px-5 py-3 text-xs text-secondary-400 dark:text-secondary-300">
              Catatan: Sesi praktikum yang dihitung adalah sesi yang diampu dosen ini, baik sebagai instruktur rombel
              maupun pengisi BAP praktikum; sesi dari rombel lain tidak diperhitungkan.
            </p>
          </div>

          <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-2xl shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-secondary-100 dark:border-secondary-800">
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">D. Rekap Bimbingan per Tanggal</h3>
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
              <h3 class="text-base font-bold text-secondary-800 dark:text-white">E. Riwayat Bimbingan (Detail)</h3>
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
