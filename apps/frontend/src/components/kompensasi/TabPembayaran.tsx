import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { kompensasiAdminController, type PaymentRow } from '../../controllers/kompensasiAdminController';
import { mahasiswaController } from '../../controllers/mahasiswaController';
import { presensiController } from '../../controllers/presensiController';
import { prodiController } from '../../controllers/prodiController';
import { type ExportColumn, exportToExcel, exportToPDF } from '../../utils/export';
import { fmtTanggal, getTodayString } from '../../utils/format';
import { Button } from '../ui/Button';
import { ImportCsvModal } from '../ui/ImportCsvModal';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect';
import { SortableHeader } from '../ui/SortableHeader';
import { StudentAvatar } from '../ui/StudentAvatar';
import { Table } from '../ui/Table';
import { EmptyState, ErrorState, FilterField, RefreshingBadge, TableLoadingFallback } from './shared';
import type { SharedKompensasiFilters } from './sharedKompensasiFilters';

const PER_PAGE_DEFAULT = 20;

interface TabPembayaranProps {
  filters: SharedKompensasiFilters;
  canManage: boolean;
}

interface PayForm {
  mahasiswaId: number | null;
  jumlahMenit: number;
  tanggal: string;
  keterangan: string;
}

export default function TabPembayaran(props: TabPembayaranProps) {
  const toast = useToast();

  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(PER_PAGE_DEFAULT);
  const [sortBy, setSortBy] = createSignal('tanggal');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = createSignal<Set<number>>(new Set());
  const [payModal, setPayModal] = createSignal(false);
  const [editingPay, setEditingPay] = createSignal<PaymentRow | null>(null);
  const [form, setForm] = createSignal<PayForm>({
    mahasiswaId: null,
    jumlahMenit: 60,
    tanggal: getTodayString(),
    keterangan: '',
  });
  const [saving, setSaving] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal<{ type: 'bulk' } | { type: 'row'; row: PaymentRow } | null>(
    null,
  );
  const [deleting, setDeleting] = createSignal(false);
  const [showImportModal, setShowImportModal] = createSignal(false);
  const [isExporting, setIsExporting] = createSignal(false);

  const [mhsSearch, setMhsSearch] = createSignal('');
  const [mhsOptions, setMhsOptions] = createSignal<SelectOption[]>([]);

  let mhsTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(mhsTimer));

  // Reset halaman ke 1 setiap filter bersama berubah (search memakai nilai ter-debounce agar satu fetch).
  createEffect(() => {
    props.filters.debouncedSearch();
    props.filters.prodiId();
    props.filters.tglDari();
    props.filters.tglSampai();
    setPage(1);
  });

  createEffect(() => {
    const q = mhsSearch();
    clearTimeout(mhsTimer);
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
      }
    }, 300);
  });

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: props.filters.debouncedSearch(),
      prodiId: props.filters.prodiId(),
      tglDari: props.filters.tglDari(),
      tglSampai: props.filters.tglSampai(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
    }),
    (params) =>
      kompensasiAdminController.getRiwayatPembayaran({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        prodiId: params.prodiId,
        tglDari: params.tglDari || undefined,
        tglSampai: params.tglSampai || undefined,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
  );

  const [rows, setRows] = createSignal<PaymentRow[]>([]);
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

  const prodiOptions = (): SelectOption[] => [
    { value: '', label: 'Semua Prodi' },
    ...(prodis()?.data || []).map((p) => ({ value: p.id, label: p.nama })),
  ];

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    const current = rows();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) current.forEach((r) => next.add(r.id));
      else current.forEach((r) => next.delete(r.id));
      return next;
    });
  };

  const isAllSelected = () => {
    const current = rows();
    return current.length > 0 && current.every((r) => selectedIds().has(r.id));
  };

  const openAdd = () => {
    setEditingPay(null);
    setForm({ mahasiswaId: null, jumlahMenit: 60, tanggal: getTodayString(), keterangan: '' });
    setMhsSearch('');
    setMhsOptions([]);
    setPayModal(true);
  };

  const openEdit = (row: PaymentRow) => {
    setEditingPay(row);
    setForm({
      mahasiswaId: row.mahasiswaId,
      jumlahMenit: row.jumlahMenit,
      tanggal: row.tanggal,
      keterangan: row.keterangan,
    });
    setMhsOptions([{ value: row.mahasiswaId, label: `${row.nim} — ${row.nama}` }]);
    setPayModal(true);
  };

  const savePayment = async () => {
    if (saving()) return;
    const f = form();
    if (!f.mahasiswaId || f.jumlahMenit <= 0) {
      toast.showToast('Pilih mahasiswa dan isi jumlah menit', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        mahasiswaId: f.mahasiswaId,
        jumlahMenit: f.jumlahMenit,
        tanggal: f.tanggal,
        keterangan: f.keterangan,
      };
      if (editingPay()) {
        await presensiController.updateKompensasiBayar(editingPay()!.id, payload);
        toast.showToast('Pembayaran kompensasi berhasil diubah', 'success');
      } else {
        await presensiController.bayarKompensasi(payload);
        toast.showToast('Pembayaran kompensasi berhasil dicatat', 'success');
      }
      setPayModal(false);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal menyimpan pembayaran', 'error');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (deleting()) return;
    const target = confirmDelete();
    if (!target) return;
    setDeleting(true);
    try {
      if (target.type === 'bulk') {
        const ids = [...selectedIds()];
        const res = await kompensasiAdminController.bulkDeletePembayaran(ids);
        toast.showToast(`${res.deleted} pembayaran dihapus`, 'success');
        setSelectedIds(new Set<number>());
      } else {
        await kompensasiAdminController.deletePembayaran(target.row.id);
        toast.showToast('Pembayaran berhasil dihapus', 'success');
      }
      setConfirmDelete(null);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal menghapus pembayaran', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const exportColumns = (): ExportColumn[] => [
    { header: 'Tanggal Bayar', accessor: 'tanggal' },
    { header: 'NIM', accessor: 'nim' },
    { header: 'Nama Mahasiswa', accessor: 'nama' },
    { header: 'Program Studi', accessor: 'prodiNama' },
    { header: 'Jumlah Menit', accessor: 'jumlahMenit' },
    { header: 'Keterangan', accessor: 'keterangan' },
    { header: 'Petugas', accessor: 'petugasNama' },
  ];

  const fetchAllFiltered = async (): Promise<PaymentRow[]> => {
    const all: PaymentRow[] = [];
    let p = 1;
    const limitP = 200;
    for (;;) {
      const res = await kompensasiAdminController.getRiwayatPembayaran({
        page: p,
        limit: limitP,
        search: props.filters.debouncedSearch() || undefined,
        prodiId: props.filters.prodiId(),
        tglDari: props.filters.tglDari() || undefined,
        tglSampai: props.filters.tglSampai() || undefined,
      });
      all.push(...res.data);
      if (p * limitP >= res.meta.total) break;
      p += 1;
      if (p > 50) break;
    }
    return all;
  };

  const handleExportExcel = async () => {
    if (isExporting()) return;
    setIsExporting(true);
    try {
      const rows = await fetchAllFiltered();
      exportToExcel(rows, exportColumns(), `Riwayat_Pembayaran_Kompensasi_${getTodayString()}`);
      toast.showToast('Riwayat pembayaran berhasil diekspor (.xlsx)', 'success');
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
      const rows = await fetchAllFiltered();
      exportToPDF(
        rows,
        exportColumns(),
        `Riwayat_Pembayaran_Kompensasi_${getTodayString()}`,
        'Riwayat Pembayaran Kompensasi',
        'Sistem Informasi Akademik Vokasi',
        {
          institusi: 'Politeknik Sorowako',
          judulDokumen: 'Riwayat Pembayaran Kompensasi',
          infoLines: [`Dicetak: ${new Date().toLocaleString('id-ID')}`, `Jumlah data: ${rows.length} pembayaran`],
        },
      );
      toast.showToast('Riwayat pembayaran berhasil diekspor (.pdf)', 'success');
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengekspor PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'nama' || field === 'nim' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const hasData = () => rows().length > 0;

  createEffect(() => {
    if (data.error && hasData()) {
      toast.showToast('Gagal memperbarui data. Menampilkan data sebelumnya.', 'error');
    }
  });

  return (
    <div class="flex flex-col gap-4">
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
          <div class="min-w-[220px]">
            <FilterField label="Rentang Tanggal Bayar">
              <div class="flex items-center gap-2">
                <Input
                  type="date"
                  value={props.filters.tglDari()}
                  onInput={(e) => props.filters.setTglDari(e.currentTarget.value)}
                  class="!py-2"
                />
                <span class="text-secondary-400">–</span>
                <Input
                  type="date"
                  value={props.filters.tglSampai()}
                  onInput={(e) => props.filters.setTglSampai(e.currentTarget.value)}
                  class="!py-2"
                />
              </div>
            </FilterField>
          </div>
          <Show when={props.canManage}>
            <div class="flex items-end gap-2">
              <Button onClick={openAdd} variant="primary" class="!px-4 !py-2.5 text-xs font-bold">
                + Input Pembayaran
              </Button>
              <Button
                onClick={() => setShowImportModal(true)}
                variant="secondary"
                class="!px-4 !py-2.5 text-xs font-bold"
              >
                Impor CSV
              </Button>
            </div>
          </Show>
          <div class="flex items-end gap-2">
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
          <span class="text-xs text-secondary-400 dark:text-secondary-300">{total()} pembayaran</span>
          <div class="flex items-center gap-4">
            <RefreshingBadge show={data.loading && hasData()} />
            <button
              type="button"
              onClick={() => {
                props.filters.resetShared();
                setSortBy('tanggal');
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

      <Show when={props.canManage && selectedIds().size > 0}>
        <div class="flex items-center gap-3 rounded-2xl border border-danger-300 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20 px-5 py-3">
          <span class="text-sm font-bold text-danger-700 dark:text-danger-300">{selectedIds().size} dipilih</span>
          <div class="flex-1" />
          <Button
            onClick={() => setConfirmDelete({ type: 'bulk' })}
            variant="danger"
            class="!px-4 !py-1.5 text-xs font-bold"
          >
            Hapus Massal
          </Button>
          <Button
            onClick={() => setSelectedIds(new Set<number>())}
            variant="secondary"
            class="!px-4 !py-1.5 text-xs font-bold"
          >
            Batal Pilih
          </Button>
        </div>
      </Show>

      <Table
        headers={[
          <Show when={props.canManage}>
            <input
              type="checkbox"
              aria-label="Pilih semua pembayaran"
              checked={isAllSelected()}
              onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
              class="accent-brand-600"
            />
          </Show>,
          <SortableHeader field="tanggal" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Tanggal Bayar
          </SortableHeader>,
          <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Mahasiswa
          </SortableHeader>,
          'Prodi',
          <SortableHeader field="jumlahMenit" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Menit
          </SortableHeader>,
          'Keterangan',
          'Petugas',
          <Show when={props.canManage}>Aksi</Show>,
        ]}
      >
        <Show when={data.loading && !hasData()}>
          <For each={Array.from({ length: 5 })}>{() => <TableLoadingFallback cols={props.canManage ? 8 : 7} />}</For>
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
              <EmptyState message="Tidak ada pembayaran kompensasi." />
            </Show>
          }
        >
          {(row) => (
            <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30">
              <Show when={props.canManage}>
                <td class="py-4 px-6">
                  <input
                    type="checkbox"
                    aria-label="Pilih pembayaran baris ini"
                    checked={selectedIds().has(row.id)}
                    onChange={(e) => toggleSelect(row.id)}
                    class="accent-brand-600"
                  />
                </td>
              </Show>
              <td class="py-4 px-6 text-secondary-600 dark:text-secondary-200">{fmtTanggal(row.tanggal)}</td>
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <StudentAvatar foto={row.foto} nama={row.nama} nim={row.nim} size="sm" />
                  <div>
                    <div class="font-bold text-secondary-800 dark:text-white">{row.nama}</div>
                    <div class="text-xs text-secondary-400 dark:text-secondary-200">{row.nim}</div>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-secondary-500 dark:text-secondary-300">{row.prodiNama || '-'}</td>
              <td class="py-4 px-6 font-bold text-accent-600 dark:text-accent-400">{row.jumlahMenit} mnt</td>
              <td class="py-4 px-6 max-w-[220px]">
                <span class="text-xs text-secondary-500 dark:text-secondary-300 line-clamp-2">{row.keterangan}</span>
              </td>
              <td class="py-4 px-6 text-xs text-secondary-400 dark:text-secondary-300">{row.petugasNama || '-'}</td>
              <Show when={props.canManage}>
                <td class="py-4 px-6">
                  <div class="flex items-center gap-2">
                    <Button onClick={() => openEdit(row)} variant="secondary" class="!px-3 !py-1 text-xs font-bold">
                      Edit
                    </Button>
                    <Button
                      onClick={() => setConfirmDelete({ type: 'row', row })}
                      variant="danger"
                      class="!px-3 !py-1 text-xs font-bold"
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </Show>
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

      {/* Modal Input/Edit Pembayaran */}
      <Modal
        isOpen={payModal()}
        onClose={() => setPayModal(false)}
        title={editingPay() ? 'Edit Pembayaran Kompensasi' : 'Input Pembayaran Kompensasi'}
        maxWidth="lg"
      >
        <div class="flex flex-col gap-4">
          <FilterField label="Mahasiswa">
            <SearchableSelect
              options={mhsOptions()}
              value={form().mahasiswaId ?? ''}
              onChange={(v) => setForm((f) => ({ ...f, mahasiswaId: Number(v) }))}
              placeholder="Ketik NIM / nama untuk mencari..."
              onSearch={setMhsSearch}
            />
          </FilterField>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FilterField label="Jumlah Menit">
              <Input
                type="number"
                min="1"
                value={form().jumlahMenit}
                onInput={(e) => setForm((f) => ({ ...f, jumlahMenit: parseInt(e.currentTarget.value) || 0 }))}
              />
            </FilterField>
            <FilterField label="Tanggal Pembayaran">
              <Input
                type="date"
                value={form().tanggal}
                onInput={(e) => setForm((f) => ({ ...f, tanggal: e.currentTarget.value }))}
              />
            </FilterField>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-fine font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
              Keterangan Kegiatan
            </label>
            <textarea
              rows="3"
              class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-4 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Misal: Membersihkan Laboratorium Komputer"
              value={form().keterangan}
              onInput={(e) => setForm((f) => ({ ...f, keterangan: e.currentTarget.value }))}
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button onClick={() => setPayModal(false)} variant="secondary">
              Batal
            </Button>
            <Button onClick={savePayment} loading={saving()} variant="primary">
              Simpan
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Konfirmasi Hapus */}
      <Modal
        isOpen={confirmDelete() !== null}
        onClose={() => setConfirmDelete(null)}
        title="Konfirmasi Hapus Pembayaran"
      >
        <Show when={confirmDelete()}>
          {(target) => {
            const t = target();
            return (
              <div class="flex flex-col gap-4">
                <div class="rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 p-4 text-sm text-danger-700 dark:text-danger-300">
                  {t.type === 'bulk' ? (
                    <>
                      Anda akan menghapus <b>{selectedIds().size}</b> catatan pembayaran kompensasi.
                    </>
                  ) : (
                    <>
                      Hapus pembayaran <b>{t.row.nama}</b> ({t.row.nim}) tanggal {fmtTanggal(t.row.tanggal)} sejumlah{' '}
                      {t.row.jumlahMenit} menit?
                    </>
                  )}
                </div>
                <p class="text-xs text-secondary-400 dark:text-secondary-300">
                  Data yang dihapus tidak dapat dikembalikan.
                </p>
                <div class="flex justify-end gap-2">
                  <Button onClick={() => setConfirmDelete(null)} variant="secondary">
                    Batal
                  </Button>
                  <Button onClick={executeDelete} loading={deleting()} variant="danger">
                    Ya, Hapus
                  </Button>
                </div>
              </div>
            );
          }}
        </Show>
      </Modal>

      <ImportCsvModal
        show={showImportModal()}
        onClose={() => setShowImportModal(false)}
        title="Pembayaran Kompensasi"
        importUrl="/presensi/kompensasi/bayar/import"
        templateHeaders={['nim', 'tanggal', 'jumlah_menit', 'keterangan']}
        onSuccess={refetch}
      />
    </div>
  );
}
