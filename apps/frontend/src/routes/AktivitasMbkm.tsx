import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchableSelect, type SelectOption } from '../components/ui/SearchableSelect';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  type AktivitasMbkm,
  type AktivitasMbkmPayload,
  aktivitasMbkmController,
  type StatusAktivitasMbkm,
} from '../controllers/aktivitasMbkmController';
import { dosenController } from '../controllers/dosenController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { prodiController } from '../controllers/prodiController';
import { usePagination } from '../hooks/usePagination';

const STATUS_META: Record<
  StatusAktivitasMbkm,
  { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'danger' }
> = {
  draft: { label: 'Draft', variant: 'default' },
  diajukan: { label: 'Diajukan', variant: 'info' },
  disetujui: { label: 'Disetujui', variant: 'success' },
  ditolak: { label: 'Ditolak', variant: 'danger' },
  selesai: { label: 'Selesai', variant: 'warning' },
};

/**
 * Ambang jumlah item untuk berpindah dari dropdown biasa ke searchable dropdown.
 * Daftar pendek tetap native `<select>` (lebih ringkas untuk 5 status), sedangkan
 * daftar master yang panjang memakai `SearchableSelect` agar dapat diketik tanpa
 * harus menggulir panjang.
 */
const SEARCHABLE_THRESHOLD = 10;

const PICK_PAGE_SIZE = 20;

interface SmartSelectProps {
  label: string;
  value: string | number | null;
  options: SelectOption[];
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  /**
   * Paksa mode searchable. Diperlukan bila pemakai menyertakan `onSearch`
   * (server-side search/paging) — callback itu hanya dipahami
   * `SearchableSelect`, sehingga daftar yang panjang tidak boleh tampil sebagai
   * native select yang tidak bisa diketik.
   */
  forceSearchable?: boolean;
}

/** Native select untuk daftar pendek, searchable dropdown untuk daftar panjang. */
function SmartSelect(props: SmartSelectProps) {
  const isLongList = () => props.forceSearchable || props.options.length > SEARCHABLE_THRESHOLD;
  return (
    <Show
      when={isLongList()}
      fallback={
        <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
          {props.label}
          <select
            value={props.value ?? ''}
            disabled={props.disabled}
            onChange={(e) => props.onChange(e.currentTarget.value)}
            class="rounded-lg border border-secondary-200 bg-white px-3 py-2 disabled:opacity-50 dark:border-secondary-700 dark:bg-secondary-800"
          >
            <option value="">{props.placeholder ?? '— Pilih —'}</option>
            <For each={props.options}>{(o) => <option value={String(o.value)}>{o.label}</option>}</For>
          </select>
        </label>
      }
    >
      <SearchableSelect
        label={props.label}
        value={props.value ?? ''}
        options={props.options}
        onChange={props.onChange}
        placeholder={props.placeholder ?? '— Pilih —'}
        disabled={props.disabled}
        onSearch={props.onSearch}
        isLoading={props.isLoading}
        hasMore={props.hasMore}
        onLoadMore={props.onLoadMore}
      />
    </Show>
  );
}

interface AktivitasForm {
  judul: string;
  jenisId: string;
  programStudiId: string;
  periodeId: string;
  lokasi: string;
  institusi: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  sks: string;
  deskripsi: string;
}

const EMPTY_FORM: AktivitasForm = {
  judul: '',
  jenisId: '',
  programStudiId: '',
  periodeId: '',
  lokasi: '',
  institusi: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  sks: '20',
  deskripsi: '',
};

/**
 * Halaman Aktivitas MBKM (Magang & Kuliah Kerja Praktik).
 * Sumber data Vik PDDIKTI: entitas `aktivitas_mahasiswa` beserta anggota,
 * pembimbing, dan konversi SKS — bukan atribut/flag pada mata kuliah.
 *
 * Saat aktivitas disetujui, sistem otomatis menaut baris bimbingan kategori
 * MAGANG sehingga sesi bimbingan PKL tercatat dan ter-kredit BKD lewat alur
 * bimbingan yang sudah ada.
 */
