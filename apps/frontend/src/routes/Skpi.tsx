import { createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect, type SelectOption } from '../components/ui/SearchableSelect';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { mahasiswaController } from '../controllers/mahasiswaController';
import {
  type SkpiKategori,
  type SkpiKategoriPayload,
  type SkpiKegiatan,
  type SkpiStatus,
  skpiController,
} from '../controllers/skpiController';
import { usePagination } from '../hooks/usePagination';
import { fmtTanggal, getTodayString } from '../utils/format';

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
  { value: '', label: 'Semua Status' },
  { value: 'pending', label: 'Menunggu Verifikasi' },
  { value: 'diverifikasi', label: 'Terverifikasi' },
  { value: 'ditolak', label: 'Ditolak' },
];

/** Opsi jenis kategori — mencerminkan enum backend `skpi.schema.ts`. */
const JENIS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pelatihan', label: 'Pelatihan' },
  { value: 'seminar', label: 'Seminar' },
  { value: 'organisasi', label: 'Organisasi' },
  { value: 'prestasi', label: 'Prestasi' },
  { value: 'lainnya', label: 'Lainnya' },
];

export default function Skpi() {
  const auth = useAuth();
  const toast = useToast();

  const isMahasiswaView = () => auth.hasRole(['mahasiswa']);
  const isAdminView = () => auth.hasRole(['super_admin', 'admin']);
  // Staff yang boleh menginput rekaman atas nama mahasiswa (dicerminkan backend
  // `STAFF_VERIFIER_ROLES` — create juga mewajibkan lolos prodi-scope).
  const isStaffInput = () => auth.hasRole(['super_admin', 'admin', 'prodi', 'kaprodi', 'kemahasiswaan']);
  const canManageKategori = () => isStaffInput();
  const canDeleteKategori = () => auth.hasRole(['super_admin', 'admin']);
  const showInputUi = () => isMahasiswaView() || isStaffInput();

  // ── Profil mahasiswa pemilik (untuk ringkasan poin & tautan cetak) ─────────
  const [mhsProfile] = createResource(
    () => (isMahasiswaView() ? auth.user()?.email : null),
    async (mail) => {
      if (!mail) return null;
      const res = await mahasiswaController.getAll(mail, 1, 1);
      return res.data[0] || null;
    },
  );

  const [dokumen, { refetch: refetchDokumen }] = createResource(
    () => mhsProfile()?.id,
    async (id) => (id ? skpiController.getDokumen(id) : null),
  );

  // ── Daftar rekaman (server-scoped per peran) ──────────────────────────────
  const pagination = usePagination(10);
  const [statusFilter, setStatusFilter] = createSignal('');
  const [kategoriFilter, setKategoriFilter] = createSignal(0);

  // Staf memuat semua kategori (termasuk non-aktif) untuk kelola; mahasiswa hanya aktif.
  const [kategoriList, { refetch: refetchKategori }] = createResource(
    () => (isStaffInput() ? 'all' : 'aktif'),
    (mode) => skpiController.getKategori(mode === 'all'),
  );

  const [list, { refetch }] = createResource(
    () => ({
      page: pagination.page(),
      limit: pagination.limit(),
      status: statusFilter(),
      kategoriId: kategoriFilter(),
      search: pagination.search(),
    }),
    (p) =>
      skpiController.getAll({
        page: p.page,
        limit: p.limit,
        status: p.status || undefined,
        kategoriId: p.kategoriId || undefined,
        search: p.search || undefined,
      }),
  );

  const kategoriOptions = () => [
    { value: 0, label: 'Semua Kategori' },
    ...(kategoriList()?.data ?? [])
      .filter((k: SkpiKategori) => k.isAktif)
      .map((k: SkpiKategori) => ({ value: k.id, label: k.nama })),
  ];

  // ── Form tambah / edit ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [kategoriId, setKategoriId] = createSignal(0);
  const [namaKegiatan, setNamaKegiatan] = createSignal('');
  const [penyelenggara, setPenyelenggara] = createSignal('');
  const [tanggalMulai, setTanggalMulai] = createSignal(getTodayString());
  const [tanggalSelesai, setTanggalSelesai] = createSignal('');
  const [lokasi, setLokasi] = createSignal('');
  const [deskripsi, setDeskripsi] = createSignal('');
  const [nomorSertifikat, setNomorSertifikat] = createSignal('');
  const [isSaving, setIsSaving] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  // ── Pemilih mahasiswa untuk input staf ────────────────────────────────────
  // Pencarian di-debounce lalu memuat opsi via `mahasiswaController` (pola
  // TabPembayaran). Backend tetap menegakkan prodi-scope saat create.
  const [formMahasiswaId, setFormMahasiswaId] = createSignal<number | null>(null);
  const [mhsSearch, setMhsSearch] = createSignal('');
  const [mhsOptions, setMhsOptions] = createSignal<SelectOption[]>([]);
  const [mhsSearching, setMhsSearching] = createSignal(false);
  let mhsTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(mhsTimer));

  const searchMahasiswa = (q: string) => {
    setMhsSearch(q);
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

  const resetForm = () => {
    setKategoriId(kategoriList()?.data?.filter((k: SkpiKategori) => k.isAktif)?.[0]?.id ?? 0);
    setNamaKegiatan('');
    setPenyelenggara('');
    setTanggalMulai(getTodayString());
    setTanggalSelesai('');
    setLokasi('');
    setDeskripsi('');
    setNomorSertifikat('');
    setErrorMsg('');
    setFormMahasiswaId(null);
    setMhsSearch('');
    setMhsOptions([]);
  };

  const openAddModal = () => {
    setEditingId(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (row: SkpiKegiatan) => {
    setEditingId(row.id);
    setKategoriId(row.kategoriKegiatanId);
    setNamaKegiatan(row.namaKegiatan);
    setPenyelenggara(row.penyelenggara ?? '');
    setTanggalMulai(row.tanggalMulai);
    setTanggalSelesai(row.tanggalSelesai ?? '');
    setLokasi(row.lokasi ?? '');
    setDeskripsi(row.deskripsi ?? '');
    setNomorSertifikat(row.nomorSertifikat ?? '');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    // Input staf (create) wajib memilih mahasiswa target; backend juga mewajibkan
    // `mahasiswaId` + lolos prodi-scope untuk staf.
    if (isStaffInput() && !editingId() && !formMahasiswaId()) {
      setErrorMsg('Pilih mahasiswa terlebih dahulu.');
      return;
    }
    if (!kategoriId()) {
      setErrorMsg('Kategori kegiatan wajib dipilih.');
      return;
    }
    if (!namaKegiatan().trim()) {
      setErrorMsg('Nama kegiatan wajib diisi.');
      return;
    }
    if (!tanggalMulai()) {
      setErrorMsg('Tanggal mulai wajib diisi.');
      return;
    }
    if (tanggalSelesai() && tanggalSelesai() < tanggalMulai()) {
      setErrorMsg('Tanggal selesai tidak boleh sebelum tanggal mulai.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        kategoriKegiatanId: kategoriId(),
        namaKegiatan: namaKegiatan().trim(),
        penyelenggara: penyelenggara().trim() || null,
        tanggalMulai: tanggalMulai(),
        tanggalSelesai: tanggalSelesai() || null,
        lokasi: lokasi().trim() || null,
        deskripsi: deskripsi().trim() || null,
        nomorSertifikat: nomorSertifikat().trim() || null,
        // Hanya create oleh staf yang menyertakan target mahasiswa; edit tidak
        // memindahkan kepemilikan rekaman (`SkpiUpdatePayload` tanpa mahasiswaId).
        mahasiswaId: !editingId() && isStaffInput() ? (formMahasiswaId() ?? undefined) : undefined,
      };
      if (editingId()) {
        await skpiController.update(editingId() as number, payload);
        toast.showToast('Rekaman kegiatan diperbarui dan dikirim ulang untuk verifikasi', 'success');
      } else {
        await skpiController.create(payload);
        toast.showToast('Rekaman kegiatan ditambahkan — menunggu verifikasi', 'success');
      }
      setShowModal(false);
      refetch();
      refetchDokumen();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan rekaman kegiatan.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (row: SkpiKegiatan) => {
    if (!window.confirm(`Hapus rekaman kegiatan "${row.namaKegiatan}"?`)) return;
    try {
      await skpiController.remove(row.id);
      toast.showToast('Rekaman kegiatan dihapus', 'success');
      refetch();
      refetchDokumen();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus rekaman.', 'error');
    }
  };

  // ── Lampiran sertifikat (maksimal 1 berkas per rekaman, menggantikan lama) ─
  const [uploadingId, setUploadingId] = createSignal<number | null>(null);
  let lampiranInputRef: HTMLInputElement | undefined;

  const handleLampiranFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    const kegiatanId = uploadingId();
    input.value = '';
    if (!file || !kegiatanId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.showToast('Ukuran lampiran maksimal 5 MB', 'error');
      return;
    }
    try {
      await skpiController.uploadLampiran(kegiatanId, file);
      toast.showToast('Lampiran sertifikat berhasil diunggah', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal mengunggah lampiran.', 'error');
    } finally {
      setUploadingId(null);
    }
  };

  const startUpload = (kegiatanId: number) => {
    setUploadingId(kegiatanId);
    lampiranInputRef?.click();
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

  const handleDeleteLampiran = async (row: SkpiKegiatan) => {
    const lampiran = row.lampiran?.[0];
    if (!lampiran) return;
    if (!window.confirm(`Hapus lampiran "${lampiran.fileName}"?`)) return;
    try {
      await skpiController.deleteLampiran(row.id, lampiran.id);
      toast.showToast('Lampiran dihapus', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus lampiran.', 'error');
    }
  };

  // ── Kelola kategori (khusus staff-verifier) ────────────────────────────────
  // Backend: create/update untuk semua staff-verifier; delete hanya super_admin/
  // admin; kategori terpakai rekaman tidak dapat dihapus (error dari server).
  const [showKategoriModal, setShowKategoriModal] = createSignal(false);
  const [editingKatId, setEditingKatId] = createSignal<number | null>(null);
  const [katNama, setKatNama] = createSignal('');
  const [katJenis, setKatJenis] = createSignal('lainnya');
  const [katPoin, setKatPoin] = createSignal(0);
  const [katAktif, setKatAktif] = createSignal(true);
  const [katError, setKatError] = createSignal('');
  const [katSaving, setKatSaving] = createSignal(false);

  const resetKatForm = () => {
    setEditingKatId(null);
    setKatNama('');
    setKatJenis('lainnya');
    setKatPoin(0);
    setKatAktif(true);
    setKatError('');
  };

  const openKategoriAdd = () => {
    resetKatForm();
    setShowKategoriModal(true);
  };

  const openKategoriEdit = (row: SkpiKategori) => {
    setEditingKatId(row.id);
    setKatNama(row.nama);
    setKatJenis(row.jenis);
    setKatPoin(row.poinDefault);
    setKatAktif(row.isAktif);
    setKatError('');
    setShowKategoriModal(true);
  };

  const handleKategoriSubmit = async (e: Event) => {
    e.preventDefault();
    if (!katNama().trim()) {
      setKatError('Nama kategori wajib diisi.');
      return;
    }
    if (katPoin() < 0) {
      setKatError('Poin default tidak boleh negatif.');
      return;
    }
    setKatSaving(true);
    setKatError('');
    const payload: SkpiKategoriPayload = {
      nama: katNama().trim(),
      jenis: katJenis(),
      poinDefault: katPoin(),
      isAktif: katAktif(),
    };
    try {
      if (editingKatId()) {
        await skpiController.updateKategori(editingKatId() as number, payload);
        toast.showToast('Kategori kegiatan diperbarui', 'success');
      } else {
        await skpiController.createKategori(payload);
        toast.showToast('Kategori kegiatan ditambahkan', 'success');
      }
      await refetchKategori();
      setShowKategoriModal(false);
      resetKatForm();
    } catch (err: unknown) {
      setKatError(err instanceof Error ? err.message : 'Gagal menyimpan kategori kegiatan.');
    } finally {
      setKatSaving(false);
    }
  };

  const handleKategoriToggle = async (row: SkpiKategori) => {
    try {
      await skpiController.updateKategori(row.id, { isAktif: !row.isAktif });
      toast.showToast(
        row.isAktif ? `Kategori "${row.nama}" dinonaktifkan` : `Kategori "${row.nama}" diaktifkan`,
        'success',
      );
      await refetchKategori();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal mengubah status kategori.', 'error');
    }
  };

  const handleKategoriDelete = async (row: SkpiKategori) => {
    if (!window.confirm(`Hapus kategori "${row.nama}"?`)) return;
    try {
      await skpiController.deleteKategori(row.id);
      toast.showToast('Kategori kegiatan dihapus', 'success');
      await refetchKategori();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus kategori.', 'error');
    }
  };

  // Rekaman pending/ditolak boleh diedit/dihapus/diunggah lampirannya.
  const isEditable = (row: SkpiKegiatan) => row.status !== 'diverifikasi';
  // Hapus hanya pemilik (mahasiswa) atau admin (dicek ulang backend).
  const canDelete = (row: SkpiKegiatan) => isMahasiswaView() || isAdminView();

  const cetakDisabledReason = () => {
    const d = dokumen();
    if (!d) return null;
    if (d.syarat.terpenuhi) return null;
    return d.syarat.alasan ?? 'Syarat penerbitan SKPI belum terpenuhi.';
  };

  const handleCetak = () => {
    const mhsId = mhsProfile()?.id;
    if (!mhsId) return;
    window.open(`/skpi/cetak/${mhsId}`, '_blank');
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header + ringkasan */}
        <div class="bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
                SKPI — Pencapaian Kegiatan Mahasiswa
              </h1>
              <p class="text-sm text-secondary-500">
                <Show
                  when={!isMahasiswaView()}
                  fallback="Kelola rekaman pelatihan, seminar, organisasi, dan prestasi Anda. Rekaman yang disetujui verifikator menjadi isi dokumen SKPI."
                >
                  Daftar rekaman kegiatan mahasiswa dalam lingkup akses Anda.
                </Show>
              </p>
            </div>
            <Show when={showInputUi()}>
              <div class="flex flex-wrap items-center gap-3">
                <Button variant="secondary" onClick={() => refetch()}>
                  Muat Ulang
                </Button>
                <Show when={canManageKategori()}>
                  <Button variant="secondary" onClick={openKategoriAdd}>
                    Kelola Kategori
                  </Button>
                </Show>
                <Button variant="primary" onClick={openAddModal}>
                  + Tambah Kegiatan
                </Button>
              </div>
            </Show>
          </div>

          <Show when={isMahasiswaView() && dokumen()}>
            <div class="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Kegiatan Terverifikasi</p>
                <p class="mt-1 text-xl font-extrabold text-secondary-800 dark:text-white">
                  {dokumen()?.totalKegiatan ?? 0}
                </p>
              </div>
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Total Poin</p>
                <p class="mt-1 text-xl font-extrabold text-secondary-800 dark:text-white">
                  {dokumen()?.totalPoin ?? 0}
                </p>
              </div>
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Syarat SKPI</p>
                <div class="mt-1">
                  <Badge variant={dokumen()?.syarat.terpenuhi ? 'success' : 'warning'}>
                    {dokumen()?.syarat.terpenuhi ? 'Terpenuhi' : 'Belum Terpenuhi'}
                  </Badge>
                  <p class="mt-1 text-[11px] text-secondary-400">
                    Min. {dokumen()?.syarat.minKegiatan} kegiatan terverifikasi
                  </p>
                </div>
              </div>
              <div class="rounded-xl bg-secondary-50 p-4 dark:bg-secondary-800/60">
                <p class="text-xs font-semibold uppercase tracking-wider text-secondary-400">Tanda Tangan</p>
                <div class="mt-1">
                  <Badge variant={dokumen()?.signature ? 'accent' : 'default'}>
                    {dokumen()?.signature ? 'Sudah Ditandatangani' : 'Belum Ditandatangani'}
                  </Badge>
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <Button variant="primary" onClick={handleCetak} disabled={!dokumen()?.syarat.terpenuhi}>
                Unduh / Cetak SKPI
              </Button>
              <Show when={cetakDisabledReason()}>
                {(reason) => <p class="text-xs text-warning-700 dark:text-warning-400">{reason()}</p>}
              </Show>
            </div>
          </Show>
        </div>

        {/* Filter + tabel */}
        <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div class="relative flex-1 w-full">
              <span class="absolute left-3.5 top-2.5 text-secondary-400">🔍</span>
              <input
                type="text"
                placeholder="Cari nama kegiatan / penyelenggara..."
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
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

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                  <Show when={!isMahasiswaView()}>
                    <th class="p-3">Mahasiswa</th>
                  </Show>
                  <th class="p-3">Kegiatan</th>
                  <th class="p-3">Kategori</th>
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
                          Belum ada rekaman kegiatan.
                        </td>
                      </tr>
                    }
                  >
                    {(row) => (
                      <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                        <Show when={!isMahasiswaView()}>
                          <td class="p-3">
                            <p class="font-bold text-secondary-800 dark:text-white">{row.mahasiswa?.nama ?? '-'}</p>
                            <p class="text-[11px] text-secondary-400">{row.mahasiswa?.nim ?? '-'}</p>
                          </td>
                        </Show>
                        <td class="p-3 max-w-[260px]">
                          <p class="font-bold text-secondary-800 dark:text-white">{row.namaKegiatan}</p>
                          <Show when={row.penyelenggara}>
                            {(p) => <p class="text-[11px] text-secondary-400">{p()}</p>}
                          </Show>
                        </td>
                        <td class="p-3">{row.kategori?.nama ?? '-'}</td>
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
                          <Show when={row.status === 'ditolak' && row.catatanVerifikator}>
                            {(c) => <p class="mt-1 text-[11px] text-danger-600">{c()}</p>}
                          </Show>
                        </td>
                        <td class="p-3">
                          <Show when={row.lampiran?.length} fallback={<span class="text-secondary-300">—</span>}>
                            <button
                              type="button"
                              onClick={() => handleOpenLampiran(row)}
                              class="text-brand-600 hover:underline font-medium"
                            >
                              Lihat
                            </button>
                          </Show>
                        </td>
                        <td class="p-3">
                          <div class="flex items-center justify-center gap-1.5">
                            <Show when={isEditable(row)}>
                              <Button variant="secondary" size="sm" onClick={() => openEditModal(row)}>
                                Edit
                              </Button>
                              <Button variant="secondary" size="sm" onClick={() => startUpload(row.id)}>
                                {row.lampiran?.length ? 'Ganti' : 'Unggah'}
                              </Button>
                            </Show>
                            <Show when={canDelete(row) && isEditable(row)}>
                              <Button variant="danger" size="sm" onClick={() => handleDelete(row)}>
                                Hapus
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

          <Show when={list()}>
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

      {/* Input lampiran tersembunyi */}
      <input
        ref={lampiranInputRef}
        type="file"
        class="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        onChange={handleLampiranFile}
      />

      {/* Modal tambah / edit rekaman */}
      <Modal
        show={showModal()}
        onClose={() => setShowModal(false)}
        title={editingId() ? 'Edit Rekaman Kegiatan' : 'Tambah Kegiatan'}
        maxWidth="lg"
      >
        <form onSubmit={handleSave} class="flex flex-col gap-4">
          <Show when={errorMsg()}>
            <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
              {errorMsg()}
            </div>
          </Show>

          {/* Input staf (create): pilih mahasiswa target. Backend mewajibkan
              mahasiswaId + prodi-scope untuk staf. */}
          <Show when={isStaffInput() && !editingId()}>
            <SearchableSelect
              label="Mahasiswa"
              placeholder="Ketik NIM / nama untuk mencari..."
              options={mhsOptions()}
              value={formMahasiswaId()}
              onSearch={searchMahasiswa}
              isLoading={mhsSearching()}
              onChange={(v) => setFormMahasiswaId(Number(v))}
              required
            />
          </Show>

          {/* Tampilan pemilik saat edit — rekaman tidak dapat dipindahkan. */}
          <Show when={editingId()}>
            <div class="p-3 rounded-xl bg-secondary-50 border border-secondary-100 text-xs dark:bg-secondary-800/60 dark:border-secondary-700">
              <span class="text-secondary-400 font-semibold uppercase tracking-wider">Mahasiswa:</span>{' '}
              <span class="font-bold text-secondary-800 dark:text-white">
                {list()?.data?.find((r) => r.id === editingId())?.mahasiswa?.nama ?? '-'}
              </span>{' '}
              <span class="text-secondary-400">
                ({list()?.data?.find((r) => r.id === editingId())?.mahasiswa?.nim ?? '-'})
              </span>
            </div>
          </Show>

          <Input
            label="Kategori Kegiatan"
            isSelect
            selectOptions={(kategoriList()?.data ?? [])
              .filter((k: SkpiKategori) => k.isAktif)
              .map((k: SkpiKategori) => ({ value: k.id, label: `${k.nama} (${k.poinDefault} poin)` }))}
            value={kategoriId()}
            onChange={(e) => setKategoriId(Number(e.currentTarget.value))}
            required
          />

          <Input
            label="Nama Kegiatan"
            placeholder="Contoh: Pelatihan Jaringan Dasar"
            value={namaKegiatan()}
            onInput={(e) => setNamaKegiatan(e.currentTarget.value)}
            required
          />

          <Input
            label="Penyelenggara"
            placeholder="Contoh: Politeknik Sorowako"
            value={penyelenggara()}
            onInput={(e) => setPenyelenggara(e.currentTarget.value)}
          />

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tanggal Mulai"
              type="date"
              value={tanggalMulai()}
              onInput={(e) => setTanggalMulai(e.currentTarget.value)}
              required
            />
            <Input
              label="Tanggal Selesai (opsional)"
              type="date"
              value={tanggalSelesai()}
              onInput={(e) => setTanggalSelesai(e.currentTarget.value)}
            />
          </div>

          <Input
            label="Lokasi"
            placeholder="Contoh: Aula Kampus"
            value={lokasi()}
            onInput={(e) => setLokasi(e.currentTarget.value)}
          />

          <Input
            label="Nomor Sertifikat (opsional)"
            placeholder="Nomor pada sertifikat kegiatan"
            value={nomorSertifikat()}
            onInput={(e) => setNomorSertifikat(e.currentTarget.value)}
          />

          <div class="flex flex-col gap-1">
            <label class="text-caption font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
              Deskripsi (opsional)
            </label>
            <textarea
              rows="3"
              placeholder="Uraian singkat kegiatan..."
              value={deskripsi()}
              onInput={(e) => setDeskripsi(e.currentTarget.value)}
              class="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-table text-secondary-800 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 resize-none dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
            />
          </div>

          <Show when={editingId()}>
            <div class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
              Rekaman yang diedit akan kembali berstatus <b>Menunggu Verifikasi</b>.
            </div>
          </Show>

          <div class="flex justify-end gap-3 border-t pt-4 mt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={isSaving()}>
              {isSaving() ? 'Menyimpan...' : editingId() ? 'Simpan & Kirim Ulang' : 'Simpan Kegiatan'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal kelola kategori kegiatan (staff-verifier) */}
      <Modal
        show={showKategoriModal()}
        onClose={() => {
          setShowKategoriModal(false);
          resetKatForm();
        }}
        title={editingKatId() ? 'Edit Kategori Kegiatan' : 'Kelola Kategori Kegiatan'}
        maxWidth="lg"
      >
        <form onSubmit={handleKategoriSubmit} class="flex flex-col gap-4">
          <Show when={katError()}>
            <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
              {katError()}
            </div>
          </Show>

          <Input
            label="Nama Kategori"
            placeholder="Contoh: Pelatihan Jaringan, Seminar Nasional..."
            value={katNama()}
            onInput={(e) => setKatNama(e.currentTarget.value)}
            maxLength={100}
            required
          />

          <Input
            label="Jenis"
            isSelect
            selectOptions={JENIS_OPTIONS}
            value={katJenis()}
            onChange={(e) => setKatJenis(e.currentTarget.value)}
          />

          <Input
            label="Poin Default"
            type="number"
            min={0}
            value={katPoin()}
            onInput={(e) => setKatPoin(Math.max(0, Number(e.currentTarget.value) || 0))}
          />

          <label class="flex items-center gap-2 text-xs font-semibold text-secondary-600 dark:text-secondary-300">
            <input
              type="checkbox"
              checked={katAktif()}
              onChange={(e) => setKatAktif(e.currentTarget.checked)}
              class="w-4 h-4 rounded border-secondary-300 text-brand-600 focus:ring-brand-500"
            />
            Kategori aktif (dapat dipilih pada form kegiatan)
          </label>

          <div class="flex justify-end gap-3 border-t pt-4 mt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowKategoriModal(false);
                resetKatForm();
              }}
            >
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={katSaving()}>
              {katSaving() ? 'Menyimpan...' : editingKatId() ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </Button>
          </div>
        </form>

        {/* Daftar kategori (termasuk non-aktif) */}
        <div class="mt-5 border-t border-secondary-100 pt-4 dark:border-secondary-800">
          <h4 class="text-caption font-bold uppercase tracking-wider text-secondary-500 dark:text-secondary-300">
            Daftar Kategori
          </h4>
          <div class="mt-2 max-h-64 overflow-y-auto divide-y divide-secondary-100 rounded-xl border border-secondary-100 dark:divide-secondary-800 dark:border-secondary-800">
            <For
              each={kategoriList()?.data ?? []}
              fallback={<p class="p-4 text-center text-xs text-secondary-400">Belum ada kategori.</p>}
            >
              {(kat) => (
                <div class="p-3 flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-secondary-900">
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-secondary-800 dark:text-white">{kat.nama}</span>
                    <span class="text-[11px] text-secondary-400 capitalize">
                      {kat.jenis} · {kat.poinDefault} poin
                    </span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Badge variant={kat.isAktif ? 'success' : 'default'} size="sm">
                      {kat.isAktif ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                    <Button variant="secondary" size="sm" onClick={() => openKategoriEdit(kat)}>
                      Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => handleKategoriToggle(kat)}>
                      {kat.isAktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Show when={canDeleteKategori()}>
                      <Button variant="danger" size="sm" onClick={() => handleKategoriDelete(kat)}>
                        Hapus
                      </Button>
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </div>
          <p class="mt-2 text-[11px] text-secondary-400">
            Kategori yang masih dipakai rekaman kegiatan tidak dapat dihapus — nonaktifkan saja agar tidak dipilih pada
            form baru.
          </p>
        </div>
      </Modal>
    </MainLayout>
  );
}
