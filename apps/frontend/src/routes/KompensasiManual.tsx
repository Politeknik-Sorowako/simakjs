import { createMemo, createResource, createSignal, For, type JSX, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect, type SelectOption } from '../components/ui/SearchableSelect';
import { SortableHeader } from '../components/ui/SortableHeader';
import { StudentAvatar } from '../components/ui/StudentAvatar';
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
import { type ExportColumn, exportToExcel } from '../utils/export';
import { fmtWaktu, getTodayString } from '../utils/format';

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
  const isManagerRole = () => ['admin', 'super_admin', 'dosen', 'prodi'].includes(user()?.role || '');
  const tableColumnCount = () => (isManagerRole() ? 1 : 0) + 8 + (isAdminRole() ? 1 : 0);
  const [showImportModal, setShowImportModal] = createSignal(false);

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
  const [tanggal, setTanggal] = createSignal(getTodayString());
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

  // Bulk selection state
  const [selectedIds, setSelectedIds] = createSignal<Set<number>>(new Set());
  const [showBulkJenisModal, setShowBulkJenisModal] = createSignal(false);
  const [bulkJenis, setBulkJenis] = createSignal('');
  const [showBulkDurasiModal, setShowBulkDurasiModal] = createSignal(false);
  const [bulkDurasi, setBulkDurasi] = createSignal('');
  const [showBulkDeleteModal, setShowBulkDeleteModal] = createSignal(false);
  const [isBulkProcessing, setIsBulkProcessing] = createSignal(false);
  const [isExporting, setIsExporting] = createSignal(false);

  const clearSelection = () => setSelectedIds(new Set<number>());

  const toggleRowSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    const rows = kompensasiList()?.data || [];
    const pageIds = rows.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds().has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const isAllPageSelected = () => {
    const rows = kompensasiList()?.data || [];
    return rows.length > 0 && rows.every((r) => selectedIds().has(r.id));
  };

  const isRowSelected = (id: number) => selectedIds().has(id);

  const handleBulkDelete = async () => {
    const ids = [...selectedIds()];
    if (ids.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await kompensasiManualController.bulkDelete(ids);
      toast.showToast(`${res.deleted} data kompensasi berhasil dihapus`, 'success');
      setShowBulkDeleteModal(false);
      clearSelection();
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus data massal', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkJenisChange = async () => {
    const ids = [...selectedIds()];
    if (ids.length === 0 || !bulkJenis()) {
      toast.showToast('Silakan pilih jenis kompensasi terlebih dahulu', 'error');
      return;
    }
    setIsBulkProcessing(true);
    try {
      const res = await kompensasiManualController.bulkUpdate(ids, { jenisKompen: bulkJenis() as JenisKompen });
      toast.showToast(`${res.updated} data kompensasi berhasil diperbarui`, 'success');
      setShowBulkJenisModal(false);
      setBulkJenis('');
      clearSelection();
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal mengubah jenis massal', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkDurasiChange = async () => {
    const ids = [...selectedIds()];
    const dur = parseInt(bulkDurasi());
    if (ids.length === 0 || isNaN(dur) || dur < 0) {
      toast.showToast('Durasi menit tidak boleh bernilai negatif', 'error');
      return;
    }
    setIsBulkProcessing(true);
    try {
      const res = await kompensasiManualController.bulkUpdate(ids, { durasiMenit: dur });
      toast.showToast(`${res.updated} data kompensasi berhasil diperbarui`, 'success');
      setShowBulkDurasiModal(false);
      setBulkDurasi('');
      clearSelection();
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal mengubah durasi massal', 'error');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await kompensasiManualController.getAll({
        search: filterSearch() || undefined,
        tanggal: filterTanggal() || undefined,
        jenisKompen: filterJenis() || undefined,
        sortBy: sortBy() || undefined,
        sortOrder: sortBy() ? sortOrder() : undefined,
        page: 1,
        limit: 99999,
      });
      const cols: ExportColumn[] = [
        { header: 'NIM', accessor: 'mahasiswaNim' },
        { header: 'Nama Mahasiswa', accessor: 'mahasiswaNama' },
        { header: 'Tanggal', accessor: 'tanggal' },
        {
          header: 'Jenis Kompensasi',
          accessor: (r) => JENIS_KOMPEN_LABEL[(r as { jenisKompen: JenisKompen }).jenisKompen] || '-',
        },
        { header: 'Durasi (menit)', accessor: 'durasiMenit' },
        { header: 'Keterangan', accessor: 'keterangan' },
        { header: 'Waktu Pencatatan', accessor: (r) => fmtWaktu((r as { createdAt?: string }).createdAt) },
      ];
      exportToExcel(res.data, cols, `Kompensasi_Manual_${getTodayString()}`);
      toast.showToast('Data kompensasi manual berhasil diunduh (.xlsx)', 'success');
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal mengunduh excel', 'error');
    } finally {
      setIsExporting(false);
    }
  };

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

  const isDurasiRequired = () => jenisKompen() !== '';
  const isFullDay = () => JENIS_FULL_DAY.includes(jenisKompen() as JenisKompen);
  const isDurasiManual = () => ['terlambat', 'rusak'].includes(jenisKompen() as JenisKompen);

  const handleJenisChange = (value: string) => {
    setJenisKompen(value);
    if (JENIS_FULL_DAY.includes(value as JenisKompen) && durasiMenit() <= 0) {
      setDurasiMenit(480);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setSelectedMhsId(null);
    setTanggal(getTodayString());
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
    if (isDurasiRequired() && durasiMenit() < 0) {
      toast.showToast('Durasi menit tidak boleh bernilai negatif', 'error');
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
      if (durasiMenit() !== undefined && durasiMenit() !== null && !isNaN(durasiMenit())) {
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
            <div class="flex items-center gap-3">
              <Button onClick={() => setShowImportModal(true)} variant="secondary">
                Impor CSV
              </Button>
              <Button onClick={handleExportExcel} disabled={isExporting()} variant="success">
                {isExporting() ? 'Mengunduh...' : 'Ekspor Excel (.xlsx)'}
              </Button>
              <Button onClick={openCreateModal} variant="primary">
                + Tambah Kompensasi
              </Button>
            </div>
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

        {/* Bulk Action Bar */}
        <Show when={selectedIds().size > 0}>
          <div class="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-900/60 rounded-2xl px-4 py-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <span class="text-xs font-bold text-primary-800 dark:text-primary-300">
              {selectedIds().size} data terpilih
            </span>
            <div class="flex flex-wrap items-center gap-2">
              <Button onClick={() => setShowBulkJenisModal(true)} variant="secondary" class="text-xs py-1.5 px-3">
                Ubah Jenis Massal
              </Button>
              <Button onClick={() => setShowBulkDurasiModal(true)} variant="secondary" class="text-xs py-1.5 px-3">
                Ubah Durasi Massal
              </Button>
              <Button onClick={() => setShowBulkDeleteModal(true)} variant="danger" class="text-xs py-1.5 px-3">
                Hapus Massal
              </Button>
              <Button onClick={clearSelection} variant="ghost" class="text-xs py-1.5 px-3">
                Batal
              </Button>
            </div>
          </div>
        </Show>

        {/* Data Table */}
        <Table
          headers={
            [
              ...(isManagerRole()
                ? [
                    <input
                      type="checkbox"
                      checked={isAllPageSelected()}
                      onChange={() => toggleSelectAllPage()}
                      title="Pilih semua baris di halaman ini"
                      class="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />,
                  ]
                : []),
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
              <SortableHeader field="createdAt" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Waktu Pencatatan
              </SortableHeader>,
              'Keterangan',
              ...(isAdminRole() ? ['Aksi'] : []),
            ] as (string | JSX.Element)[]
          }
        >
          <For each={kompensasiList()?.data || []}>
            {(rec, idx) => (
              <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40 transition-colors">
                <Show when={isManagerRole()}>
                  <td class="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={isRowSelected(rec.id)}
                      onChange={() => toggleRowSelect(rec.id)}
                      class="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                </Show>
                <td class="py-3 px-4 font-mono text-secondary-500">
                  {((kompensasiList()?.meta?.page || 1) - 1) * 20 + idx() + 1}
                </td>
                <td class="py-3 px-4 font-semibold text-secondary-800 dark:text-secondary-100">{rec.mahasiswaNim}</td>
                <td class="py-3 px-4 font-bold text-secondary-900 dark:text-white">
                  <div class="flex items-center gap-2">
                    <StudentAvatar foto={rec.mahasiswaFoto} nama={rec.mahasiswaNama} nim={rec.mahasiswaNim} size="sm" />
                    {rec.mahasiswaNama}
                  </div>
                </td>
                <td class="py-3 px-4 text-secondary-700 dark:text-secondary-300">{rec.tanggal}</td>
                <td class="py-3 px-4">
                  <Badge variant={getJenisBadgeVariant(rec.jenisKompen)}>
                    {JENIS_KOMPEN_LABEL[rec.jenisKompen] || rec.jenisKompen}
                  </Badge>
                </td>
                <td class="py-3 px-4 font-semibold text-brand-600 dark:text-brand-400">{rec.durasiMenit} menit</td>
                <td class="py-3 px-4 text-secondary-600 dark:text-secondary-300">{fmtWaktu(rec.createdAt)}</td>
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
                onChange={(e: Event) => handleJenisChange((e.currentTarget as HTMLSelectElement).value)}
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <Input
                type="number"
                min={0}
                label="Durasi (menit)"
                required={isDurasiRequired()}
                placeholder={isFullDay() ? '480' : 'Contoh: 60'}
                value={durasiMenit() || ''}
                onChange={(e: Event) => setDurasiMenit(parseInt((e.currentTarget as HTMLInputElement).value) || 0)}
              />
              <Show when={isFullDay()}>
                <p class="text-xs text-secondary-500 dark:text-secondary-400">
                  Default 480 menit (satu hari penuh) untuk Sakit/Izin/Alpa — dapat diubah.
                </p>
              </Show>
              <Show when={durasiMenit() === 0}>
                <p class="text-xs text-emerald-600 dark:text-emerald-400">
                  Durasi 0 menit = anulir kompensasi (tetap tercatat, tanpa denda jam kompensasi).
                </p>
              </Show>
              <Show when={isDurasiManual() && durasiMenit() === 0}>
                <p class="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Durasi 0 untuk Terlambat/Rusak = anulir kompensasi. Pastikan ini sesuai kebijakan kampus.
                </p>
              </Show>
              <Show when={jenisKompen() === 'rusak'}>
                <p class="text-xs text-secondary-500 dark:text-secondary-400">
                  Durasi RUSAK (kerusakan fasilitas) tidak dibatasi 480 menit/hari.
                </p>
              </Show>
            </div>

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

        {/* Import CSV Modal */}
        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          title="Kompensasi Mahasiswa"
          importUrl="/kompensasi-manual/import"
          templateHeaders={['nim', 'tanggal', 'jenis_kompen', 'durasi_menit', 'keterangan']}
          customTemplateRows={[
            ['nim', 'tanggal', 'jenis_kompen', 'durasi_menit', 'keterangan'],
            ['202301001', '2026-06-27', 'T', '30', 'Terlambat masuk praktikum'],
            ['202301002', '2026-06-27', 'rusak', '60', 'Kerusakan alat laboratorium'],
          ]}
          description="Jenis kompensasi mendukung kode singkatan A (Alpa), S (Sakit), I (Izin), R (Rusak), dan T/Telat (Terlambat), atau nama lengkapnya. Durasi menit hanya wajib untuk Terlambat/Rusak; untuk Sakit/Izin/Alpa durasi kosong akan dihitung 480 menit. Durasi 0 menit berarti anulir kompensasi (tetap tercatat tanpa denda)."
          onSuccess={refetch}
        />

        {/* Bulk Delete Confirmation Modal */}
        <Modal
          isOpen={showBulkDeleteModal()}
          onClose={() => setShowBulkDeleteModal(false)}
          title="Konfirmasi Hapus Massal"
        >
          <div class="flex flex-col gap-4">
            <p class="text-xs text-secondary-600 dark:text-secondary-300">
              Apakah Anda yakin ingin menghapus{' '}
              <strong class="text-secondary-900 dark:text-white">{selectedIds().size} data kompensasi</strong> yang
              terpilih? Data akan dihapus beserta sinkronisasi di tabel ketidakhadiran. Tindakan ini tidak dapat
              dibatalkan.
            </p>
            <div class="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={() => setShowBulkDeleteModal(false)} variant="secondary">
                Batal
              </Button>
              <Button onClick={handleBulkDelete} variant="danger" disabled={isBulkProcessing()}>
                {isBulkProcessing() ? 'Menghapus...' : 'Ya, Hapus Data Terpilih'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk Update Jenis Modal */}
        <Modal
          isOpen={showBulkJenisModal()}
          onClose={() => setShowBulkJenisModal(false)}
          title="Ubah Jenis Kompensasi Massal"
        >
          <div class="flex flex-col gap-4">
            <p class="text-xs text-secondary-600 dark:text-secondary-300">
              Ubah jenis kompensasi untuk{' '}
              <strong class="text-secondary-900 dark:text-white">{selectedIds().size}</strong> data terpilih menjadi:
            </p>
            <Input
              type="select"
              isSelect
              label="Jenis Kompensasi"
              selectOptions={[{ value: '', label: '-- Pilih Jenis --' }, ...JENIS_OPTIONS]}
              value={bulkJenis()}
              onChange={(e: Event) => setBulkJenis((e.currentTarget as HTMLSelectElement).value)}
            />
            <div class="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={() => setShowBulkJenisModal(false)} variant="secondary">
                Batal
              </Button>
              <Button onClick={handleBulkJenisChange} variant="primary" disabled={isBulkProcessing()}>
                {isBulkProcessing() ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Bulk Update Durasi Modal */}
        <Modal isOpen={showBulkDurasiModal()} onClose={() => setShowBulkDurasiModal(false)} title="Ubah Durasi Massal">
          <div class="flex flex-col gap-4">
            <p class="text-xs text-secondary-600 dark:text-secondary-300">
              Ubah durasi (menit) untuk <strong class="text-secondary-900 dark:text-white">{selectedIds().size}</strong>{' '}
              data terpilih:
            </p>
            <Input
              type="number"
              min={0}
              label="Durasi (menit)"
              placeholder="Contoh: 60"
              value={bulkDurasi()}
              onInput={(e: Event) => setBulkDurasi((e.currentTarget as HTMLInputElement).value)}
            />
            <div class="flex justify-end gap-2 mt-2">
              <Button type="button" onClick={() => setShowBulkDurasiModal(false)} variant="secondary">
                Batal
              </Button>
              <Button onClick={handleBulkDurasiChange} variant="primary" disabled={isBulkProcessing()}>
                {isBulkProcessing() ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
