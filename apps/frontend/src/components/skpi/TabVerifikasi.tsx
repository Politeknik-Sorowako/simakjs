import { createResource, createSignal, For, Index, onCleanup, Show } from 'solid-js';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { prodiController } from '../../controllers/prodiController';
import {
  type SkpiImportResult,
  type SkpiKegiatan,
  type SkpiStatus,
  skpiController,
} from '../../controllers/skpiController';
import { systemController } from '../../controllers/systemController';
import { usePagination } from '../../hooks/usePagination';
import { type ExportColumn, exportToExcel, exportToPDF } from '../../utils/export';
import { fmtTanggal, getTodayString } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect';

const STATUS_LABEL: Record<SkpiStatus, string> = {
  pending: 'Menunggu Verifikasi',
  diverifikasi: 'Terverifikasi',
  ditolak: 'Ditolak',
};

const STATUS_VARIANT: Record<SkpiStatus, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  diverifikasi: 'success',
  ditolak: 'danger',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Menunggu Verifikasi' },
  { value: 'diverifikasi', label: 'Terverifikasi' },
  { value: 'ditolak', label: 'Ditolak' },
  { value: '', label: 'Semua Status' },
];

export default function TabVerifikasi() {
  const auth = useAuth();
  const toast = useToast();
  // Koreksi pasca-verifikasi (Batalkan & Edit Hasil) + impor CSV: staff-verifier
  // saja; dosen PA tetap hanya verifikasi (pola backend).
  const isStaffVerifier = () => auth.hasRole(['super_admin', 'admin', 'prodi', 'kaprodi', 'kemahasiswaan']);

  // ── Seleksi massal (approve) — baris pending saja yang bisa dicentang ──────
  const [selectedIds, setSelectedIds] = createSignal<Set<number>>(new Set());
  const pendingRows = () => (list.latest?.data ?? []).filter((r) => r.status === 'pending');
  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };
  const toggleSelectAllPending = () => {
    const pending = pendingRows();
    const allSelected = pending.length > 0 && pending.every((r) => selectedIds().has(r.id));
    const next = new Set(selectedIds());
    for (const r of pending) {
      if (allSelected) next.delete(r.id);
      else next.add(r.id);
    }
    setSelectedIds(next);
  };
  const allPendingSelected = () => {
    const pending = pendingRows();
    return pending.length > 0 && pending.every((r) => selectedIds().has(r.id));
  };

  const pagination = usePagination(10);
  const [statusFilter, setStatusFilter] = createSignal('pending');
  const [kategoriFilter, setKategoriFilter] = createSignal(0);
  const [prodiFilter, setProdiFilter] = createSignal(0);
  const [mahasiswaFilter, setMahasiswaFilter] = createSignal<number | null>(null);
  const [mhsOptions, setMhsOptions] = createSignal<SelectOption[]>([]);
  const [mhsSearching, setMhsSearching] = createSignal(false);
  let mhsTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(mhsTimer));

  const searchMahasiswa = (q: string) => {
    clearTimeout(mhsTimer);
    setMhsSearching(true);
    mhsTimer = setTimeout(async () => {
      try {
        const res = await mahasiswaController.getAll(q || undefined, 1, 25, undefined, { allStudents: true });
        setMhsOptions(
          res.data.map((m) => ({
            value: m.id,
            label: `${m.nim} — ${m.nama}${m.programStudi?.nama ? ` (${m.programStudi.nama})` : ''}`,
          })),
        );
      } catch {
        setMhsOptions([]);
      } finally {
        setMhsSearching(false);
      }
    }, 300);
  };

  const [kategoriList] = createResource(() => skpiController.getKategori());
  // Daftar prodi untuk filter; hanya ditampilkan bila >1 (staf satu prodi tidak terganggu).
  const [prodiList] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [list, { refetch }] = createResource(
    () => ({
      page: pagination.page(),
      limit: pagination.limit(),
      status: statusFilter(),
      kategoriId: kategoriFilter(),
      prodiId: prodiFilter(),
      mahasiswaId: mahasiswaFilter(),
      search: pagination.search(),
    }),
    (p) =>
      skpiController.getAll({
        page: p.page,
        limit: p.limit,
        status: p.status || undefined,
        kategoriId: p.kategoriId || undefined,
        prodiId: p.prodiId || undefined,
        mahasiswaId: p.mahasiswaId ?? undefined,
        search: p.search || undefined,
      }),
  );

  const kategoriOptions = () => [
    { value: 0, label: 'Semua Kategori' },
    ...(kategoriList()?.data ?? []).map((k) => ({ value: k.id, label: k.nama })),
  ];

  // ── Ekspor rekap rekaman (US-8) — mengikuti filter aktif, seluruh halaman ─
  const [isExporting, setIsExporting] = createSignal(false);

  const exportColumns = (): ExportColumn[] => [
    { header: 'NIM', accessor: (r: SkpiKegiatan) => r.mahasiswa?.nim ?? '-' },
    { header: 'Nama Mahasiswa', accessor: (r: SkpiKegiatan) => r.mahasiswa?.nama ?? '-' },
    { header: 'Kategori', accessor: (r: SkpiKegiatan) => r.kategori?.nama ?? '-' },
    { header: 'Nama Kegiatan', accessor: 'namaKegiatan' },
    { header: 'Penyelenggara', accessor: 'penyelenggara' },
    { header: 'Tanggal Mulai', accessor: 'tanggalMulai' },
    { header: 'Tanggal Selesai', accessor: 'tanggalSelesai' },
    { header: 'Nomor Sertifikat', accessor: 'nomorSertifikat' },
    { header: 'Status', accessor: (r: SkpiKegiatan) => STATUS_LABEL[r.status] ?? r.status },
    { header: 'Poin', accessor: 'poin' },
    { header: 'Catatan Verifikator', accessor: 'catatanVerifikator' },
  ];

  const fetchAllFiltered = async (): Promise<SkpiKegiatan[]> => {
    const all: SkpiKegiatan[] = [];
    let p = 1;
    const limitP = 100;
    for (;;) {
      const res = await skpiController.getAll({
        page: p,
        limit: limitP,
        status: statusFilter() || undefined,
        kategoriId: kategoriFilter() || undefined,
        prodiId: prodiFilter() || undefined,
        mahasiswaId: mahasiswaFilter() ?? undefined,
        search: pagination.search() || undefined,
      });
      all.push(...res.data);
      if (p * limitP >= res.meta.total) break;
      p += 1;
      // Batas pengaman 50 halaman (5.000 baris).
      if (p > 50) break;
    }
    return all;
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (isExporting()) return;
    setIsExporting(true);
    try {
      const data = await fetchAllFiltered();
      if (data.length === 0) {
        toast.showToast('Tidak ada data untuk diekspor', 'info');
        return;
      }
      const kopGlobal = await systemController.getKop().catch(() => null);
      const filename = `Rekap_Verifikasi_SKPI_${getTodayString()}`;
      if (format === 'excel') {
        exportToExcel(data, exportColumns(), filename);
        toast.showToast('Rekap verifikasi SKPI berhasil diekspor (.xlsx)', 'success');
      } else {
        exportToPDF(data, exportColumns(), filename, 'Rekap Verifikasi SKPI', 'Sistem Informasi Akademik Vokasi', {
          institusi: kopGlobal?.nama || 'POLITEKNIK SOROWAKO',
          alamat: kopGlobal?.alamat?.[0],
          judulDokumen: 'Rekap Verifikasi SKPI',
          infoLines: [`Diekspor: ${new Date().toLocaleDateString('id-ID')}`, `Jumlah baris: ${data.length}`],
        });
        toast.showToast('Rekap verifikasi SKPI berhasil diekspor (.pdf)', 'success');
      }
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengekspor data', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Modal detail rekaman ──────────────────────────────────────────────────
  const [detail, setDetail] = createSignal<SkpiKegiatan | null>(null);

  const openDetail = async (row: SkpiKegiatan) => {
    try {
      const full = await skpiController.getById(row.id);
      setDetail(full);
    } catch {
      setDetail(row);
    }
  };

  const handleOpenLampiran = async (row: SkpiKegiatan) => {
    const lampiran = row.lampiran?.[0];
    if (!lampiran) return;
    try {
      await skpiController.openLampiran(row.id, lampiran.id);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal membuka lampiran.', 'error');
    }
  };

  // ── Modal aksi approve / reject ───────────────────────────────────────────
  const [actionTarget, setActionTarget] = createSignal<SkpiKegiatan | null>(null);
  const [actionType, setActionType] = createSignal<'approve' | 'reject'>('approve');
  const [catatan, setCatatan] = createSignal('');
  const [poinOverride, setPoinOverride] = createSignal('');
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [actionError, setActionError] = createSignal('');

  const openAction = (row: SkpiKegiatan, type: 'approve' | 'reject') => {
    setActionTarget(row);
    setActionType(type);
    setCatatan('');
    setPoinOverride(String(row.poin));
    setActionError('');
  };

  const closeAction = () => {
    setActionTarget(null);
    setCatatan('');
    setActionError('');
  };

  const handleVerify = async (e: Event) => {
    e.preventDefault();
    const row = actionTarget();
    if (!row) return;

    const trimmed = catatan().trim();
    if (actionType() === 'reject' && !trimmed) {
      setActionError('Catatan wajib diisi saat menolak rekaman.');
      return;
    }

    setIsSubmitting(true);
    setActionError('');
    try {
      await skpiController.verify(row.id, {
        action: actionType(),
        catatan: trimmed || undefined,
        poin: actionType() === 'approve' && poinOverride() ? Number(poinOverride()) : undefined,
      });
      toast.showToast(
        actionType() === 'approve' ? 'Rekaman kegiatan disetujui' : 'Rekaman kegiatan ditolak',
        actionType() === 'approve' ? 'success' : 'info',
      );
      closeAction();
      setDetail(null);
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Gagal memverifikasi rekaman.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
  };

  // ── Koreksi pasca-verifikasi (staff-verifier) ─────────────────────────────
  const [unverifyTarget, setUnverifyTarget] = createSignal<SkpiKegiatan | null>(null);
  const [unverifyBusy, setUnverifyBusy] = createSignal(false);

  const handleUnverify = async () => {
    const row = unverifyTarget();
    if (!row) return;
    setUnverifyBusy(true);
    try {
      await skpiController.unverify(row.id);
      toast.showToast('Hasil verifikasi dibatalkan — rekaman kembali menunggu verifikasi', 'success');
      setUnverifyTarget(null);
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal membatalkan hasil verifikasi.', 'error');
    } finally {
      setUnverifyBusy(false);
    }
  };

  const [editHasilTarget, setEditHasilTarget] = createSignal<SkpiKegiatan | null>(null);
  const [editPoin, setEditPoin] = createSignal(0);
  const [editCatatan, setEditCatatan] = createSignal('');
  const [editHasilBusy, setEditHasilBusy] = createSignal(false);
  const [editHasilError, setEditHasilError] = createSignal('');

  const openEditHasil = (row: SkpiKegiatan) => {
    setEditHasilTarget(row);
    setEditPoin(row.poin);
    setEditCatatan(row.catatanVerifikator ?? '');
    setEditHasilError('');
  };

  const handleEditHasilSave = async (e: Event) => {
    e.preventDefault();
    const row = editHasilTarget();
    if (!row) return;
    if (editPoin() < 0) {
      setEditHasilError('Poin tidak boleh negatif.');
      return;
    }
    setEditHasilBusy(true);
    setEditHasilError('');
    try {
      // `catatan` selalu dikirim (string kosong → null di backend) agar
      // pengosongan catatan berlaku, bukan diabaikan.
      await skpiController.editHasilVerifikasi(row.id, { poin: editPoin(), catatan: editCatatan().trim() });
      toast.showToast('Hasil verifikasi diperbarui', 'success');
      setEditHasilTarget(null);
      refetch();
    } catch (err: unknown) {
      setEditHasilError(err instanceof Error ? err.message : 'Gagal mengedit hasil verifikasi.');
    } finally {
      setEditHasilBusy(false);
    }
  };

  // ── Approve massal (checkbox + Setujui Terpilih) ──────────────────────────
  // Penolakan massal tidak disediakan: reject mewajibkan catatan per rekaman.
  // Poin mengikuti nilai rekaman saat ini; koreksi poin bisa via Edit Hasil.
  const [showBulkModal, setShowBulkModal] = createSignal(false);
  const [bulkBusy, setBulkBusy] = createSignal(false);

  const handleBulkApprove = async () => {
    const ids = [...selectedIds()];
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await skpiController.verifyBulk(ids);
      setSelectedIds(new Set<number>());
      setShowBulkModal(false);
      toast.showToast(
        res.failedCount > 0
          ? `${res.approvedCount} rekaman disetujui, ${res.failedCount} dilewati`
          : `${res.approvedCount} rekaman disetujui`,
        res.failedCount > 0 ? 'info' : 'success',
      );
      if (res.failedCount > 0 && res.failed.length > 0) {
        toast.showToast(res.failed[0].error, 'error');
      }
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal memverifikasi massal.', 'error');
    } finally {
      setBulkBusy(false);
    }
  };

  // ── Impor CSV daftar kegiatan (staff-verifier; hasil pending) ─────────────
  const [showImportModal, setShowImportModal] = createSignal(false);
  const [importFile, setImportFile] = createSignal<File | null>(null);
  const [importBusy, setImportBusy] = createSignal(false);
  const [importResult, setImportResult] = createSignal<SkpiImportResult | null>(null);
  let importInputRef: HTMLInputElement | undefined;

  const downloadTemplate = () => {
    const kategoriNama = kategoriList()?.data?.find((k) => k.isAktif)?.nama ?? 'Pelatihan';
    const csv = [
      'nim,nama_kategori,nama_kegiatan,tanggal_mulai,tanggal_selesai,penyelenggara,lokasi,nomor_sertifikat,deskripsi',
      `20240001,${kategoriNama},Contoh Pelatihan Jaringan,2026-03-01,2026-03-02,Politeknik Sorowako,Aula,SRT-001,Uraian singkat`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-impor-kegiatan-skpi.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async () => {
    const file = importFile();
    if (!file) return;
    setImportBusy(true);
    setImportResult(null);
    try {
      const res = await skpiController.importKegiatan(file);
      setImportResult(res);
      setImportFile(null);
      if (importInputRef) importInputRef.value = '';
      toast.showToast(
        `Impor selesai: ${res.successCount} rekaman masuk (menunggu verifikasi)`,
        res.errors.length > 0 ? 'info' : 'success',
      );
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal mengimpor CSV.', 'error');
    } finally {
      setImportBusy(false);
    }
  };

  const openImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  return (
    <>
      <div class="flex flex-col gap-6">
        <div class="bg-white p-6 rounded-2xl border border-secondary-100 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">Verifikasi SKPI</h1>
              <p class="text-sm text-secondary-500">
                Setujui atau tolak rekaman pencapaian kegiatan mahasiswa. Rekaman yang disetujui menjadi isi dokumen
                SKPI yang dapat dicetak dan ditandatangani.
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <Show when={isStaffVerifier()}>
                <Button variant="secondary" onClick={openImportModal}>
                  Impor CSV
                </Button>
              </Show>
              <Show when={selectedIds().size > 0}>
                <Button variant="success" onClick={() => setShowBulkModal(true)}>
                  Setujui Terpilih ({selectedIds().size})
                </Button>
              </Show>
            </div>
          </div>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="relative flex-1 w-full">
              <span class="absolute left-3.5 top-2.5 text-secondary-400">🔍</span>
              <input
                type="text"
                placeholder="Cari nama kegiatan / penyelenggara / NIM / nama mahasiswa..."
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-action-focus dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={pagination.search()}
                onInput={(e) => {
                  pagination.setSearch(e.currentTarget.value);
                  pagination.resetPage();
                }}
              />
            </div>
            <select
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value);
                pagination.resetPage();
              }}
              class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
            >
              <For each={STATUS_OPTIONS}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
            </select>
            <select
              value={kategoriFilter()}
              onChange={(e) => {
                setKategoriFilter(Number(e.currentTarget.value));
                pagination.resetPage();
              }}
              class="rounded-xl border border-secondary-200 bg-white px-3 py-2 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
            >
              <For each={kategoriOptions()}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
            </select>
          </div>

          {/* Filter per mahasiswa & prodi — backend memvalidasi lingkup per peran. */}
          <div class="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div class="sm:w-80">
              <SearchableSelect
                label="Mahasiswa"
                placeholder="Ketik NIM / nama untuk mencari..."
                options={mhsOptions()}
                value={mahasiswaFilter()}
                onSearch={searchMahasiswa}
                isLoading={mhsSearching()}
                onChange={(v) => {
                  setMahasiswaFilter(Number(v));
                  pagination.resetPage();
                }}
              />
            </div>
            <Show when={(prodiList()?.data?.length ?? 0) > 1}>
              <select
                value={prodiFilter()}
                onChange={(e) => {
                  setProdiFilter(Number(e.currentTarget.value));
                  pagination.resetPage();
                }}
                class="rounded-xl border border-secondary-200 bg-white px-3 py-2.5 text-xs text-secondary-700 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
              >
                <option value={0}>Semua Prodi</option>
                <For each={prodiList()?.data ?? []}>{(p) => <option value={p.id}>{p.nama}</option>}</For>
              </select>
            </Show>
            <Show when={mahasiswaFilter() || prodiFilter()}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMahasiswaFilter(null);
                  setProdiFilter(0);
                  pagination.resetPage();
                }}
              >
                Reset Filter
              </Button>
            </Show>
            <div class="flex items-center gap-2 sm:ml-auto">
              <Button variant="secondary" size="sm" disabled={isExporting()} onClick={() => handleExport('excel')}>
                {isExporting() ? 'Mengunduh...' : 'Ekspor Excel'}
              </Button>
              <Button variant="secondary" size="sm" disabled={isExporting()} onClick={() => handleExport('pdf')}>
                {isExporting() ? '...' : 'Ekspor PDF'}
              </Button>
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                  <th class="p-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPendingSelected()}
                      onChange={toggleSelectAllPending}
                      class="w-4 h-4 rounded border-secondary-300 text-action focus:ring-action-focus"
                      title="Pilih semua rekaman menunggu verifikasi di halaman ini"
                    />
                  </th>
                  <th class="p-3">Mahasiswa</th>
                  <th class="p-3">Kegiatan</th>
                  <th class="p-3">Tanggal</th>
                  <th class="p-3 text-center">Poin</th>
                  <th class="p-3">Status</th>
                  <th class="p-3">Lampiran</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                <Show
                  when={!list.loading}
                  fallback={
                    <tr>
                      <td colspan={8} class="p-8 text-center text-secondary-400">
                        Memuat data...
                      </td>
                    </tr>
                  }
                >
                  <For
                    each={list()?.data ?? []}
                    fallback={
                      <tr>
                        <td colspan={8} class="p-8 text-center text-secondary-400">
                          Tidak ada rekaman untuk difilter.
                        </td>
                      </tr>
                    }
                  >
                    {(row) => (
                      <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                        <td class="p-3">
                          <Show
                            when={row.status === 'pending'}
                            fallback={<span class="inline-block w-4 h-4" aria-hidden />}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds().has(row.id)}
                              onChange={() => toggleSelect(row.id)}
                              class="w-4 h-4 rounded border-secondary-300 text-action focus:ring-action-focus"
                              aria-label={`Pilih rekaman ${row.namaKegiatan}`}
                            />
                          </Show>
                        </td>
                        <td class="p-3">
                          <p class="font-bold text-secondary-800 dark:text-white">{row.mahasiswa?.nama ?? '-'}</p>
                          <p class="text-[11px] text-secondary-400">
                            {row.mahasiswa?.nim ?? '-'}
                            <Show when={row.mahasiswa?.programStudi?.nama}>{(p) => <> • {p()}</>}</Show>
                          </p>
                        </td>
                        <td class="p-3 max-w-[240px]">
                          <p class="font-bold text-secondary-800 dark:text-white">{row.namaKegiatan}</p>
                          <p class="text-[11px] text-secondary-400">{row.kategori?.nama ?? '-'}</p>
                        </td>
                        <td class="p-3">
                          {fmtTanggal(row.tanggalMulai)}
                          <Show when={row.tanggalSelesai}>
                            {(s) => <span class="text-secondary-400"> – {fmtTanggal(s())}</span>}
                          </Show>
                        </td>
                        <td class="p-3 text-center font-bold">{row.poin}</td>
                        <td class="p-3">
                          <Badge variant={STATUS_VARIANT[row.status]} size="sm">
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        </td>
                        <td class="p-3">
                          <Show when={row.lampiran?.length} fallback={<span class="text-secondary-300">—</span>}>
                            <button
                              type="button"
                              onClick={() => handleOpenLampiran(row)}
                              class="text-action hover:underline font-medium"
                            >
                              Lihat
                            </button>
                          </Show>
                        </td>
                        <td class="p-3">
                          <div class="flex items-center justify-center gap-1.5">
                            <Button variant="secondary" size="sm" onClick={() => openDetail(row)}>
                              Detail
                            </Button>
                            <Show when={row.status === 'pending'}>
                              <Button variant="success" size="sm" onClick={() => openAction(row, 'approve')}>
                                Setujui
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => openAction(row, 'reject')}>
                                Tolak
                              </Button>
                            </Show>
                            <Show when={isStaffVerifier() && row.status === 'diverifikasi'}>
                              <Button variant="secondary" size="sm" onClick={() => openEditHasil(row)}>
                                Edit Hasil
                              </Button>
                            </Show>
                            <Show
                              when={isStaffVerifier() && (row.status === 'diverifikasi' || row.status === 'ditolak')}
                            >
                              <Button variant="secondary" size="sm" onClick={() => setUnverifyTarget(row)}>
                                Batalkan
                              </Button>
                            </Show>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </Show>
              </tbody>
            </table>
          </div>

          <Show when={list.latest}>
            {(page) => (
              <Pagination
                currentPage={page().meta.page}
                totalPages={page().meta.totalPages}
                total={page().meta.total}
                limit={page().meta.limit}
                onPageChange={pagination.setPage}
                onLimitChange={pagination.setLimit}
              />
            )}
          </Show>
        </div>
      </div>

      {/* Modal detail */}
      <Modal show={detail() !== null} onClose={() => setDetail(null)} title="Detail Rekaman Kegiatan" maxWidth="lg">
        <Show when={detail()}>
          {(row) => (
            <div class="flex flex-col gap-4 text-sm">
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p class="text-secondary-400 uppercase tracking-wider font-bold">Mahasiswa</p>
                  <p class="font-bold text-secondary-800 dark:text-white">{row().mahasiswa?.nama ?? '-'}</p>
                  <p class="text-secondary-500">
                    {row().mahasiswa?.nim ?? '-'}
                    <Show when={row().mahasiswa?.programStudi?.nama}>{(p) => <> • {p()}</>}</Show>
                  </p>
                </div>
                <div>
                  <p class="text-secondary-400 uppercase tracking-wider font-bold">Status</p>
                  <Badge variant={STATUS_VARIANT[row().status]}>{STATUS_LABEL[row().status]}</Badge>
                  <Show when={row().verifiedBy?.nama}>
                    {(v) => <p class="mt-1 text-secondary-500">Diverifikasi: {v()}</p>}
                  </Show>
                </div>
              </div>

              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60 text-xs space-y-2">
                <p>
                  <span class="text-secondary-400">Kegiatan: </span>
                  <span class="font-bold text-secondary-800 dark:text-white">{row().namaKegiatan}</span>
                </p>
                <p>
                  <span class="text-secondary-400">Kategori: </span>
                  {row().kategori?.nama ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Penyelenggara: </span>
                  {row().penyelenggara ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Tanggal: </span>
                  {fmtTanggal(row().tanggalMulai)}
                  <Show when={row().tanggalSelesai}>{(s) => <> – {fmtTanggal(s())}</>}</Show>
                </p>
                <p>
                  <span class="text-secondary-400">Lokasi: </span>
                  {row().lokasi ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Nomor Sertifikat: </span>
                  {row().nomorSertifikat ?? '-'}
                </p>
                <p>
                  <span class="text-secondary-400">Poin: </span>
                  <span class="font-bold">{row().poin}</span>
                </p>
                <Show when={row().deskripsi}>
                  {(d) => (
                    <p>
                      <span class="text-secondary-400">Deskripsi: </span>
                      {d()}
                    </p>
                  )}
                </Show>
              </div>

              <Show when={row().catatanVerifikator}>
                {(c) => (
                  <div class="rounded-xl bg-danger-50 border border-danger-200 p-3 text-xs text-danger-700 dark:bg-danger-950/30 dark:border-danger-900 dark:text-danger-300">
                    <p class="font-bold">Catatan Verifikator:</p>
                    <p class="mt-1">{c()}</p>
                  </div>
                )}
              </Show>

              <div class="rounded-xl border border-secondary-200 p-4 dark:border-secondary-700">
                <p class="text-xs font-bold text-secondary-700 dark:text-secondary-300">Lampiran Sertifikat</p>
                <Show
                  when={row().lampiran?.length}
                  fallback={<p class="mt-2 text-xs text-secondary-400">Belum ada lampiran.</p>}
                >
                  <For each={row().lampiran ?? []}>
                    {(lampiran) => (
                      <div class="mt-2 flex items-center justify-between rounded-lg bg-secondary-50 p-2.5 dark:bg-secondary-800/60">
                        <div class="overflow-hidden">
                          <p class="text-xs font-medium text-secondary-800 dark:text-white truncate">
                            {lampiran.fileName}
                          </p>
                          <p class="text-[11px] text-secondary-400">{formatBytes(lampiran.fileSize)}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleOpenLampiran(row())}>
                          Buka
                        </Button>
                      </div>
                    )}
                  </For>
                </Show>
              </div>
            </div>
          )}
        </Show>
      </Modal>

      {/* Modal approve / reject */}
      <Modal
        show={actionTarget() !== null}
        onClose={closeAction}
        title={actionType() === 'approve' ? 'Setujui Rekaman Kegiatan' : 'Tolak Rekaman Kegiatan'}
      >
        <form onSubmit={handleVerify} class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            {actionType() === 'approve'
              ? 'Rekaman yang disetujui menjadi bagian dari dokumen SKPI mahasiswa dan tidak dapat diubah lagi.'
              : 'Rekaman ditolak dan dikembalikan ke mahasiswa untuk diperbaiki. Catatan wajib diisi.'}
            <br />
            <b>{actionTarget()?.namaKegiatan}</b> — {actionTarget()?.mahasiswa?.nama} ({actionTarget()?.mahasiswa?.nim})
          </p>

          <Show when={actionType() === 'approve'}>
            <Input
              label="Poin Kegiatan"
              type="number"
              min={0}
              value={poinOverride()}
              onInput={(e) => setPoinOverride(e.currentTarget.value)}
            />
          </Show>

          <div class="flex flex-col gap-1">
            <label class="text-caption font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
              Catatan {actionType() === 'reject' ? '(wajib)' : '(opsional)'}
            </label>
            <textarea
              rows="3"
              placeholder={
                actionType() === 'reject'
                  ? 'Alasan penolakan — misal: bukti sertifikat tidak terbaca.'
                  : 'Catatan persetujuan (opsional)...'
              }
              value={catatan()}
              onInput={(e) => setCatatan(e.currentTarget.value)}
              class="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-table text-secondary-800 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-action-focus/20 focus:border-action resize-none dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
            />
          </div>

          <Show when={actionError()}>
            {(err) => (
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {err()}
              </div>
            )}
          </Show>

          <div class="flex justify-end gap-3 border-t pt-4 mt-2">
            <Button type="button" variant="secondary" onClick={closeAction} disabled={isSubmitting()}>
              Batal
            </Button>
            <Button type="submit" variant={actionType() === 'approve' ? 'success' : 'danger'} disabled={isSubmitting()}>
              {isSubmitting() ? 'Memproses...' : actionType() === 'approve' ? 'Setujui Rekaman' : 'Tolak Rekaman'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal konfirmasi batalkan hasil verifikasi */}
      <Modal show={unverifyTarget() !== null} onClose={() => setUnverifyTarget(null)} title="Batalkan Hasil Verifikasi">
        <div class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            Rekaman akan kembali berstatus <b>Menunggu Verifikasi</b>; catatan &amp; metadata verifikator dihapus.
            Dokumen SKPI yang sudah ditandatangani akan diganti saat penerbitan ulang.
            <br />
            <b>{unverifyTarget()?.namaKegiatan}</b> — {unverifyTarget()?.mahasiswa?.nama} (
            {unverifyTarget()?.mahasiswa?.nim})
          </p>
          <div class="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setUnverifyTarget(null)} disabled={unverifyBusy()}>
              Batal
            </Button>
            <Button variant="danger" onClick={handleUnverify} disabled={unverifyBusy()}>
              {unverifyBusy() ? 'Memproses...' : 'Ya, Batalkan Verifikasi'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal edit hasil verifikasi (poin & catatan) */}
      <Modal show={editHasilTarget() !== null} onClose={() => setEditHasilTarget(null)} title="Edit Hasil Verifikasi">
        <form onSubmit={handleEditHasilSave} class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            <b>{editHasilTarget()?.namaKegiatan}</b> — {editHasilTarget()?.mahasiswa?.nama} (
            {editHasilTarget()?.mahasiswa?.nim})
            <br />
            Status tetap <b>Terverifikasi</b>; perubahan poin dapat memicu penerbitan ulang tanda tangan.
          </p>

          <Input
            label="Poin"
            type="number"
            min={0}
            value={editPoin()}
            onInput={(e) => setEditPoin(Math.max(0, Number(e.currentTarget.value) || 0))}
          />

          <div class="flex flex-col gap-1">
            <label class="text-caption font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
              Catatan Verifikator (opsional)
            </label>
            <textarea
              rows="3"
              placeholder="Kosongkan bila tidak ada catatan..."
              value={editCatatan()}
              onInput={(e) => setEditCatatan(e.currentTarget.value)}
              class="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-table text-secondary-800 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-action-focus/20 focus:border-action resize-none dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
            />
          </div>

          <Show when={editHasilError()}>
            {(err) => (
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {err()}
              </div>
            )}
          </Show>

          <div class="flex justify-end gap-3 border-t pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditHasilTarget(null)}
              disabled={editHasilBusy()}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={editHasilBusy()}>
              {editHasilBusy() ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal konfirmasi approve massal */}
      <Modal
        show={showBulkModal()}
        onClose={() => !bulkBusy() && setShowBulkModal(false)}
        title="Setujui Rekaman Terpilih"
      >
        <div class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            <b>{selectedIds().size} rekaman</b> akan disetujui sekaligus dan menjadi bagian dokumen SKPI mahasiswa
            masing-masing. Poin mengikuti nilai rekaman saat ini — koreksi poin dapat dilakukan lewat <b>Edit Hasil</b>{' '}
            setelahnya. Rekaman yang bukan <b>Menunggu Verifikasi</b> akan dilewati.
          </p>
          <div class="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setShowBulkModal(false)} disabled={bulkBusy()}>
              Batal
            </Button>
            <Button variant="success" onClick={handleBulkApprove} disabled={bulkBusy()}>
              {bulkBusy() ? 'Memproses...' : `Ya, Setujui ${selectedIds().size} Rekaman`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal impor CSV daftar kegiatan */}
      <Modal
        show={showImportModal()}
        onClose={() => !importBusy() && setShowImportModal(false)}
        title="Impor Kegiatan (CSV)"
        maxWidth="lg"
      >
        <div class="flex flex-col gap-4">
          <p class="text-sm text-secondary-600 dark:text-secondary-300">
            Unggah file CSV berisi daftar kegiatan mahasiswa. Baris yang valid masuk sebagai rekaman{' '}
            <b>Menunggu Verifikasi</b>; baris yang tidak valid dilaporkan per baris tanpa membatalkan baris lain.
          </p>

          <div class="rounded-xl bg-secondary-50 border border-secondary-100 p-3 text-xs text-secondary-500 dark:bg-secondary-800/60 dark:border-secondary-700">
            <p class="font-bold text-secondary-700 dark:text-secondary-300">Kolom wajib</p>
            <p class="mt-1 font-mono">nim, nama_kategori, nama_kegiatan, tanggal_mulai (YYYY-MM-DD)</p>
            <p class="mt-1 font-mono">Opsional: tanggal_selesai, penyelenggara, lokasi, nomor_sertifikat, deskripsi</p>
            <p class="mt-2">
              <button type="button" onClick={downloadTemplate} class="text-action hover:underline font-semibold">
                Unduh template CSV
              </button>
            </p>
          </div>

          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            class="block w-full text-xs text-secondary-600 file:mr-3 file:rounded-full file:border-0 file:bg-action-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-action hover:file:bg-action-100 dark:text-secondary-300"
            onChange={(e) => setImportFile(e.currentTarget.files?.[0] ?? null)}
          />

          <Show when={importResult()}>
            {(result) => (
              <div class="rounded-xl border border-secondary-200 p-3 text-xs dark:border-secondary-700">
                <p class="font-bold text-secondary-700 dark:text-secondary-300">
                  Hasil impor: {result().successCount} berhasil, {result().errors.length} gagal
                </p>
                <Show when={result().errors.length > 0}>
                  <ul class="mt-2 max-h-40 overflow-y-auto space-y-1 text-danger-600 dark:text-danger-400">
                    <Index each={result().errors}>
                      {(err) => (
                        <li>
                          Baris {err().line}: {err().error}
                        </li>
                      )}
                    </Index>
                  </ul>
                </Show>
              </div>
            )}
          </Show>

          <div class="flex justify-end gap-3 border-t pt-4">
            <Button variant="secondary" onClick={() => setShowImportModal(false)} disabled={importBusy()}>
              Tutup
            </Button>
            <Button variant="primary" onClick={handleImportFile} disabled={!importFile() || importBusy()}>
              {importBusy() ? 'Mengimpor...' : 'Impor'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
