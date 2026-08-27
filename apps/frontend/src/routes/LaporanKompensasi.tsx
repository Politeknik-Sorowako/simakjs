import { createEffect, createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';
import { presensiController } from '../controllers/presensiController';
import { prodiController } from '../controllers/prodiController';
import { type ExportColumn, exportToExcel, exportToExcelMultipleSheets } from '../utils/export';
import { fmtTanggal } from '../utils/format';

const PER_PAGE = 20;

export default function LaporanKompensasi() {
  const toast = useToast();

  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [showPayModal, setShowPayModal] = createSignal(false);
  const [editingPay, setEditingPay] = createSignal<{
    id: number;
    jumlahMenit: number;
    keterangan: string;
    tanggal: string;
  } | null>(null);
  const [jumlahMenit, setJumlahMenit] = createSignal(60);
  const [keterangan, setKeterangan] = createSignal('');
  const now = new Date();
  const [tanggal, setTanggal] = createSignal(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  );
  const [search, setSearch] = createSignal('');
  const [filterProdiId, setFilterProdiId] = createSignal<number | string | undefined>();
  const [sortBy, setSortBy] = createSignal('sisa');
  const [sortOrder, setSortOrder] = createSignal('desc');
  const [statusLunas, setStatusLunas] = createSignal('belum_lunas');
  const [page, setPage] = createSignal(1);
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [isExporting, setIsExporting] = createSignal(false);
  const [isExportingDetail, setIsExportingDetail] = createSignal(false);
  const [showImportModal, setShowImportModal] = createSignal(false);

  // Debounce search input
  createEffect(() => {
    const q = search();
    const timer = setTimeout(() => {
      setDebouncedSearch(q);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  });

  // Fetch laporan with server-side pagination & sorting/filtering
  const [laporan, { refetch: refetchLaporan }] = createResource(
    () => ({
      page: page(),
      search: debouncedSearch(),
      prodiId: filterProdiId(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
      statusLunas: statusLunas(),
    }),
    async ({ page, search, prodiId, sortBy, sortOrder, statusLunas }) => {
      return await presensiController.getLaporanKompensasi(
        page,
        PER_PAGE,
        search || undefined,
        typeof prodiId === 'number' ? prodiId : undefined,
        sortBy,
        sortOrder,
        statusLunas,
      );
    },
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const totalPages = () => laporan()?.meta?.totalPages || 1;
  const filteredCount = () => laporan()?.meta?.total || 0;

  const [mhsDetail, { refetch: refetchDetail }] = createResource(selectedMhsId, async (id) => {
    if (!id) return null;
    return await presensiController.getKompensasiDetail(id);
  });

  const handleOpenDetail = (id: number) => setSelectedMhsId(id);
  const handleCloseDetail = () => setSelectedMhsId(null);

  const openAddPaymentModal = () => {
    setEditingPay(null);
    setJumlahMenit(60);
    setKeterangan('');
    const now = new Date();
    setTanggal(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    );
    setShowPayModal(true);
  };
  const openEditPaymentModal = (pay: { id: number; jumlahMenit: number; keterangan: string; tanggal: string }) => {
    setEditingPay(pay);
    setJumlahMenit(pay.jumlahMenit);
    setKeterangan(pay.keterangan);
    setTanggal(pay.tanggal);
    setShowPayModal(true);
  };

  const handleSavePayment = async (e: Event) => {
    e.preventDefault();
    const id = selectedMhsId();
    if (!id) return;
    try {
      const data = { jumlahMenit: jumlahMenit(), tanggal: tanggal(), keterangan: keterangan() };
      const editTarget = editingPay();
      if (editTarget) {
        await presensiController.updateKompensasiBayar(editTarget.id, data);
        toast.showToast('Pembayaran berhasil diupdate', 'success');
      } else {
        await presensiController.bayarKompensasi({ mahasiswaId: id, ...data });
        toast.showToast('Pembayaran berhasil diinput', 'success');
      }
      setShowPayModal(false);
      setKeterangan('');
      setJumlahMenit(60);
      refetchDetail();
      refetchLaporan();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? (err as Error).message : 'Gagal menyimpan', 'error');
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await presensiController.getLaporanKompensasi(
        1,
        99999,
        debouncedSearch() || undefined,
        typeof filterProdiId() === 'number' ? (filterProdiId() as number) : undefined,
        sortBy(),
        sortOrder(),
        statusLunas(),
        true,
      );
      const cols: ExportColumn[] = [
        { header: 'NIM', accessor: 'nim' },
        { header: 'Nama Mahasiswa', accessor: 'nama' },
        { header: 'Program Studi', accessor: 'prodiNama' },
        { header: 'Total Mangkir (Menit)', accessor: 'totalKompensasi' },
        { header: 'Kompensasi Dilunasi (Menit)', accessor: 'totalDibayar' },
        { header: 'Sisa Tanggungan (Menit)', accessor: 'sisaKompensasi' },
        {
          header: 'Status Pelunasan',
          accessor: (r: Record<string, unknown>) => (Number(r.sisaKompensasi) > 0 ? 'Belum Lunas' : 'Lunas'),
        },
      ];
      exportToExcel(
        res.data,
        cols,
        `Laporan_Kompensasi_${(() => {
          const n = new Date();
          return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
        })()}`,
      );
      toast.showToast('Laporan kompensasi berhasil diunduh (.xlsx)', 'success');
    } catch (e: unknown) {
      toast.showToast('Gagal mengunduh laporan excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRiwayat = async () => {
    const detail = mhsDetail();
    if (!detail) return;
    setIsExportingDetail(true);
    try {
      const mhs = detail.mahasiswa;
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const sumberLabel = (sumber: string) =>
        sumber === 'perkuliahan' ? 'Perkuliahan' : sumber === 'apel' ? 'Apel' : 'Kompensasi Manual';
      const resolveKeterangan = (r: Record<string, unknown>): string => {
        const adminNote =
          typeof r.keteranganAdmin === 'string' && r.keteranganAdmin.trim() ? r.keteranganAdmin.trim() : '';
        if (adminNote) return adminNote;
        const sumber = String(r.sumber ?? '');
        const materi = typeof r.bapMateri === 'string' && r.bapMateri.trim() ? r.bapMateri.trim() : '';
        if (sumber === 'apel') return materi || 'Presensi Apel';
        if (sumber === 'perkuliahan') {
          const pertemuan = r.bapPertemuan != null ? ` (Pertemuan ${r.bapPertemuan})` : '';
          return materi ? `${materi}${pertemuan}` : `Perkuliahan${pertemuan}`;
        }
        if (sumber === 'manual') return materi || 'Kompensasi Manual';
        return '-';
      };

      exportToExcelMultipleSheets(
        [
          {
            name: 'Log Ketidakhadiran',
            columns: [
              { header: 'NIM', accessor: 'nim' },
              { header: 'Nama Mahasiswa', accessor: 'nama' },
              { header: 'Tanggal', accessor: 'bapTanggal' },
              { header: 'Sumber', accessor: (r) => sumberLabel(String((r as { sumber: string }).sumber)) },
              { header: 'Status', accessor: (r) => String((r as { status: string }).status || '').toUpperCase() },
              { header: 'Durasi (Menit)', accessor: 'durasiMangkir' },
              { header: 'Poin Kompensasi', accessor: 'poinKompensasi' },
              {
                header: 'Keterangan',
                accessor: (r) => resolveKeterangan(r as Record<string, unknown>),
              },
            ],
            data: detail.historyKompensasi.map((h) => ({
              ...h,
              nim: mhs.nim,
              nama: mhs.nama,
            })),
          },
          {
            name: 'Riwayat Pembayaran',
            columns: [
              { header: 'NIM', accessor: 'nim' },
              { header: 'Nama Mahasiswa', accessor: 'nama' },
              { header: 'Tanggal Pembayaran', accessor: 'tanggal' },
              { header: 'Jumlah Menit', accessor: 'jumlahMenit' },
              { header: 'Keterangan', accessor: 'keterangan' },
            ],
            data: detail.payments.map((p) => ({
              ...p,
              nim: mhs.nim,
              nama: mhs.nama,
            })),
          },
        ],
        `Riwayat_Kompensasi_${mhs.nim}_${dateStr}`,
      );
      toast.showToast('Riwayat mahasiswa berhasil diunduh (.xlsx)', 'success');
    } catch (e: unknown) {
      toast.showToast('Gagal mengunduh riwayat mahasiswa', 'error');
    } finally {
      setIsExportingDetail(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'nama' || field === 'nim' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const getSortIcon = (field: string) => {
    if (sortBy() !== field) return ' ↕';
    return sortOrder() === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Laporan Jam Kompensasi</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Pantau dan kelola tanggungan jam kompensasi (Disiplin Vokasi) mahasiswa
            </p>
          </div>
          <div class="flex items-center gap-3">
            <Button
              onClick={() => setShowImportModal(true)}
              variant="secondary"
              class="!px-4 !py-2 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              Impor CSV
            </Button>
            <Button
              onClick={handleExportExcel}
              disabled={isExporting()}
              variant="success"
              class="!px-4 !py-2 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              📊 {isExporting() ? 'Mengunduh...' : 'Ekspor Excel (.xlsx)'}
            </Button>
          </div>
        </div>

        {/* Filters & Control Toolbar */}
        <div class="bg-white border border-secondary-100 p-5 rounded-2xl shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Search */}
            <div class="relative w-full sm:w-64">
              <span class="absolute left-3.5 top-2.5 text-secondary-400 dark:text-secondary-200">🔍</span>
              <input
                type="text"
                placeholder="Cari NIM atau Nama..."
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
            </div>

            {/* Filter Prodi */}
            <Show when={(prodis()?.data?.length || 0) > 0}>
              <select
                class="px-3 py-2 text-xs bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-secondary-700 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={filterProdiId() || ''}
                onChange={(e) => {
                  setFilterProdiId(e.currentTarget.value ? parseInt(e.currentTarget.value) : undefined);
                  setPage(1);
                }}
              >
                <option value="">Semua Program Studi</option>
                <For each={prodis()?.data || []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </Show>

            {/* Filter Status Lunas */}
            <select
              class="px-3 py-2 text-xs bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-secondary-700 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={statusLunas()}
              onChange={(e) => {
                setStatusLunas(e.currentTarget.value);
                setPage(1);
              }}
            >
              <option value="belum_lunas">Belum Lunas (Sisa &gt; 0)</option>
              <option value="lunas">Lunas (Sisa = 0)</option>
              <option value="all">Semua Tanggungan</option>
            </select>

            {/* Sorting Select */}
            <select
              class="px-3 py-2 text-xs bg-secondary-50 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-semibold text-secondary-700 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
              value={`${sortBy()}_${sortOrder()}`}
              onChange={(e) => {
                const [valSort, valOrder] = e.currentTarget.value.split('_');
                setSortBy(valSort);
                setSortOrder(valOrder);
                setPage(1);
              }}
            >
              <option value="sisa_desc">Urut: Sisa Tanggungan (Terbanyak)</option>
              <option value="sisa_asc">Urut: Sisa Tanggungan (Tersedikit)</option>
              <option value="total_desc">Urut: Total Mangkir (Terbanyak)</option>
              <option value="nama_asc">Urut: Nama Mahasiswa (A-Z)</option>
              <option value="nim_asc">Urut: NIM Mahasiswa</option>
            </select>
          </div>

          <Button onClick={() => refetchLaporan()} variant="secondary" class="!px-3 !py-2 text-xs font-bold">
            🔄 Refresh
          </Button>
        </div>

        {/* Laporan Table — server-side paginated */}
        <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm overflow-hidden dark:bg-secondary-900 dark:border-secondary-800">
          <Show when={filterProdiId() || debouncedSearch() || statusLunas() !== 'belum_lunas'}>
            <div class="px-5 py-2 bg-brand-50 dark:bg-brand-950/40 border-b border-brand-100 dark:border-brand-900/50 flex justify-between items-center">
              <span class="text-xs font-bold text-brand-700 dark:text-brand-400">
                {debouncedSearch() ? `Pencarian: "${debouncedSearch()}"` : ''}
                {filterProdiId() ? ' — Filter prodi' : ''} ({filteredCount()} mahasiswa)
              </span>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterProdiId(undefined);
                  setStatusLunas('belum_lunas');
                  setSortBy('sisa');
                  setSortOrder('desc');
                  setPage(1);
                }}
                class="text-[10px] font-bold text-brand-600 hover:text-brand-700 underline"
              >
                Reset Filter
              </button>
            </div>
          </Show>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 text-secondary-400 dark:text-secondary-200 uppercase text-xs font-semibold bg-secondary-50/50 dark:border-secondary-800 dark:bg-secondary-800">
                  <th
                    onClick={() => handleSort('nama')}
                    title="Klik untuk mengurutkan berdasarkan nama"
                    class="py-3 px-6 cursor-pointer select-none hover:text-brand-600 transition-colors"
                  >
                    Mahasiswa <span class="text-xs font-bold">{getSortIcon('nama')}</span>
                  </th>
                  <th class="py-3 px-6">Program Studi</th>
                  <th
                    onClick={() => handleSort('total')}
                    title="Klik untuk mengurutkan berdasarkan total mangkir"
                    class="py-3 px-6 text-center cursor-pointer select-none hover:text-brand-600 transition-colors"
                  >
                    Akumulasi Mangkir <span class="text-xs font-bold">{getSortIcon('total')}</span>
                  </th>
                  <th class="py-3 px-6 text-center">Kompensasi Dilunasi</th>
                  <th
                    onClick={() => handleSort('sisa')}
                    title="Klik untuk mengurutkan berdasarkan sisa tanggungan"
                    class="py-3 px-6 text-center cursor-pointer select-none hover:text-brand-600 transition-colors"
                  >
                    Sisa Tanggungan <span class="text-xs font-bold">{getSortIcon('sisa')}</span>
                  </th>
                  <th class="py-3 px-6 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <Show
                  when={!laporan.loading}
                  fallback={
                    <tr>
                      <td colspan="6" class="text-center py-12 text-secondary-400 dark:text-secondary-200">
                        Memuat data laporan kompensasi...
                      </td>
                    </tr>
                  }
                >
                  <For
                    each={laporan()?.data || []}
                    fallback={
                      <tr>
                        <td colspan="6" class="text-center py-12 text-secondary-400 dark:text-secondary-200">
                          Tidak ada data mahasiswa terkompensasi.
                        </td>
                      </tr>
                    }
                  >
                    {(item) => (
                      <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30">
                        <td class="py-4 px-6">
                          <div class="font-bold text-secondary-800 dark:text-white">{item.nama}</div>
                          <div class="text-xs text-secondary-400 dark:text-secondary-200">{item.nim}</div>
                        </td>
                        <td class="py-4 px-6 text-secondary-600 font-semibold dark:text-secondary-200">
                          {item.prodiNama || '-'}
                        </td>
                        <td class="py-4 px-6 text-center text-red-500 font-bold">{item.totalKompensasi} Menit</td>
                        <td class="py-4 px-6 text-center text-accent-600 font-bold dark:text-accent-400">
                          {item.totalDibayar} Menit
                        </td>
                        <td class="py-4 px-6 text-center">
                          <span
                            class={`px-3 py-1 rounded-full text-xs font-extrabold ${item.sisaKompensasi > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' : 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400'}`}
                          >
                            {item.sisaKompensasi} Menit
                          </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                          <Button
                            onClick={() => handleOpenDetail(item.id)}
                            variant="primary"
                            class="!px-4 !py-1.5 text-xs font-bold"
                          >
                            Kelola Detail
                          </Button>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>
          {/* Server-side Pagination */}
          <Show when={filteredCount() > PER_PAGE}>
            <div class="flex justify-between items-center px-6 py-3 border-t border-secondary-100 dark:border-secondary-800 bg-secondary-50/50 dark:bg-secondary-800/50">
              <span class="text-xs text-secondary-500">
                Menampilkan {(page() - 1) * PER_PAGE + 1}-{Math.min(page() * PER_PAGE, filteredCount())} dari{' '}
                {filteredCount()} mahasiswa
              </span>
              <div class="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  disabled={page() <= 1}
                  class="px-3 py-1.5 text-xs font-bold rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-white"
                >
                  ← Sebelumnya
                </button>
                <span class="text-xs font-semibold text-secondary-500 px-2">
                  {page()} / {totalPages()}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages()))}
                  disabled={page() >= totalPages()}
                  class="px-3 py-1.5 text-xs font-bold rounded-lg border border-secondary-200 dark:border-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary-100 dark:hover:bg-secondary-700 transition-colors text-secondary-700 dark:text-white"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          </Show>
        </div>
      </div>

      {/* Modal Detail Mahasiswa */}
      <Modal isOpen={selectedMhsId() !== null} onClose={handleCloseDetail} title="Detail Riwayat Jam Kompensasi">
        <Show
          when={!mhsDetail.loading && mhsDetail()}
          fallback={<div class="p-6 text-center text-secondary-400 dark:text-secondary-200">Memuat riwayat...</div>}
        >
          {(detail) => (
            <div class="flex flex-col gap-6 max-h-[80vh] overflow-y-auto pr-2">
              <div class="bg-secondary-50 rounded-2xl p-5 border border-secondary-100 flex items-center justify-between gap-4 dark:bg-secondary-800 dark:border-secondary-800">
                <div>
                  <h3 class="font-bold text-secondary-800 text-lg dark:text-white">{detail().mahasiswa.nama}</h3>
                  <p class="text-sm text-secondary-500 dark:text-secondary-200">NIM: {detail().mahasiswa.nim}</p>
                  <Button
                    onClick={handleExportRiwayat}
                    disabled={isExportingDetail()}
                    variant="secondary"
                    class="mt-3 !px-3 !py-1.5 text-[11px] font-bold"
                  >
                    {isExportingDetail() ? 'Mengunduh...' : '📥 Ekspor Riwayat Mahasiswa (.xlsx)'}
                  </Button>
                </div>
                <div class="text-right">
                  <div class="text-xs text-secondary-400 uppercase font-semibold dark:text-secondary-200">
                    Sisa Tanggungan
                  </div>
                  <div class="text-2xl font-black text-red-600 dark:text-red-400">
                    {detail().summary.sisaKompensasi} Menit
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="flex flex-col gap-3">
                  <h4 class="font-bold text-secondary-700 border-b pb-2 text-sm dark:text-secondary-200">
                    Log Akumulasi Absensi
                  </h4>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().historyKompensasi}
                      fallback={
                        <p class="text-xs text-secondary-400 italic dark:text-secondary-200">
                          Tidak ada log absensi bermasalah.
                        </p>
                      }
                    >
                      {(log) => (
                        <div class="bg-white border border-secondary-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-start gap-3 dark:bg-secondary-900 dark:border-secondary-800">
                          <div class="flex flex-col gap-0.5 min-w-0">
                            <span class="font-bold text-secondary-700 dark:text-secondary-200">
                              {log.sumber === 'apel'
                                ? 'Presensi Apel'
                                : `${log.bapMateri || 'Perkuliahan'} (Pertemuan ${log.bapPertemuan || '-'})`}
                            </span>
                            <span class="text-secondary-400 dark:text-secondary-200">{fmtTanggal(log.bapTanggal)}</span>
                            <span class="font-semibold text-accent-600 dark:text-accent-400">
                              Status: {(log.verifiedStatus ?? log.status).toUpperCase()} ({log.durasiMangkir} Menit)
                            </span>
                            <Show when={log.keteranganAdmin}>
                              <span class="text-secondary-500 dark:text-secondary-300">
                                Catatan admin: {log.keteranganAdmin}
                              </span>
                            </Show>
                          </div>
                          <span class="font-bold text-red-600 font-mono dark:text-red-400 shrink-0">
                            +{log.poinKompensasi}m
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
                <div class="flex flex-col gap-3">
                  <div class="flex justify-between items-center border-b pb-2">
                    <h4 class="font-bold text-secondary-700 text-sm dark:text-secondary-200">
                      Log Penyelesaian Kompensasi
                    </h4>
                    <Button onClick={openAddPaymentModal} variant="success" class="!px-2.5 !py-1 text-[11px] font-bold">
                      + Input Pelunasan
                    </Button>
                  </div>
                  <div class="flex flex-col gap-2 max-h-60 overflow-y-auto">
                    <For
                      each={detail().payments}
                      fallback={
                        <p class="text-xs text-secondary-400 italic dark:text-secondary-200">
                          Belum ada penyelesaian kompensasi yang dilaporkan.
                        </p>
                      }
                    >
                      {(pay) => (
                        <div class="bg-white border border-secondary-100 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center dark:bg-secondary-900 dark:border-secondary-800">
                          <div class="flex flex-col gap-0.5">
                            <span class="font-bold text-secondary-700 dark:text-secondary-200">{pay.keterangan}</span>
                            <span class="text-secondary-400 dark:text-secondary-200">{fmtTanggal(pay.tanggal)}</span>
                          </div>
                          <div class="flex items-center gap-2">
                            <span class="font-bold text-accent-600 font-mono dark:text-accent-400">
                              -{pay.jumlahMenit}m
                            </span>
                            <Button
                              onClick={() => openEditPaymentModal(pay)}
                              variant="secondary"
                              class="!py-0.5 !px-1.5 text-[10px]"
                            >
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </For>
                  </div>
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-4 pt-4 border-t">
                <Button onClick={handleCloseDetail} variant="secondary">
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Modal>

      {/* Modal Input Payment */}
      <Modal
        isOpen={showPayModal()}
        onClose={() => setShowPayModal(false)}
        title={editingPay() ? 'Edit Penyelesaian Jam Kompensasi' : 'Input Penyelesaian Jam Kompensasi'}
      >
        <form onSubmit={handleSavePayment} class="flex flex-col gap-4">
          <Input
            type="number"
            label="Jumlah Pengurangan (Menit)"
            min="10"
            value={jumlahMenit()}
            onInput={(e) => setJumlahMenit(parseInt(e.currentTarget.value) || 60)}
            required
          />
          <Input
            type="date"
            label="Tanggal Kegiatan"
            value={tanggal()}
            onInput={(e) => setTanggal(e.currentTarget.value)}
            required
          />
          <div class="flex flex-col gap-1">
            <label class="text-sm font-semibold text-secondary-600 dark:text-secondary-200">
              Keterangan Kegiatan Kompensasi
            </label>
            <textarea
              class="w-full bg-secondary-50 border border-secondary-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700"
              rows="3"
              placeholder="Misal: Menyapu dan mengepel Lab Komputer Vokasi"
              value={keterangan()}
              onInput={(e) => setKeterangan(e.currentTarget.value)}
              required
            />
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowPayModal(false)} variant="secondary">
              Batal
            </Button>
            <Button type="submit" variant="primary">
              Simpan Pelunasan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Import CSV Modal */}
      <ImportCsvModal
        show={showImportModal()}
        onClose={() => setShowImportModal(false)}
        title="Pembayaran Kompensasi"
        importUrl="/presensi/kompensasi/bayar/import"
        templateHeaders={['nim', 'tanggal', 'jumlah_menit', 'keterangan']}
        customTemplateRows={[
          ['nim', 'tanggal', 'jumlah_menit', 'keterangan'],
          ['202301001', '2026-06-27', '480', 'Selesai kompensasi lab'],
          ['202301002', '2026-06-27', '240', 'Selesai kompensasi taman kampus'],
        ]}
        onSuccess={refetchLaporan}
      />
    </MainLayout>
  );
}