export default function AktivitasMbkm() {
  const auth = useAuth();
  const toast = useToast();
  const { page, setPage, limit, setLimit, resetPage } = usePagination(20);

  const isManager = () => auth.hasRole(['admin', 'super_admin', 'prodi', 'kaprodi', 'kemahasiswaan']);

  const [statusFilter, setStatusFilter] = createSignal<StatusAktivitasMbkm | ''>('');
  const [prodiFilter, setProdiFilter] = createSignal('');
  const [search, setSearch] = createSignal('');
  const [nonce, setNonce] = createSignal(0);

  const [prodiList] = createResource(async () => (await prodiController.getAll('', 1, 200)).data);
  const [jenisList] = createResource(async () => await aktivitasMbkmController.listJenis());
  const [periodeList] = createResource(async () => (await periodeAkademikController.getAll('', 1, 200)).data);

  const prodiOptions = () => (prodiList() ?? []).map((p): SelectOption => ({ label: p.nama, value: p.id }));
  const jenisOptions = () => (jenisList() ?? []).map((j): SelectOption => ({ label: j.nama, value: j.id }));
  const periodeOptions = () =>
    (periodeList() ?? []).map(
      (p): SelectOption => ({
        label: `${p.nama}${p.aktif ? ' (Aktif)' : ''}`,
        value: p.id,
      }),
    );

  /** Periode aktif menjadi nilai awal form agar aktivitas langsung bisa diajukan. */
  const periodeAktifId = () => (periodeList() ?? []).find((p) => p.aktif)?.id ?? '';

  // ── Picker searchable: anggota, pembimbing, mata kuliah ─────────────────────
  // Hanya manager yang memakai ketiga picker ini, jadi resource-nya di-scope ke
  // `isManager()` — mahasiswa/dosen tidak memicu 3 request sia-sia saat halaman
  // dibuka. `createResource` tidak memanggil fetcher bila source-nya falsy.
  const [mhsQuery, setMhsQuery] = createSignal('');
  const [mhsPage, setMhsPage] = createSignal(1);
  const [mhsOptions, setMhsOptions] = createSignal<SelectOption[]>([]);
  const [mhsHasMore, setMhsHasMore] = createSignal(false);

  const [mhsPageData] = createResource(
    () => (isManager() ? { q: mhsQuery(), page: mhsPage() } : null),
    async ({ q, page: p }) => {
      const res = await mahasiswaController.getAll(q || undefined, p, PICK_PAGE_SIZE);
      setMhsHasMore(res.data.length === PICK_PAGE_SIZE);
      return res.data.map((m): SelectOption => ({ label: `${m.nim} — ${m.nama}`, value: m.id }));
    },
  );

  createEffect(() => {
    const data = mhsPageData();
    if (data === undefined) return;
    setMhsOptions((prev) => (mhsPage() > 1 ? [...prev, ...data] : data));
  });

  const onSearchMhs = (q: string) => {
    setMhsQuery(q);
    setMhsPage(1);
    setMhsOptions([]);
  };
  const onLoadMoreMhs = () => {
    if (mhsHasMore()) setMhsPage((p) => p + 1);
  };

  const [dosenQuery, setDosenQuery] = createSignal('');
  const [dosenPage, setDosenPage] = createSignal(1);
  const [dosenOptions, setDosenOptions] = createSignal<SelectOption[]>([]);
  const [dosenHasMore, setDosenHasMore] = createSignal(false);

  const [dosenPageData] = createResource(
    () => (isManager() ? { q: dosenQuery(), page: dosenPage() } : null),
    async ({ q, page: p }) => {
      const res = await dosenController.getAll(q || undefined, p, PICK_PAGE_SIZE);
      setDosenHasMore(res.data.length === PICK_PAGE_SIZE);
      return res.data.map((d): SelectOption => ({ label: `${d.nama} (${d.nip})`, value: d.id }));
    },
  );

  createEffect(() => {
    const data = dosenPageData();
    if (data === undefined) return;
    setDosenOptions((prev) => (dosenPage() > 1 ? [...prev, ...data] : data));
  });

  const onSearchDosen = (q: string) => {
    setDosenQuery(q);
    setDosenPage(1);
    setDosenOptions([]);
  };
  const onLoadMoreDosen = () => {
    if (dosenHasMore()) setDosenPage((p) => p + 1);
  };

  const [mkQuery, setMkQuery] = createSignal('');
  const [mkPage, setMkPage] = createSignal(1);
  const [mkOptions, setMkOptions] = createSignal<SelectOption[]>([]);
  const [mkHasMore, setMkHasMore] = createSignal(false);

  const [mkPageData] = createResource(
    () => (isManager() ? { q: mkQuery(), page: mkPage() } : null),
    async ({ q, page: p }) => {
      const res = await mataKuliahController.getAll(q || undefined, p, PICK_PAGE_SIZE);
      setMkHasMore(res.data.length === PICK_PAGE_SIZE);
      return res.data.map(
        (m): SelectOption => ({
          label: `${m.kode} — ${m.nama} (${m.sksTotal} SKS)`,
          value: m.id,
        }),
      );
    },
  );

  createEffect(() => {
    const data = mkPageData();
    if (data === undefined) return;
    setMkOptions((prev) => (mkPage() > 1 ? [...prev, ...data] : data));
  });

  const onSearchMk = (q: string) => {
    setMkQuery(q);
    setMkPage(1);
    setMkOptions([]);
  };
  const onLoadMoreMk = () => {
    if (mkHasMore()) setMkPage((p) => p + 1);
  };

  const [list, { refetch: refetchList }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      status: statusFilter(),
      prodi: prodiFilter(),
      search: search(),
      nonce: nonce(),
    }),
    async (f) =>
      await aktivitasMbkmController.list({
        page: f.page,
        limit: f.limit,
        status: f.status || undefined,
        programStudiId: f.prodi ? Number(f.prodi) : undefined,
        search: f.search || undefined,
      }),
  );

  const reload = () => {
    setNonce((n) => n + 1);
    void refetchList();
  };

  // ── Modal detail ───────────────────────────────────────────────────────────
  const [detailId, setDetailId] = createSignal<number | null>(null);
  const [detail, { refetch: refetchDetail }] = createResource(detailId, async (id) =>
    id ? await aktivitasMbkmController.getById(id) : null,
  );
  const [newAnggotaId, setNewAnggotaId] = createSignal('');
  const [newPembimbingId, setNewPembimbingId] = createSignal('');
  const [newKonversiMkId, setNewKonversiMkId] = createSignal('');
  const [newKonversiSks, setNewKonversiSks] = createSignal('');
  const [busy, setBusy] = createSignal(false);

  const refreshDetail = () => {
    void refetchDetail();
    reload();
  };

  /**
   * Jalankan aksi lalu refresh detail. Mengembalikan boolean sukses supaya
   * pemanggil hanya membersihkan form/selection bila aksi benar-benar berhasil
   * (kegagalan tidak boleh menghapus input yang sudah diketik pengguna).
   */
  const runAction = async (fn: () => Promise<unknown>, successMessage: string): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      toast.showToast(successMessage, 'success');
      refreshDetail();
      return true;
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Terjadi kesalahan.', 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  // ── Validasi & payload form (dipakai bersama oleh buat & ubah) ─────────────
  const toPayload = (f: AktivitasForm): AktivitasMbkmPayload => ({
    judul: f.judul.trim(),
    jenisId: Number(f.jenisId),
    periodeId: f.periodeId || null,
    programStudiId: f.programStudiId ? Number(f.programStudiId) : null,
    lokasi: f.lokasi || null,
    institusi: f.institusi || null,
    tanggalMulai: f.tanggalMulai || null,
    tanggalSelesai: f.tanggalSelesai || null,
    sks: Number(f.sks) || 0,
    deskripsi: f.deskripsi || null,
  });

  const validateForm = (f: AktivitasForm): string | null => {
    if (f.judul.trim().length < 3) return 'Judul aktivitas minimal 3 karakter.';
    if (!f.jenisId) return 'Jenis aktivitas wajib dipilih.';
    if (!f.periodeId) {
      return periodeAktifId()
        ? 'Periode semester wajib dipilih.'
        : 'Belum ada periode akademik aktif. Aktifkan periode terlebih dahulu di Data Periode Akademik.';
    }
    const sks = Number(f.sks);
    if (!Number.isInteger(sks) || sks < 0 || sks > 60) return 'SKS harus bilangan bulat antara 0 dan 60.';
    if (f.tanggalMulai && f.tanggalSelesai && f.tanggalSelesai < f.tanggalMulai) {
      return 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.';
    }
    return null;
  };

  const formToSignal = (d: AktivitasMbkm): AktivitasForm => ({
    judul: d.judul,
    jenisId: String(d.jenisId),
    programStudiId: d.programStudiId ? String(d.programStudiId) : '',
    periodeId: d.periodeId ?? '',
    lokasi: d.lokasi ?? '',
    institusi: d.institusi ?? '',
    tanggalMulai: d.tanggalMulai ?? '',
    tanggalSelesai: d.tanggalSelesai ?? '',
    sks: String(d.sks),
    deskripsi: d.deskripsi ?? '',
  });

  // ── Modal buat aktivitas ───────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = createSignal(false);
  const [form, setForm] = createSignal<AktivitasForm>({ ...EMPTY_FORM });
  const [createError, setCreateError] = createSignal('');

  const openCreateModal = () => {
    setForm({ ...EMPTY_FORM, periodeId: periodeAktifId() });
    setCreateError('');
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    const f = form();
    const problem = validateForm(f);
    if (problem) {
      setCreateError(problem);
      return;
    }
    setBusy(true);
    setCreateError('');
    try {
      const res = await aktivitasMbkmController.create(toPayload(f));
      toast.showToast('Aktivitas dibuat sebagai draft', 'success');
      setCreateOpen(false);
      reload();
      setDetailId(res.data.id);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Gagal membuat aktivitas.');
    } finally {
      setBusy(false);
    }
  };

  // ── Modal ubah aktivitas (hanya status draft, sesuai aturan backend) ───────
  const [editOpen, setEditOpen] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [editForm, setEditForm] = createSignal<AktivitasForm>({ ...EMPTY_FORM });
  const [editError, setEditError] = createSignal('');

  const openEditModal = (d: AktivitasMbkm) => {
    setEditId(d.id);
    setEditForm(formToSignal(d));
    setEditError('');
    setEditOpen(true);
  };

  const submitEdit = async () => {
    const id = editId();
    if (!id) return;
    const f = editForm();
    const problem = validateForm(f);
    if (problem) {
      setEditError(problem);
      return;
    }
    setBusy(true);
    setEditError('');
    try {
      await aktivitasMbkmController.update(id, toPayload(f));
      toast.showToast('Aktivitas diperbarui', 'success');
      setEditOpen(false);
      refreshDetail();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'Gagal memperbarui aktivitas.');
    } finally {
      setBusy(false);
    }
  };

  // ── Hapus aktivitas ────────────────────────────────────────────────────────
  // Hanya draft/ditolak dan belum punya bimbingan tertaut: kolom
  // `bimbingan.aktivitas_mbkm_id` tidak ber-FK, sehingga aktivitas yang pernah
  // disetujui tidak boleh dihapus lewat UI agar tidak meninggalkan tautan yatim.
  const [deleteTarget, setDeleteTarget] = createSignal<AktivitasMbkm | null>(null);

  const canEdit = (d: AktivitasMbkm) => isManager() && d.status === 'draft';

  const canDelete = (d: AktivitasMbkm) =>
    isManager() && (d.status === 'draft' || d.status === 'ditolak') && d.bimbinganTertaut.length === 0;

  const confirmDelete = async () => {
    const target = deleteTarget();
    if (!target) return;
    setBusy(true);
    try {
      await aktivitasMbkmController.remove(target.id);
      toast.showToast('Aktivitas dihapus', 'success');
      setDeleteTarget(null);
      setDetailId(null);
      reload();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal menghapus aktivitas.', 'error');
    } finally {
      setBusy(false);
    }
  };

  /**
   * Prasyarat pengajuan backend: periode terisi, SKS > 0, minimal satu anggota,
   * dan minimal satu pembimbing. Diperiksa di UI agar pesan langsung spesifik
   * (bukan error 400 umum) dan agar alur Setujui/Tolak tidak terkunci di draft.
   */
  const validateBeforeAjukan = (d: AktivitasMbkm): string | null => {
    if (!d.periodeId) return 'Periode semester wajib diisi sebelum mengajukan.';
    if (d.sks <= 0) return 'SKS wajib lebih besar dari nol sebelum mengajukan.';
    if (d.anggota.length === 0) return 'Tambahkan minimal satu anggota mahasiswa sebelum mengajukan.';
    if (d.pembimbing.length === 0) return 'Tambahkan minimal satu dosen pembimbing sebelum mengajukan.';
    return null;
  };

  const handleAjukan = async (d: AktivitasMbkm) => {
    const problem = validateBeforeAjukan(d);
    if (problem) {
      toast.showToast(problem, 'error');
      return;
    }
    await runAction(() => aktivitasMbkmController.ajukan(d.id), 'Aktivitas diajukan');
  };

  const handleAddKonversi = async (d: AktivitasMbkm) => {
    if (!newKonversiMkId()) {
      toast.showToast('Pilih mata kuliah yang direkognisi.', 'error');
      return;
    }
    const sks = Number(newKonversiSks());
    if (!Number.isInteger(sks) || sks < 1 || sks > 24) {
      toast.showToast('SKS diakui harus bilangan bulat antara 1 dan 24.', 'error');
      return;
    }
    await runAction(async () => {
      await aktivitasMbkmController.addKonversi(d.id, Number(newKonversiMkId()), sks);
    }, 'Rekognisi SKS ditambahkan').then((ok) => {
      if (ok) {
        setNewKonversiMkId('');
        setNewKonversiSks('');
      }
    });
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Aktivitas MBKM</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Magang, praktik kerja lapangan, dan kuliah kerja. Data mengikuti entitas aktivitas Vik PDDIKTI — anggota,
              pembimbing, serta rekognisi SKS ke mata kuliah.
            </p>
          </div>
          <Show when={isManager()}>
            <Button size="sm" onClick={openCreateModal}>
              Buat Aktivitas
            </Button>
          </Show>
        </div>

        <div class="grid grid-cols-1 gap-3 rounded-2xl border border-secondary-200/80 bg-white p-4 md:grid-cols-3 dark:border-secondary-800 dark:bg-secondary-900">
          <Input
            label="Cari judul"
            value={search()}
            placeholder="Judul aktivitas…"
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
          />
          <label class="flex flex-col gap-1 text-caption font-medium text-secondary-600 dark:text-secondary-300">
            Status
            <select
              value={statusFilter()}
              onChange={(e) => {
                setStatusFilter(e.currentTarget.value as StatusAktivitasMbkm | '');
                resetPage();
              }}
              class="rounded-lg border border-secondary-200 bg-white px-3 py-2 dark:border-secondary-700 dark:bg-secondary-800"
            >
              <option value="">Semua status</option>
              <For each={Object.keys(STATUS_META) as StatusAktivitasMbkm[]}>
                {(s) => <option value={s}>{STATUS_META[s].label}</option>}
              </For>
            </select>
          </label>
          <SmartSelect
            label="Program Studi"
            value={prodiFilter()}
            options={prodiOptions()}
            placeholder="Semua Prodi"
            onChange={(v) => {
              setProdiFilter(String(v));
              resetPage();
            }}
          />
        </div>

        <Show when={!list.loading} fallback={<p class="text-sm text-secondary-500">Memuat data…</p>}>
          <Table headers={['Judul', 'Jenis', 'SKS', 'Anggota', 'Pembimbing', 'Status', 'Aksi']}>
            <For
              each={list()?.data ?? []}
              fallback={
                <tr>
                  <td colspan={7} class="px-6 py-6 text-center text-sm text-secondary-500">
                    Belum ada aktivitas pada filter ini.
                  </td>
                </tr>
              }
            >
              {(row) => (
                <tr class="border-b border-secondary-100 last:border-0 dark:border-secondary-800">
                  <td class="px-6 py-3 text-table font-medium text-secondary-800 dark:text-white">
                    {row.judul}
                    <Show when={row.prodiNama}>
                      <span class="block text-fine text-secondary-500">{row.prodiNama}</span>
                    </Show>
                  </td>
                  <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                    {row.jenisNama ?? '-'}
                  </td>
                  <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">{row.sks}</td>
                  <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                    {row.anggota.length} mahasiswa
                  </td>
                  <td class="px-6 py-3 text-caption text-secondary-600 dark:text-secondary-300">
                    {row.pembimbing.length} dosen
                  </td>
                  <td class="px-6 py-3">
                    <Badge variant={STATUS_META[row.status].variant} size="sm">
                      {STATUS_META[row.status].label}
                    </Badge>
                  </td>
                  <td class="px-6 py-3">
                    <button
                      type="button"
                      class="text-fine font-semibold text-action hover:underline dark:text-action-ondark"
                      onClick={() => setDetailId(row.id)}
                    >
                      Kelola
                    </button>
                  </td>
                </tr>
              )}
            </For>
          </Table>

          <Pagination
            currentPage={page()}
            totalPages={list()?.totalPages ?? 1}
            total={list()?.total ?? 0}
            limit={limit()}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </Show>

        {/* Detail */}
        {/* Modal ubah & konfirmasi hapus menimpa detail: `Modal` memasang
            listener Escape global, sehingga dua modal yang terbuka bersamaan akan
            tertutup sekaligus. Detail ditutup selama modal anak aktif. */}
        <Modal
          isOpen={detailId() !== null && !editOpen() && deleteTarget() === null}
          onClose={() => setDetailId(null)}
          title={detail()?.judul ?? 'Detail Aktivitas'}
          maxWidth="lg"
        >
          <Show when={detail()}>
            {(d) => (
              <div class="flex flex-col gap-4 text-sm">
                <Show when={isManager()}>
                  <div class="flex flex-wrap gap-2">
                    <Show when={canEdit(d())}>
                      <Button size="sm" variant="secondary" onClick={() => openEditModal(d())}>
                        Ubah Isian
                      </Button>
                    </Show>
                    <Show when={canDelete(d())}>
                      <Button size="sm" variant="danger" onClick={() => setDeleteTarget(d())}>
                        Hapus Aktivitas
                      </Button>
                    </Show>
                  </div>
                </Show>

                <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <p class="text-fine text-secondary-500">Jenis</p>
                    <p>{d().jenisNama ?? '-'}</p>
                  </div>
                  <div>
                    <p class="text-fine text-secondary-500">SKS</p>
                    <p>{d().sks}</p>
                  </div>
                  <div>
                    <p class="text-fine text-secondary-500">Periode</p>
                    <p>{d().periodeId ?? 'Belum ditetapkan'}</p>
                  </div>
                  <div>
                    <p class="text-fine text-secondary-500">Status</p>
                    <Badge variant={STATUS_META[d().status].variant} size="sm">
                      {STATUS_META[d().status].label}
                    </Badge>
                  </div>
                  <Show when={d().lokasi}>
                    <div>
                      <p class="text-fine text-secondary-500">Lokasi</p>
                      <p>{d().lokasi}</p>
                    </div>
                  </Show>
                  <Show when={d().institusi}>
                    <div>
                      <p class="text-fine text-secondary-500">Instansi</p>
                      <p>{d().institusi}</p>
                    </div>
                  </Show>
                  <Show when={d().tanggalMulai}>
                    <div>
                      <p class="text-fine text-secondary-500">Mulai</p>
                      <p>{d().tanggalMulai}</p>
                    </div>
                  </Show>
                  <Show when={d().tanggalSelesai}>
                    <div>
                      <p class="text-fine text-secondary-500">Selesai</p>
                      <p>{d().tanggalSelesai}</p>
                    </div>
                  </Show>
                  <Show when={d().idPddikti}>
                    <div>
                      <p class="text-fine text-secondary-500">ID Vik PDDIKTI</p>
                      <p class="font-mono text-fine">{d().idPddikti}</p>
                    </div>
                  </Show>
                </div>

                {/* Anggota */}
                <div>
                  <p class="mb-1 font-semibold text-secondary-700 dark:text-secondary-200">
                    Anggota ({d().anggota.length})
                  </p>
                  <For each={d().anggota}>
                    {(a) => (
                      <div class="flex items-center justify-between border-b border-secondary-100 py-1 text-caption dark:border-secondary-800">
                        <span>
                          {a.nama} ({a.nim}) {a.peran === 'ketua' ? '· Ketua' : ''}
                        </span>
                        <Show when={isManager() && d().status === 'draft'}>
                          <button
                            type="button"
                            class="text-danger-600 hover:underline dark:text-danger-400"
                            onClick={() =>
                              void runAction(
                                () => aktivitasMbkmController.removeAnggota(d().id, a.id),
                                'Anggota dihapus',
                              )
                            }
                          >
                            Hapus
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={isManager() && d().status === 'draft'}>
                    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div class="flex-1">
                        <SmartSelect
                          label="Cari & tambah mahasiswa"
                          value={newAnggotaId()}
                          options={mhsOptions()}
                          placeholder="Ketik NIM atau nama…"
                          onChange={(v) => setNewAnggotaId(String(v))}
                          onSearch={onSearchMhs}
                          forceSearchable
                          isLoading={mhsPageData.loading}
                          hasMore={mhsHasMore()}
                          onLoadMore={onLoadMoreMhs}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!newAnggotaId()}
                        onClick={() =>
                          void runAction(
                            () => aktivitasMbkmController.addAnggota(d().id, Number(newAnggotaId())),
                            'Anggota ditambahkan',
                          ).then((ok) => {
                            if (ok) setNewAnggotaId('');
                          })
                        }
                      >
                        Tambah
                      </Button>
                    </div>
                  </Show>
                </div>

                {/* Pembimbing */}
                <div>
                  <p class="mb-1 font-semibold text-secondary-700 dark:text-secondary-200">
                    Pembimbing ({d().pembimbing.length})
                  </p>
                  <For each={d().pembimbing}>
                    {(p) => (
                      <div class="flex items-center justify-between border-b border-secondary-100 py-1 text-caption dark:border-secondary-800">
                        <span>
                          {p.dosenNama} ({p.dosenNip}) {p.kategori === 'pendamping' ? '· Pendamping' : ''}
                        </span>
                        <Show when={isManager() && d().status === 'draft'}>
                          <button
                            type="button"
                            class="text-danger-600 hover:underline dark:text-danger-400"
                            onClick={() =>
                              void runAction(
                                () => aktivitasMbkmController.removePembimbing(d().id, p.id),
                                'Pembimbing dihapus',
                              )
                            }
                          >
                            Hapus
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={isManager() && d().status === 'draft'}>
                    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div class="flex-1">
                        <SmartSelect
                          label="Cari & tambah dosen"
                          value={newPembimbingId()}
                          options={dosenOptions()}
                          placeholder="Ketik nama atau NIP…"
                          onChange={(v) => setNewPembimbingId(String(v))}
                          onSearch={onSearchDosen}
                          forceSearchable
                          isLoading={dosenPageData.loading}
                          hasMore={dosenHasMore()}
                          onLoadMore={onLoadMoreDosen}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!newPembimbingId()}
                        onClick={() =>
                          void runAction(
                            () => aktivitasMbkmController.addPembimbing(d().id, Number(newPembimbingId())),
                            'Pembimbing ditambahkan',
                          ).then((ok) => {
                            if (ok) setNewPembimbingId('');
                          })
                        }
                      >
                        Tambah
                      </Button>
                    </div>
                  </Show>
                </div>

                {/* Rekognisi SKS */}
                <div>
                  <p class="mb-1 font-semibold text-secondary-700 dark:text-secondary-200">
                    Rekognisi SKS ({d().konversi.length} dari {d().sks} SKS)
                  </p>
                  <For each={d().konversi}>
                    {(k) => (
                      <div class="flex items-center justify-between border-b border-secondary-100 py-1 text-caption dark:border-secondary-800">
                        <span>
                          {k.mataKuliahKode} — {k.mataKuliahNama}: {k.sksDiakui} SKS
                        </span>
                        <Show when={isManager() && (d().status === 'disetujui' || d().status === 'selesai')}>
                          <button
                            type="button"
                            class="text-danger-600 hover:underline dark:text-danger-400"
                            onClick={() =>
                              void runAction(
                                () => aktivitasMbkmController.removeKonversi(d().id, k.id),
                                'Rekognisi SKS dihapus',
                              )
                            }
                          >
                            Hapus
                          </button>
                        </Show>
                      </div>
                    )}
                  </For>
                  <Show when={!d().konversi.length}>
                    <p class="text-caption text-secondary-500">
                      Belum ada rekognisi SKS. Total SKS diakui tidak boleh melebihi SKS aktivitas.
                    </p>
                  </Show>
                  <Show when={isManager() && (d().status === 'disetujui' || d().status === 'selesai')}>
                    <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <div class="flex-1">
                        <SmartSelect
                          label="Cari & tambah rekognisi SKS"
                          value={newKonversiMkId()}
                          options={mkOptions()}
                          placeholder="Ketik kode atau nama mata kuliah…"
                          onChange={(v) => setNewKonversiMkId(String(v))}
                          onSearch={onSearchMk}
                          forceSearchable
                          isLoading={mkPageData.loading}
                          hasMore={mkHasMore()}
                          onLoadMore={onLoadMoreMk}
                        />
                      </div>
                      <Input
                        label="SKS diakui"
                        type="number"
                        value={newKonversiSks()}
                        onInput={(e) => setNewKonversiSks(e.currentTarget.value)}
                      />
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!newKonversiMkId() || !newKonversiSks()}
                        loading={busy()}
                        onClick={() => void handleAddKonversi(d())}
                      >
                        Tambah
                      </Button>
                    </div>
                  </Show>
                </div>

                {/* Workflow */}
                <Show when={isManager()}>
                  <div class="flex flex-wrap items-center gap-2 border-t border-secondary-100 pt-3 dark:border-secondary-800">
                    <Show when={d().status === 'draft'}>
                      <Button size="sm" loading={busy()} onClick={() => void handleAjukan(d())}>
                        Ajukan Verifikasi
                      </Button>
                    </Show>
                    <Show when={d().status === 'diajukan'}>
                      <Button
                        size="sm"
                        loading={busy()}
                        onClick={() =>
                          void runAction(() => aktivitasMbkmController.setujui(d().id), 'Aktivitas disetujui')
                        }
                      >
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busy()}
                        onClick={() => void runAction(() => aktivitasMbkmController.tolak(d().id), 'Aktivitas ditolak')}
                      >
                        Tolak
                      </Button>
                    </Show>
                    <Show when={d().status === 'disetujui'}>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={busy()}
                        onClick={() =>
                          void runAction(() => aktivitasMbkmController.setSelesai(d().id), 'Aktivitas ditandai selesai')
                        }
                      >
                        Tandai Selesai
                      </Button>
                    </Show>
                    <Show when={d().status === 'selesai'}>
                      <Badge variant="success" size="sm">
                        {d().bimbinganTertaut.length} bimbingan PKL tertaut
                      </Badge>
                    </Show>
                  </div>
                </Show>
              </div>
            )}
          </Show>
        </Modal>

        {/* Buat aktivitas */}
        <Modal isOpen={createOpen()} onClose={() => setCreateOpen(false)} title="Buat Aktivitas MBKM" maxWidth="md">
          <div class="flex flex-col gap-3">
            <Input
              label="Judul aktivitas"
              value={form().judul}
              onInput={(e) => setForm({ ...form(), judul: e.currentTarget.value })}
            />
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SmartSelect
                label="Jenis aktivitas"
                value={form().jenisId}
                options={jenisOptions()}
                placeholder="— Pilih jenis —"
                onChange={(v) => setForm({ ...form(), jenisId: String(v) })}
              />
              <SmartSelect
                label="Periode semester"
                value={form().periodeId}
                options={periodeOptions()}
                placeholder="— Pilih periode —"
                onChange={(v) => setForm({ ...form(), periodeId: String(v) })}
              />
            </div>
            <SmartSelect
              label="Program Studi"
              value={form().programStudiId}
              options={prodiOptions()}
              placeholder="— Pilih prodi —"
              onChange={(v) => setForm({ ...form(), programStudiId: String(v) })}
            />
            <Input
              label="Instansi / Perusahaan"
              value={form().institusi}
              onInput={(e) => setForm({ ...form(), instansi: e.currentTarget.value })}
            />
            <Input
              label="Lokasi"
              value={form().lokasi}
              onInput={(e) => setForm({ ...form(), lokasi: e.currentTarget.value })}
            />
            <div class="grid grid-cols-2 gap-3">
              <Input
                label="Tanggal mulai"
                type="date"
                value={form().tanggalMulai}
                onInput={(e) => setForm({ ...form(), tanggalMulai: e.currentTarget.value })}
              />
              <Input
                label="Tanggal selesai"
                type="date"
                value={form().tanggalSelesai}
                onInput={(e) => setForm({ ...form(), tanggalSelesai: e.currentTarget.value })}
              />
            </div>
            <Input
              label="SKS"
              type="number"
              value={form().sks}
              onInput={(e) => setForm({ ...form(), sks: e.currentTarget.value })}
            />

            <Show when={createError()}>
              <p class="text-caption text-danger-600 dark:text-danger-400">{createError()}</p>
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
                Batal
              </Button>
              <Button size="sm" loading={busy()} onClick={() => void submitCreate()}>
                Simpan Draft
              </Button>
            </div>
          </div>
        </Modal>

        {/* Ubah aktivitas */}
        <Modal isOpen={editOpen()} onClose={() => setEditOpen(false)} title="Ubah Aktivitas MBKM" maxWidth="md">
          <div class="flex flex-col gap-3">
            <Input
              label="Judul aktivitas"
              value={editForm().judul}
              onInput={(e) => setEditForm({ ...editForm(), judul: e.currentTarget.value })}
            />
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <SmartSelect
                label="Jenis aktivitas"
                value={editForm().jenisId}
                options={jenisOptions()}
                placeholder="— Pilih jenis —"
                onChange={(v) => setEditForm({ ...editForm(), jenisId: String(v) })}
              />
              <SmartSelect
                label="Periode semester"
                value={editForm().periodeId}
                options={periodeOptions()}
                placeholder="— Pilih periode —"
                onChange={(v) => setEditForm({ ...editForm(), periodeId: String(v) })}
              />
            </div>
            <SmartSelect
              label="Program Studi"
              value={editForm().programStudiId}
              options={prodiOptions()}
              placeholder="— Pilih prodi —"
              onChange={(v) => setEditForm({ ...editForm(), programStudiId: String(v) })}
            />
            <Input
              label="Instansi / Perusahaan"
              value={editForm().institusi}
              onInput={(e) => setEditForm({ ...editForm(), instansi: e.currentTarget.value })}
            />
            <Input
              label="Lokasi"
              value={editForm().lokasi}
              onInput={(e) => setEditForm({ ...editForm(), lokasi: e.currentTarget.value })}
            />
            <div class="grid grid-cols-2 gap-3">
              <Input
                label="Tanggal mulai"
                type="date"
                value={editForm().tanggalMulai}
                onInput={(e) => setEditForm({ ...editForm(), tanggalMulai: e.currentTarget.value })}
              />
              <Input
                label="Tanggal selesai"
                type="date"
                value={editForm().tanggalSelesai}
                onInput={(e) => setEditForm({ ...editForm(), tanggalSelesai: e.currentTarget.value })}
              />
            </div>
            <Input
              label="SKS"
              type="number"
              value={editForm().sks}
              onInput={(e) => setEditForm({ ...editForm(), sks: e.currentTarget.value })}
            />

            <Show when={editError()}>
              <p class="text-caption text-danger-600 dark:text-danger-400">{editError()}</p>
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                Batal
              </Button>
              <Button size="sm" loading={busy()} onClick={() => void submitEdit()}>
                Simpan Perubahan
              </Button>
            </div>
          </div>
        </Modal>

        {/* Konfirmasi hapus */}
        <Modal
          isOpen={deleteTarget() !== null}
          onClose={() => setDeleteTarget(null)}
          title="Hapus Aktivitas MBKM"
          maxWidth="sm"
        >
          <div class="flex flex-col gap-4 text-sm">
            <p class="text-secondary-700 dark:text-secondary-200">
              Hapus aktivitas <strong>{deleteTarget()?.judul}</strong>? Seluruh anggota, pembimbing, dan rekognisi SKS
              pada aktivitas ini ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Batal
              </Button>
              <Button variant="danger" size="sm" loading={busy()} onClick={() => void confirmDelete()}>
                Hapus
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
