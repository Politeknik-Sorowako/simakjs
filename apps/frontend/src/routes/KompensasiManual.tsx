import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect, type SelectOption } from '../components/ui/SearchableSelect';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  JENIS_KOMPEN_LABEL,
  type JenisKompen,
  type KompensasiManualRecord,
  kompensasiManualController,
} from '../controllers/kompensasiManualController';
import { Mahasiswa, mahasiswaController } from '../controllers/mahasiswaController';

const JENIS_OPTIONS: SelectOption[] = Object.entries(JENIS_KOMPEN_LABEL).map(([value, label]) => ({
  value,
  label,
}));

const JENIS_FULL_DAY: JenisKompen[] = ['sakit', 'izin', 'alpa'];

export default function KompensasiManual() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  const isAdminRole = () => ['admin', 'super_admin'].includes(user()?.role || '');
  const tableColumnCount = () => (isAdminRole() ? 8 : 7);

  // Filters state
  const [filterSearch, setFilterSearch] = createSignal('');
  const [filterTanggal, setFilterTanggal] = createSignal('');
  const [filterJenis, setFilterJenis] = createSignal('');
  const [sortBy, setSortBy] = createSignal('');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');
  const [page, setPage] = createSignal(1);

  const toggleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'tanggal' ? 'desc' : 'asc');
    }
    setPage(1);
  };

  // Form & Modal states
  const [showFormModal, setShowFormModal] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [selectedMhsId, setSelectedMhsId] = createSignal<number | string | null>(null);
  const [tanggal, setTanggal] = createSignal(new Date().toISOString().split('T')[0]);
  const [jenisKompen, setJenisKompen] = createSignal<string | number>('');
  const [durasiMenit, setDurasiMenit] = createSignal(0);
  const [keterangan, setKeterangan] = createSignal('');
  const [searchMhsInput, setSearchMhsInput] = createSignal('');
  const [mhsPage, setMhsPage] = createSignal(1);
  const [isSubmitting, setIsSubmitting] = createSignal(false);

  // Warning Confirmation Modal state
  const [showWarningModal, setShowWarningModal] = createSignal(false);
  const [warningMessage, setWarningMessage] = createSignal('');

  // Delete Confirmation Modal state
  const [showDeleteModal, setShowDeleteModal] = createSignal(false);
  const [deletingRecord, setDeletingRecord] = createSignal<
    (KompensasiManualRecord & { mahasiswaNama?: string }) | null
  >(null);
  const [isDeleting, setIsDeleting] = createSignal(false);

  // Resources
  const [allMhs, setAllMhs] = createSignal<Mahasiswa[]>([]);
  const [mhsData] = createResource(
    () => ({ search: searchMhsInput(), page: mhsPage() }),
    async ({ search, page }) => {
      const res = await mahasiswaController.getAll(search || undefined, page, 50, undefined, {
        filterStatus: 'aktif',
      });
      if (page === 1) {
        setAllMhs(res.data || []);
      } else {
        setAllMhs((prev) => [...prev, ...(res.data || [])]);
      }
      return res;
    },
  );

  const mhsOptions = createMemo<SelectOption[]>(() => {
    const list = allMhs();
    return [...list]
      .sort((a, b) => String(a.nim).localeCompare(String(b.nim), 'id', { numeric: true }))
      .map((m) => ({ value: m.id, label: `${m.nim} — ${m.nama}` }));
  });

  const mhsHasMore = () => {
    const meta = mhsData()?.meta;
    if (!meta) return false;
    return meta.page < meta.totalPages;
  };

  const handleMhsSearch = (query: string) => {
    setAllMhs([]);
    setMhsPage(1);
    setSearchMhsInput(query);
  };

  const handleLoadMore = () => {
    if (mhsHasMore()) setMhsPage((p) => p + 1);
  };

  const [kompensasiList, { refetch }] = createResource(
    () => ({
      search: filterSearch(),
      tanggal: filterTanggal(),
      jenisKompen: filterJenis(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
      page: page(),
    }),
    async (params) => {
      return kompensasiManualController.getAll({
        search: params.search || undefined,
        tanggal: params.tanggal || undefined,
        jenisKompen: params.jenisKompen || undefined,
        sortBy: params.sortBy || undefined,
        sortOrder: params.sortBy ? params.sortOrder : undefined,
        page: params.page,
        limit: 20,
      });
    },
  );

  const isDurasiHidden = () => JENIS_FULL_DAY.includes(jenisKompen() as JenisKompen);
  const isDurasiRequired = () => !isDurasiHidden() && jenisKompen() !== '';

  const resetForm = () => {
    setEditingId(null);
    setSelectedMhsId(null);
    setTanggal(new Date().toISOString().split('T')[0]);
    setJenisKompen('');
    setDurasiMenit(0);
    setKeterangan('');
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (rec: KompensasiManualRecord & { mahasiswaNama?: string }) => {
    setEditingId(rec.id);
    setSelectedMhsId(rec.mahasiswaId);
    setTanggal(rec.tanggal);
    setJenisKompen(rec.jenisKompen);
    setDurasiMenit(rec.durasiMenit);
    setKeterangan(rec.keterangan || '');
    setShowFormModal(true);
  };

  const openDeleteModal = (rec: KompensasiManualRecord & { mahasiswaNama?: string }) => {
    setDeletingRecord(rec);
    setShowDeleteModal(true);
  };

  const handlePreSaveCheck = async (e: Event) => {
    e.preventDefault();
    const mhsId = selectedMhsId();
    if (!mhsId) {
      toast.showToast('Silakan pilih mahasiswa terlebih dahulu', 'error');
      return;
    }
    if (!jenisKompen()) {
      toast.showToast('Silakan pilih jenis kompensasi', 'error');
      return;
    }
    if (isDurasiRequired() && (!durasiMenit() || durasiMenit() <= 0)) {
      toast.showToast('Durasi menit wajib diisi untuk jenis terlambat/rusak', 'error');
      return;
    }

    // Check duplicate risk
    try {
      const risks = await kompensasiManualController.getDuplicateRisk(Number(mhsId), tanggal());
      if (risks && risks.length > 0 && risks[0].count > 0) {
        const item = risks[0];
        setWarningMessage(
          `Mahasiswa ${item.nama} (${item.nim}) sudah memiliki ${item.count} catatan kompensasi pada tanggal ${tanggal()} (Total: ${item.totalMenit} menit). Apakah Anda yakin ingin menyimpan data kompensasi ini?`,
        );
        setShowWarningModal(true);
        return;
      }
    } catch {
      // Continue if check fails
    }

    await executeSave();
  };

  const executeSave = async () => {
    setIsSubmitting(true);
    setShowWarningModal(false);
    try {
      const editId = editingId();
      const payload: {
        mahasiswaId: number;
        tanggal: string;
        jenisKompen: JenisKompen;
        durasiMenit?: number;
        keterangan?: string;
      } = {
        mahasiswaId: Number(selectedMhsId()),
        tanggal: tanggal(),
        jenisKompen: jenisKompen() as JenisKompen,
        keterangan: keterangan() || undefined,
      };
      if (!isDurasiHidden()) {
        payload.durasiMenit = durasiMenit();
      }

      if (editId) {
        await kompensasiManualController.update(editId, payload);
        toast.showToast('Data kompensasi berhasil diperbarui', 'success');
      } else {
        const res = await kompensasiManualController.create(payload);
        if (res.isDuplicateRisk) {
          toast.showToast(
            'Kompensasi berhasil disimpan (Catatan: Terdapat kompensasi lain di tanggal yang sama).',
            'info',
          );
        } else {
          toast.showToast('Kompensasi berhasil ditambahkan', 'success');
        }
      }

      setShowFormModal(false);
      resetForm();
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menyimpan kompensasi', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    const rec = deletingRecord();
    if (!rec) return;
    setIsDeleting(true);
    try {
      await kompensasiManualController.remove(rec.id);
      toast.showToast('Data kompensasi berhasil dihapus', 'success');
      setShowDeleteModal(false);
      setDeletingRecord(null);
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus data', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getJenisBadgeVariant = (
    jenis: JenisKompen,
  ): 'success' | 'info' | 'danger' | 'warning' | 'accent' | 'default' => {
    switch (jenis) {
      case 'sakit':
        return 'warning';
      case 'izin':
        return 'info';
      case 'alpa':
        return 'danger';
      case 'terlambat':
        return 'default';
      case 'rusak':
        return 'accent';
      default:
        return 'default';
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header Bar */}
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-secondary-900 dark:text-white">Kompensasi Manual</h1>
            <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
              Daftar pencatatan kompensasi manual mahasiswa (Sakit, Izin, Alpa, Terlambat, dan Alat Rusak).
            </p>
          </div>
          <Show when={['admin', 'super_admin', 'dosen', 'prodi'].includes(user()?.role || '')}>
            <Button onClick={openCreateModal} variant="primary">
              + Tambah Kompensasi
            </Button>
          </Show>
        </div>

        {/* Filter Bar */}
        <div class="bg-white dark:bg-secondary-900 p-4 rounded-2xl border border-secondary-200 dark:border-secondary-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div class="flex-1">
            <Input
              type="text"
              placeholder="Cari NIM atau Nama Mahasiswa..."
              value={filterSearch()}
              onInput={(e) => {
                setFilterSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <div class="w-full md:w-48">
            <Input
              type="date"
              value={filterTanggal()}
              onChange={(e: Event) => {
                setFilterTanggal((e.currentTarget as HTMLInputElement).value);
                setPage(1);
              }}
            />
          </div>
          <div class="w-full md:w-48">
            <Input
              type="select"
              isSelect
              selectOptions={[{ value: '', label: 'Semua Jenis' }, ...JENIS_OPTIONS]}
              value={filterJenis()}
              onChange={(e: Event) => {
                setFilterJenis((e.currentTarget as HTMLSelectElement).value);
                setPage(1);
              }}
            />
          </div>
          <Show when={filterSearch() || filterTanggal() || filterJenis()}>
            <Button
              onClick={() => {
                setFilterSearch('');
                setFilterTanggal('');
                setFilterJenis('');
                setPage(1);
              }}
              variant="secondary"
              class="shrink-0"
            >
              Reset Filter
            </Button>
          </Show>
        </div>

        {/* Data Table */}
        <Table
          headers={
            isAdminRole()
              ? [
                  'No',
                  <SortableHeader field="mahasiswaNim" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    NIM
                  </SortableHeader>,
                  <SortableHeader field="mahasiswaNama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Nama Mahasiswa
                  </SortableHeader>,
                  <SortableHeader field="tanggal" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Tanggal
                  </SortableHeader>,
                  <SortableHeader field="jenisKompen" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Jenis
                  </SortableHeader>,
                  <SortableHeader field="durasiMenit" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Durasi
                  </SortableHeader>,
                  'Keterangan',
                  'Aksi',
                ]
              : [
                  'No',
                  <SortableHeader field="mahasiswaNim" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    NIM
                  </SortableHeader>,
                  <SortableHeader field="mahasiswaNama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Nama Mahasiswa
                  </SortableHeader>,
                  <SortableHeader field="tanggal" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Tanggal
                  </SortableHeader>,
                  <SortableHeader field="jenisKompen" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Jenis
                  </SortableHeader>,
                  <SortableHeader field="durasiMenit" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                    Durasi
                  </SortableHeader>,
                  'Keterangan',
                ]
          }
        >
          <For each={kompensasiList()?.data || []}>
            {(rec, idx) => (
              <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40 transition-colors">
                <td class="py-3 px-4 font-mono text-secondary-500">
                  {((kompensasiList()?.meta?.page || 1) - 1) * 20 + idx() + 1}
                </td>
                <td class="py-3 px-4 font-semibold text-secondary-800 dark:text-secondary-100">{rec.mahasiswaNim}</td>
                <td class="py-3 px-4 font-bold text-secondary-900 dark:text-white">{rec.mahasiswaNama}</td>
                <td class="py-3 px-4 text-secondary-700 dark:text-secondary-300">{rec.tanggal}</td>
                <td class="py-3 px-4">
                  <Badge variant={getJenisBadgeVariant(rec.jenisKompen)}>
                    {JENIS_KOMPEN_LABEL[rec.jenisKompen] || rec.jenisKompen}
                  </Badge>
                </td>
                <td class="py-3 px-4 font-semibold text-brand-600 dark:text-brand-400">{rec.durasiMenit} menit</td>
                <td class="py-3 px-4 text-secondary-600 dark:text-secondary-300 max-w-xs truncate">
                  {rec.keterangan || '-'}
                </td>
                <Show when={isAdminRole()}>
                  <td class="py-3 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <Button onClick={() => openEditModal(rec)} variant="secondary" class="text-xs py-1 px-2.5">
                        Edit
                      </Button>
                      <Button onClick={() => openDeleteModal(rec)} variant="danger" class="text-xs py-1 px-2.5">
                        Hapus
                      </Button>
                    </div>
                  </td>
                </Show>
              </tr>
            )}
          </For>
          <Show when={(kompensasiList()?.data || []).length === 0}>
            <tr>
              <td
                colSpan={tableColumnCount()}
                class="py-12 text-center text-xs text-secondary-500 dark:text-secondary-400"
              >
                Tidak ada data kompensasi manual yang ditemukan.
              </td>
            </tr>
          </Show>
        </Table>

        {/* Pagination Controls */}
        <Show when={(kompensasiList()?.meta?.totalPages || 0) > 1}>
          <div class="px-6 py-4 border-t border-secondary-100 dark:border-secondary-800 flex items-center justify-between text-xs">
            <span class="text-secondary-500">
              Menampilkan Halaman {kompensasiList()?.meta?.page} dari {kompensasiList()?.meta?.totalPages} (
              {kompensasiList()?.meta?.total} Total Data)
            </span>
            <div class="flex items-center gap-2">
              <Button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page() <= 1}
                variant="secondary"
                class="text-xs py-1 px-3"
              >
                Sebelumnya
              </Button>
              <Button
                onClick={() => setPage((p) => Math.min(kompensasiList()?.meta?.totalPages || 1, p + 1))}
                disabled={page() >= (kompensasiList()?.meta?.totalPages || 1)}
                variant="secondary"
                class="text-xs py-1 px-3"
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        </Show>

        {/* Modal Input / Edit Form */}
        <Modal
          isOpen={showFormModal()}
          onClose={() => setShowFormModal(false)}
          title={editingId() ? 'Edit Kompensasi Manual' : 'Tambah Kompensasi Manual'}
        >
          <form onSubmit={handlePreSaveCheck} class="flex flex-col gap-4">
            <SearchableSelect
              label="Mahasiswa"
              required
              options={mhsOptions()}
              value={selectedMhsId()}
              onChange={setSelectedMhsId}
              placeholder="Cari NIM atau Nama Mahasiswa..."
              onSearch={handleMhsSearch}
              isLoading={mhsData.loading}
              hasMore={mhsHasMore()}
              onLoadMore={handleLoadMore}
            />

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Tanggal"
                required
                value={tanggal()}
                onChange={(e: Event) => setTanggal((e.currentTarget as HTMLInputElement).value)}
              />
              <Input
                type="select"
                isSelect
                label="Jenis Kompensasi"
                required
                selectOptions={[{ value: '', label: '-- Pilih Jenis --' }, ...JENIS_OPTIONS]}
                value={jenisKompen()}
                onChange={(e: Event) => setJenisKompen((e.currentTarget as HTMLSelectElement).value)}
              />
            </div>

            <Show
              when={!isDurasiHidden()}
              fallback={
                <div class="rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 px-4 py-3 text-xs text-brand-700 dark:text-brand-300">
                  Durasi otomatis 480 menit (satu hari penuh) untuk jenis Sakit/Izin/Alpa.
                </div>
              }
            >
              <Input
                type="number"
                min={1}
                max={480}
                label="Durasi (menit)"
                required={isDurasiRequired()}
                placeholder="Contoh: 60"
                value={durasiMenit() || ''}
                onChange={(e: Event) => setDurasiMenit(parseInt((e.currentTarget as HTMLInputElement).value) || 0)}
              />
            </Show>

            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                Keterangan
              </label>
              <textarea
                rows={3}
                value={keterangan()}
                onInput={(e) => setKeterangan(e.currentTarget.value)}
                placeholder="Catatan opsional (misal: surat dokter, izin keluarga, dll.)"
                class="w-full px-4 py-2.5 rounded-xl border border-secondary-200 bg-white text-sm text-secondary-800 placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100 dark:placeholder:text-secondary-500"
              />
            </div>

            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-secondary-100 dark:border-secondary-800">
              <Button type="button" onClick={() => setShowFormModal(false)} variant="secondary">
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting()}>
                {isSubmitting() ? 'Menyimpan...' : editingId() ? 'Simpan Perubahan' : 'Simpan Kompensasi'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Warning Confirmation Modal */}
        <Modal
          isOpen={showWarningModal()}
          onClose={() => setShowWarningModal(false)}
          title="⚠️ Konfirmasi Peringatan Kompensasi"
        >
          <div class="flex flex-col gap-4">
            <div class="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed">
              {warningMessage()}
            </div>
            <div class="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={() => setShowWarningModal(false)} variant="secondary">
                Batal
              </Button>
              <Button onClick={executeSave} variant="primary" disabled={isSubmitting()}>
                {isSubmitting() ? 'Menyimpan...' : 'Ya, Lanjutkan Simpan'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={showDeleteModal()} onClose={() => setShowDeleteModal(false)} title="Konfirmasi Hapus Kompensasi">
          <div class="flex flex-col gap-4">
            <p class="text-xs text-secondary-600 dark:text-secondary-300">
              Apakah Anda yakin ingin menghapus data kompensasi{' '}
              <strong class="text-secondary-900 dark:text-white">
                {deletingRecord()?.mahasiswaNama} ({deletingRecord()?.tanggal})
              </strong>
              ? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={() => setShowDeleteModal(false)} variant="secondary">
                Batal
              </Button>
              <Button onClick={handleDelete} variant="danger" disabled={isDeleting()}>
                {isDeleting() ? 'Menghapus...' : 'Ya, Hapus Data'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
