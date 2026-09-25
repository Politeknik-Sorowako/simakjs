import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import {
  type KompensasiDetailResponse,
  type KompensasiLaporanItem,
  type KompensasiStatsResponse,
  presensiController,
} from '../../controllers/presensiController';
import { prodiController } from '../../controllers/prodiController';
import { type ExportColumn, exportToExcel, exportToExcelMultipleSheets, exportToPDF } from '../../utils/export';
import { fmtTanggal, getTodayString } from '../../utils/format';
import { printSlipKompensasi } from '../../utils/printKompensasi';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect';
import { StudentAvatar } from '../ui/StudentAvatar';
import { Table } from '../ui/Table';
import {
  DurasiText,
  EmptyState,
  ErrorState,
  FilterField,
  KpiCard,
  RefreshingBadge,
  TableLoadingFallback,
} from './shared';
import type { SharedKompensasiFilters } from './sharedKompensasiFilters';

const PER_PAGE_DEFAULT = 20;

interface TabRekapProps {
  filters: SharedKompensasiFilters;
  canManage: boolean;
}

export default function TabRekap(props: TabRekapProps) {
  const toast = useToast();

  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(PER_PAGE_DEFAULT);
  const [statusLunas, setStatusLunas] = createSignal('belum_lunas');
  const [sortBy, setSortBy] = createSignal('sisa');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  const [selectedMhsId, setSelectedMhsId] = createSignal<number | null>(null);
  const [showPayModal, setShowPayModal] = createSignal(false);
  const [payJumlah, setPayJumlah] = createSignal(60);
  const [payTanggal, setPayTanggal] = createSignal(getTodayString());
  const [payKeterangan, setPayKeterangan] = createSignal('');
  const [savingPay, setSavingPay] = createSignal(false);
  const [isExporting, setIsExporting] = createSignal(false);

  // Reset halaman ke 1 setiap filter bersama berubah (search memakai nilai ter-debounce agar satu fetch).
  createEffect(() => {
    props.filters.debouncedSearch();
    props.filters.prodiId();
    setPage(1);
  });

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [stats] = createResource(() => presensiController.getKompensasiStats());

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: props.filters.debouncedSearch(),
      prodiId: props.filters.prodiId(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
      statusLunas: statusLunas(),
    }),
    (params) =>
      presensiController.getLaporanKompensasi(
        params.page,
        params.limit,
        params.search || undefined,
        typeof params.prodiId === 'number' ? params.prodiId : undefined,
        params.sortBy,
        params.sortOrder,
        params.statusLunas,
      ),
  );

  const [mhsDetail, { refetch: refetchDetail }] = createResource(selectedMhsId, async (id) => {
    if (!id) return null;
    return presensiController.getKompensasiDetail(id);
  });

  const [statsData, setStatsData] = createSignal<KompensasiStatsResponse | null>(null);
  createEffect(() => {
    if (stats.error) return;
    const s = stats();
    if (s) setStatsData(s);
  });

  const [rows, setRows] = createSignal<KompensasiLaporanItem[]>([]);
  const [total, setTotal] = createSignal(0);
  const [totalPages, setTotalPages] = createSignal(1);

  createEffect(() => {
    if (data.error) return;
    const d = data();
    if (d) {
      setRows(d.data);
      setTotal(d.meta.total);
      setTotalPages(d.meta.totalPages);
    }
  });

  const [detailData, setDetailData] = createSignal<KompensasiDetailResponse | null>(null);
  createEffect(() => {
    if (mhsDetail.error) return;
    const d = mhsDetail();
    if (d) setDetailData(d);
  });

  const prodiOptions = (): SelectOption[] => [
    { value: '', label: 'Semua Prodi' },
    ...(prodis()?.data || []).map((p) => ({ value: p.id, label: p.nama })),
  ];

  const toggleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
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

  const openPay = (id: number) => {
    setSelectedMhsId(id);
    setPayJumlah(60);
    setPayTanggal(getTodayString());
    setPayKeterangan('');
    setShowPayModal(true);
  };

  const submitPay = async () => {
    const mhsId = selectedMhsId();
    if (!mhsId || savingPay()) return;
    setSavingPay(true);
    try {
      await presensiController.bayarKompensasi({
        mahasiswaId: mhsId,
        jumlahMenit: payJumlah(),
        tanggal: payTanggal(),
        keterangan: payKeterangan(),
      });
      toast.showToast('Pembayaran kompensasi berhasil dicatat', 'success');
      setShowPayModal(false);
      refetch();
      refetchDetail();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal menyimpan pembayaran', 'error');
    } finally {
      setSavingPay(false);
    }
  };

  const exportColumns = (): ExportColumn[] => [
    { header: 'NIM', accessor: 'nim' },
    { header: 'Nama Mahasiswa', accessor: 'nama' },
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Total Kompensasi (Menit)', accessor: 'totalKompensasi' },
    { header: 'Total Dibayar (Menit)', accessor: 'totalDibayar' },
    { header: 'Sisa Kompensasi (Menit)', accessor: 'sisaKompensasi' },
    {
      header: 'Status',
      accessor: (r: Record<string, unknown>) => (Number(r.sisaKompensasi) > 0 ? 'Belum Lunas' : 'Lunas'),
    },
  ];

  const handleExportExcel = async () => {
    if (isExporting()) return;
    setIsExporting(true);
    try {
      const res = await presensiController.getLaporanKompensasi(
        1,
        200,
        props.filters.debouncedSearch() || undefined,
        typeof props.filters.prodiId() === 'number' ? props.filters.prodiId() : undefined,
        sortBy(),
        sortOrder(),
        statusLunas(),
        true,
      );
      exportToExcel(res.data, exportColumns(), `Rekap_Kompensasi_${getTodayString()}`);
      toast.showToast('Rekap kompensasi berhasil diekspor (.xlsx)', 'success');
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengekspor data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (isExporting()) return;
    setIsExporting(true);
    try {
      const res = await presensiController.getLaporanKompensasi(
        1,
        200,
        props.filters.debouncedSearch() || undefined,
        typeof props.filters.prodiId() === 'number' ? props.filters.prodiId() : undefined,
        sortBy(),
        sortOrder(),
        statusLunas(),
        true,
      );
      const rows = res.data.map((r) => ({
        ...r,
        status: Number(r.sisaKompensasi) > 0 ? 'Belum Lunas' : 'Lunas',
      }));
      exportToPDF(
        rows,
        exportColumns(),
        `Rekap_Kompensasi_${getTodayString()}`,
        'Rekap Kompensasi Mahasiswa',
        'Sistem Informasi Akademik Vokasi',
        {
          institusi: 'Politeknik Sorowako',
          judulDokumen: 'Rekap Kompensasi Mahasiswa',
          infoLines: [`Dicetak: ${new Date().toLocaleString('id-ID')}`, `Jumlah mahasiswa: ${res.meta.total}`],
        },
      );
      toast.showToast('Rekap kompensasi berhasil diekspor (.pdf)', 'success');
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengekspor PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRiwayat = async (detail: KompensasiDetailResponse) => {
    const mhs = detail.mahasiswa;
    exportToExcelMultipleSheets(
      [
        {
          name: 'Riwayat Kompensasi',
          columns: [
            { header: 'NIM', accessor: 'nim' },
            { header: 'Nama', accessor: 'nama' },
            { header: 'Tanggal', accessor: 'bapTanggal' },
            { header: 'Sumber', accessor: 'sumber' },
            { header: 'Status', accessor: 'status' },
            { header: 'Durasi (Menit)', accessor: 'durasiMangkir' },
            { header: 'Poin (Menit)', accessor: 'poinKompensasi' },
            { header: 'Keterangan', accessor: 'keteranganAdmin' },
          ],
          data: detail.historyKompensasi.map((h) => ({
            ...h,
            nim: mhs.nim,
            nama: mhs.nama,
            sumber: h.sumber === 'perkuliahan' ? 'Perkuliahan' : h.sumber === 'apel' ? 'Apel' : 'Manual',
          })),
        },
        {
          name: 'Riwayat Pembayaran',
          columns: [
            { header: 'NIM', accessor: 'nim' },
            { header: 'Nama', accessor: 'nama' },
            { header: 'Tanggal', accessor: 'tanggal' },
            { header: 'Jumlah Menit', accessor: 'jumlahMenit' },
            { header: 'Keterangan', accessor: 'keterangan' },
          ],
          data: detail.payments.map((p) => ({ ...p, nim: mhs.nim, nama: mhs.nama })),
        },
      ],
      `Riwayat_Kompensasi_${mhs.nim}_${getTodayString()}`,
    );
    toast.showToast('Riwayat mahasiswa berhasil diekspor (.xlsx)', 'success');
  };

  const handleCetak = (detail: KompensasiDetailResponse) => {
    printSlipKompensasi(detail);
  };

  const hasData = () => rows().length > 0;

  createEffect(() => {
    if (data.error && hasData()) {
      toast.showToast('Gagal memperbarui data. Menampilkan data sebelumnya.', 'error');
    }
  });

  return (
    <div class="flex flex-col gap-4">
      <Show when={statsData()}>
        {(s) => (
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Mahasiswa Terkompensasi" value={s().summary.totalMahasiswa} />
            <KpiCard label="Total Kompensasi" value={`${s().summary.totalKompensasi} mnt`} accent="danger" />
            <KpiCard label="Total Dibayar" value={`${s().summary.totalDibayar} mnt`} accent="success" />
            <KpiCard label="Sisa Kompensasi" value={`${s().summary.totalSisa} mnt`} accent="warning" />
          </div>
        )}
      </Show>

      <div class="bg-white dark:bg-secondary-900 border border-secondary-200/80 dark:border-secondary-800 rounded-2xl p-5 shadow-card dark:shadow-card-dark flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex-1 min-w-[220px]">
            <FilterField label="Cari NIM / Nama">
              <input
                type="text"
                placeholder="Cari NIM atau nama mahasiswa..."
                class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-3.5 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-secondary-400"
                value={props.filters.search()}
                onInput={(e) => props.filters.setSearch(e.currentTarget.value)}
              />
            </FilterField>
          </div>
          <div class="min-w-[200px]">
            <FilterField label="Program Studi">
              <SearchableSelect
                options={prodiOptions()}
                value={props.filters.prodiId()}
                onChange={(v) => {
                  props.filters.setProdiId(typeof v === 'number' ? v : v === '' ? undefined : Number(v));
                  setPage(1);
                }}
                placeholder="Semua Prodi"
              />
            </FilterField>
          </div>
          <div class="min-w-[180px]">
            <FilterField label="Status">
              <SearchableSelect
                options={[
                  { value: 'belum_lunas', label: 'Belum Lunas' },
                  { value: 'lunas', label: 'Lunas' },
                  { value: '', label: 'Semua' },
                ]}
                value={statusLunas()}
                onChange={(v) => {
                  setStatusLunas(String(v));
                  setPage(1);
                }}
              />
            </FilterField>
          </div>
          <div class="flex items-end gap-2 ml-auto">
            <Button
              onClick={handleExportExcel}
              disabled={isExporting()}
              variant="success"
              class="!px-4 !py-2.5 text-xs font-bold"
            >
              {isExporting() ? 'Mengunduh...' : 'Ekspor Excel'}
            </Button>
            <Button
              onClick={handleExportPDF}
              disabled={isExporting()}
              variant="accent"
              class="!px-4 !py-2.5 text-xs font-bold"
            >
              {isExporting() ? 'Mengunduh...' : 'Ekspor PDF'}
            </Button>
          </div>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-secondary-400 dark:text-secondary-300">{total()} mahasiswa</span>
          <div class="flex items-center gap-4">
            <RefreshingBadge show={data.loading && hasData()} />
            <button
              type="button"
              onClick={() => {
                props.filters.resetShared();
                setStatusLunas('belum_lunas');
                setSortBy('sisa');
                setSortOrder('desc');
                setPage(1);
              }}
              class="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      <Table
        headers={[
          <button
            type="button"
            onClick={() => toggleSort('nama')}
            class="hover:text-brand-700 inline-flex items-center gap-1"
          >
            Mahasiswa {getSortIcon('nama')}
          </button>,
          'Program Studi',
          <button
            type="button"
            onClick={() => toggleSort('total')}
            class="hover:text-brand-700 inline-flex items-center gap-1"
          >
            Total Kompensasi {getSortIcon('total')}
          </button>,
          'Total Dibayar',
          <button
            type="button"
            onClick={() => toggleSort('sisa')}
            class="hover:text-brand-700 inline-flex items-center gap-1"
          >
            Sisa {getSortIcon('sisa')}
          </button>,
          'Aksi',
        ]}
      >
        <Show when={data.loading && !hasData()}>
          <For each={Array.from({ length: 5 })}>{() => <TableLoadingFallback cols={6} />}</For>
        </Show>
        <Show when={data.error && !hasData()}>
          <ErrorState
            message={data.error instanceof Error ? data.error.message : String(data.error)}
            onRetry={refetch}
          />
        </Show>
        <For
          each={rows()}
          fallback={
            <Show when={!data.loading && !data.error}>
              <EmptyState message="Tidak ada data rekap kompensasi." />
            </Show>
          }
        >
          {(item: KompensasiLaporanItem) => (
            <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30">
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <StudentAvatar foto={item.foto} nama={item.nama} nim={item.nim} size="sm" />
                  <div>
                    <div class="font-bold text-secondary-800 dark:text-white">{item.nama}</div>
                    <div class="text-xs text-secondary-400 dark:text-secondary-200">{item.nim}</div>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-secondary-600 dark:text-secondary-200">{item.prodiNama || '-'}</td>
              <td class="py-4 px-6">
                <span class="font-bold text-danger-600 dark:text-danger-400">{item.totalKompensasi} mnt</span>
                <span class="text-xs text-secondary-400 block">
                  (<DurasiText menit={item.totalKompensasi} />)
                </span>
              </td>
              <td class="py-4 px-6 font-bold text-success-600 dark:text-success-400">{item.totalDibayar} mnt</td>
              <td class="py-4 px-6">
                <span
                  class={`px-3 py-1 rounded-full text-xs font-extrabold ${
                    item.sisaKompensasi > 0
                      ? 'bg-danger-50 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400'
                      : 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                  }`}
                >
                  {item.sisaKompensasi} mnt
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center gap-2 flex-wrap">
                  <Button
                    onClick={() => setSelectedMhsId(item.id)}
                    variant="primary"
                    class="!px-3 !py-1 text-xs font-bold"
                  >
                    Riwayat
                  </Button>
                  <Show when={props.canManage}>
                    <Button onClick={() => openPay(item.id)} variant="success" class="!px-3 !py-1 text-xs font-bold">
                      Bayar
                    </Button>
                  </Show>
                  <Button
                    onClick={() => setSelectedMhsId(item.id)}
                    variant="ghost"
                    class="!px-3 !py-1 text-xs font-bold"
                  >
                    Cetak
                  </Button>
                </div>
              </td>
            </tr>
          )}
        </For>
      </Table>

      <Pagination
        currentPage={page()}
        totalPages={totalPages()}
        total={total()}
        limit={limit()}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      {/* Modal Detail Riwayat */}
      <Modal
        isOpen={selectedMhsId() !== null && !showPayModal()}
        onClose={() => setSelectedMhsId(null)}
        title="Detail Riwayat Jam Kompensasi"
        maxWidth="xl"
      >
        <SuspenseDetail
          detail={detailData()}
          error={mhsDetail.error}
          onRetry={refetchDetail}
          onExport={handleExportRiwayat}
          onCetak={handleCetak}
          canManage={props.canManage}
          onBayar={openPay}
        />
      </Modal>

      {/* Modal Input Pembayaran */}
      <Modal isOpen={showPayModal()} onClose={() => setShowPayModal(false)} title="Input Pembayaran Jam Kompensasi">
        <div class="flex flex-col gap-4">
          <Show when={detailData()}>
            {(d) => (
              <div class="text-sm text-secondary-500 dark:text-secondary-300">
                {d().mahasiswa.nama} · {d().mahasiswa.nim} — Sisa {d().summary.sisaKompensasi} menit
              </div>
            )}
          </Show>
          <FilterField label="Jumlah Menit">
            <Input
              type="number"
              min="1"
              value={payJumlah()}
              onInput={(e) => setPayJumlah(parseInt(e.currentTarget.value) || 0)}
            />
          </FilterField>
          <FilterField label="Tanggal Pembayaran">
            <Input type="date" value={payTanggal()} onInput={(e) => setPayTanggal(e.currentTarget.value)} />
          </FilterField>
          <div class="flex flex-col gap-1">
            <label class="text-fine font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
              Keterangan Kegiatan
            </label>
            <textarea
              rows="3"
              class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-4 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Misal: Membersihkan Laboratorium Komputer"
              value={payKeterangan()}
              onInput={(e) => setPayKeterangan(e.currentTarget.value)}
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button onClick={() => setShowPayModal(false)} variant="secondary">
              Batal
            </Button>
            <Button onClick={submitPay} loading={savingPay()} variant="primary">
              Simpan
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SuspenseDetail(props: {
  detail: KompensasiDetailResponse | null | undefined;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  onExport: (d: KompensasiDetailResponse) => void;
  onCetak: (d: KompensasiDetailResponse) => void;
  onBayar: (id: number) => void;
  canManage: boolean;
}) {
  const d = () => props.detail;
  return (
    <Show
      when={d()}
      fallback={
        <div class="p-6 text-center">
          <Show
            when={!props.error}
            fallback={
              <div class="flex flex-col items-center gap-3">
                <div class="text-danger-600 dark:text-danger-400 font-bold text-sm">Gagal memuat riwayat</div>
                <div class="text-xs text-secondary-400 dark:text-secondary-200 max-w-md break-words">
                  {props.error instanceof Error ? props.error.message : String(props.error)}
                </div>
                <Button onClick={props.onRetry} variant="secondary" class="!px-4 !py-1.5 text-xs font-bold">
                  Coba Lagi
                </Button>
              </div>
            }
          >
            <div class="text-secondary-400 dark:text-secondary-200">Memuat riwayat...</div>
          </Show>
        </div>
      }
    >
      {(detail) => (
        <div class="flex flex-col gap-5 max-h-[78vh] overflow-y-auto pr-2">
          <div class="bg-secondary-50 dark:bg-secondary-800 rounded-2xl p-5 border border-secondary-100 dark:border-secondary-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <StudentAvatar
                foto={detail().mahasiswa.foto}
                nama={detail().mahasiswa.nama}
                nim={detail().mahasiswa.nim}
                size="lg"
              />
              <div>
                <h3 class="font-bold text-secondary-800 text-lg dark:text-white">{detail().mahasiswa.nama}</h3>
                <p class="text-sm text-secondary-500 dark:text-secondary-200">NIM: {detail().mahasiswa.nim}</p>
                <div class="flex items-center gap-2 mt-2 flex-wrap">
                  <Button
                    onClick={() => props.onExport(detail())}
                    variant="secondary"
                    class="!px-3 !py-1.5 text-[11px] font-bold"
                  >
                    Ekspor Excel
                  </Button>
                  <Button
                    onClick={() => props.onCetak(detail())}
                    variant="accent"
                    class="!px-3 !py-1.5 text-[11px] font-bold"
                  >
                    Cetak Slip
                  </Button>
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-secondary-400 uppercase font-semibold dark:text-secondary-200">
                Sisa Kompensasi
              </div>
              <div
                class={`px-3 py-1 rounded-full text-xl font-black inline-block mt-1 ${
                  detail().summary.sisaKompensasi > 0
                    ? 'bg-danger-50 text-danger-600 dark:bg-danger-900/30 dark:text-danger-400'
                    : 'bg-success-50 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                }`}
              >
                {detail().summary.sisaKompensasi} mnt
              </div>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-3">
              <div class="flex justify-between items-center border-b pb-2">
                <h4 class="font-bold text-secondary-700 text-sm dark:text-secondary-200">Riwayat Kompensasi</h4>
                <Show when={props.canManage}>
                  <Button
                    onClick={() => props.onBayar(detail().mahasiswa.id)}
                    variant="success"
                    class="!px-2.5 !py-1 text-[11px] font-bold"
                  >
                    + Input Pembayaran
                  </Button>
                </Show>
              </div>
              <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
                <For
                  each={detail().historyKompensasi}
                  fallback={
                    <p class="text-xs text-secondary-400 italic dark:text-secondary-200">
                      Tidak ada riwayat kompensasi.
                    </p>
                  }
                >
                  {(log) => (
                    <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-xl p-3 shadow-xs text-xs flex justify-between items-start gap-3">
                      <div class="flex flex-col gap-0.5 min-w-0">
                        <span class="font-bold text-secondary-700 dark:text-secondary-200">
                          {log.sumber === 'apel'
                            ? 'Presensi Apel'
                            : `${log.bapMateri || 'Perkuliahan'} (Pertemuan ${log.bapPertemuan || '-'})`}
                        </span>
                        <span class="text-secondary-400 dark:text-secondary-200">{fmtTanggal(log.bapTanggal)}</span>
                        <span class="font-semibold text-accent-600 dark:text-accent-400">
                          Status: {(log.verifiedStatus ?? log.status).toUpperCase()} ({log.durasiMangkir} mnt)
                        </span>
                        <Show when={log.keteranganAdmin}>
                          <span class="text-secondary-500 dark:text-secondary-300">Catatan: {log.keteranganAdmin}</span>
                        </Show>
                      </div>
                      <span class="font-bold text-danger-600 font-mono dark:text-danger-400 shrink-0">
                        +{log.poinKompensasi}m
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
            <div class="flex flex-col gap-3">
              <h4 class="font-bold text-secondary-700 border-b pb-2 text-sm dark:text-secondary-200">
                Riwayat Pembayaran
              </h4>
              <div class="flex flex-col gap-2 max-h-64 overflow-y-auto">
                <For
                  each={detail().payments}
                  fallback={
                    <p class="text-xs text-secondary-400 italic dark:text-secondary-200">Belum ada pembayaran.</p>
                  }
                >
                  {(pay) => (
                    <div class="bg-white dark:bg-secondary-900 border border-secondary-100 dark:border-secondary-800 rounded-xl p-3 shadow-xs text-xs flex justify-between items-center">
                      <div class="flex flex-col gap-0.5">
                        <span class="font-bold text-secondary-700 dark:text-secondary-200">{pay.keterangan}</span>
                        <span class="text-secondary-400 dark:text-secondary-200">{fmtTanggal(pay.tanggal)}</span>
                      </div>
                      <span class="font-bold text-success-600 font-mono dark:text-success-400">
                        -{pay.jumlahMenit}m
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      )}
    </Show>
  );
}
