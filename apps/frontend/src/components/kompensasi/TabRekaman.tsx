import { createEffect, createMemo, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { type KetidakhadiranRow, kompensasiAdminController } from '../../controllers/kompensasiAdminController';
import {
  JENIS_KOMPEN_LABEL,
  type JenisKompen,
  kompensasiManualController,
} from '../../controllers/kompensasiManualController';
import { prodiController } from '../../controllers/prodiController';
import { fmtTanggal, fmtWaktu } from '../../utils/format';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Pagination } from '../ui/Pagination';
import { SearchableSelect, type SelectOption } from '../ui/SearchableSelect';
import { SortableHeader } from '../ui/SortableHeader';
import { StudentAvatar } from '../ui/StudentAvatar';
import { Table } from '../ui/Table';
import {
  EmptyState,
  ErrorState,
  FilterField,
  RefreshingBadge,
  StatusBadge,
  SumberBadge,
  TableLoadingFallback,
} from './shared';
import { VerifyModal } from './VerifyModal';

const PER_PAGE_DEFAULT = 20;

const SUMBER_OPTIONS: SelectOption[] = [
  { value: '', label: 'Semua Sumber' },
  { value: 'BAP', label: 'Perkuliahan (BAP)' },
  { value: 'APEL', label: 'Apel' },
  { value: 'PRAKTIKUM', label: 'Praktikum' },
  { value: 'MANUAL', label: 'Manual' },
];

const JENIS_OPTIONS: SelectOption[] = Object.entries(JENIS_KOMPEN_LABEL).map(([value, label]) => ({
  value,
  label,
}));

interface TabRekamanProps {
  canManage: boolean;
}

export default function TabRekaman(props: TabRekamanProps) {
  const toast = useToast();
  const workspace = useWorkspace();

  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(PER_PAGE_DEFAULT);
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [filterProdi, setFilterProdi] = createSignal<number | undefined>(workspace.selectedProdiId() ?? undefined);
  const [filterSumber, setFilterSumber] = createSignal('');
  const [tglDari, setTglDari] = createSignal('');
  const [tglSampai, setTglSampai] = createSignal('');
  const [sortBy, setSortBy] = createSignal('tanggal');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  const [selectedIds, setSelectedIds] = createSignal<Set<number>>(new Set());
  const [verifyRow, setVerifyRow] = createSignal<KetidakhadiranRow | null>(null);

  const [editManual, setEditManual] = createSignal<KetidakhadiranRow | null>(null);
  const [manualJenis, setManualJenis] = createSignal<string>('alpa');
  const [manualDurasi, setManualDurasi] = createSignal(0);
  const [manualKeterangan, setManualKeterangan] = createSignal('');
  const [savingManual, setSavingManual] = createSignal(false);

  const [confirmAnulir, setConfirmAnulir] = createSignal<
    { type: 'bulk' } | { type: 'row'; row: KetidakhadiranRow } | null
  >(null);
  const [submitting, setSubmitting] = createSignal(false);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(searchTimer));

  createEffect(() => {
    const q = search();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      setDebouncedSearch(q);
      setPage(1);
    }, 350);
  });

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [data, { refetch }] = createResource(
    () => ({
      page: page(),
      limit: limit(),
      search: debouncedSearch(),
      prodiId: filterProdi(),
      sumber: filterSumber(),
      tglDari: tglDari(),
      tglSampai: tglSampai(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
    }),
    (params) =>
      kompensasiAdminController.getRekamanKompensasi({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        prodiId: params.prodiId,
        sumber: (params.sumber as 'BAP' | 'APEL' | 'PRAKTIKUM' | 'MANUAL') || undefined,
        tglDari: params.tglDari || undefined,
        tglSampai: params.tglSampai || undefined,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
  );

  const [rows, setRows] = createSignal<KetidakhadiranRow[]>([]);
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

  const selectedRows = createMemo(() => {
    const set = selectedIds();
    return rows().filter((r) => set.has(r.id));
  });

  const selectedManualIds = createMemo(() =>
    selectedRows()
      .filter((r) => r.sumber === 'MANUAL' && r.kompensasiManualId)
      .map((r) => Number(r.kompensasiManualId)),
  );

  const selectedNonManualIds = createMemo(() =>
    selectedRows()
      .filter((r) => r.sumber !== 'MANUAL')
      .map((r) => r.id),
  );

  const toggleSelect = (id: number) => {
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

  const toggleSelectAll = (checked: boolean) => {
    const current = rows();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        current.forEach((r) => next.add(r.id));
      } else {
        current.forEach((r) => next.delete(r.id));
      }
      return next;
    });
  };

  const isAllSelected = () => {
    const current = rows();
    return current.length > 0 && current.every((r) => selectedIds().has(r.id));
  };

  const openEditManual = (row: KetidakhadiranRow) => {
    setManualJenis(row.status.toLowerCase());
    setManualDurasi(row.durasiMenit);
    setManualKeterangan(row.keterangan || '');
    setEditManual(row);
  };

  const saveManual = async () => {
    const row = editManual();
    if (!row || !row.kompensasiManualId || savingManual()) return;
    setSavingManual(true);
    try {
      await kompensasiManualController.update(Number(row.kompensasiManualId), {
        jenisKompen: manualJenis() as JenisKompen,
        durasiMenit: manualDurasi(),
        keterangan: manualKeterangan() || null,
      });
      toast.showToast('Rekaman manual berhasil diubah', 'success');
      setEditManual(null);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal mengubah rekaman manual', 'error');
    } finally {
      setSavingManual(false);
    }
  };

  const executeAnulir = async () => {
    if (submitting()) return;
    const target = confirmAnulir();
    if (!target) return;
    setSubmitting(true);
    try {
      if (target.type === 'bulk') {
        let anulir = 0;
        let deleted = 0;
        if (selectedNonManualIds().length > 0) {
          const res = await kompensasiAdminController.bulkAnulirKetidakhadiran(selectedNonManualIds());
          anulir = res.anulir;
        }
        if (selectedManualIds().length > 0) {
          const res = await kompensasiManualController.bulkDelete(selectedManualIds());
          deleted = res.deleted;
        }
        toast.showToast(`${anulir} dianulir, ${deleted} rekaman manual dihapus`, 'success');
        setSelectedIds(new Set<number>());
      } else if (target.row.sumber === 'MANUAL') {
        await kompensasiManualController.remove(Number(target.row.kompensasiManualId));
        toast.showToast('Rekaman manual berhasil dianulir/dihapus', 'success');
      } else {
        await kompensasiAdminController.bulkAnulirKetidakhadiran([target.row.id]);
        toast.showToast('Ketidakhadiran berhasil dianulir', 'success');
      }
      setConfirmAnulir(null);
      refetch();
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal menganulir rekaman', 'error');
    } finally {
      setSubmitting(false);
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

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilterProdi(workspace.selectedProdiId() ?? undefined);
    setFilterSumber('');
    setTglDari('');
    setTglSampai('');
    setSortBy('tanggal');
    setSortOrder('desc');
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
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterField label="Cari NIM / Nama">
            <input
              type="text"
              placeholder="Cari NIM atau nama mahasiswa..."
              class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-3.5 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-secondary-400"
              value={search()}
              onInput={(e) => setSearch(e.currentTarget.value)}
            />
          </FilterField>
          <FilterField label="Program Studi">
            <SearchableSelect
              options={prodiOptions()}
              value={filterProdi()}
              onChange={(v) => {
                setFilterProdi(typeof v === 'number' ? v : v === '' ? undefined : Number(v));
                setPage(1);
              }}
              placeholder="Semua Prodi"
            />
          </FilterField>
          <FilterField label="Sumber">
            <SearchableSelect
              options={SUMBER_OPTIONS}
              value={filterSumber()}
              onChange={(v) => {
                setFilterSumber(String(v));
                setPage(1);
              }}
              placeholder="Semua Sumber"
            />
          </FilterField>
          <FilterField label="Tanggal Tidak Hadir (Dari)">
            <Input type="date" value={tglDari()} onInput={(e) => setTglDari(e.currentTarget.value)} class="!py-2" />
          </FilterField>
          <FilterField label="Sampai">
            <Input type="date" value={tglSampai()} onInput={(e) => setTglSampai(e.currentTarget.value)} class="!py-2" />
          </FilterField>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-secondary-400 dark:text-secondary-300">{total()} rekaman kompensasi</span>
          <div class="flex items-center gap-4">
            <RefreshingBadge show={data.loading && hasData()} />
            <button
              type="button"
              onClick={resetFilters}
              class="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
            >
              Reset Filter
            </button>
          </div>
        </div>
      </div>

      <Show when={props.canManage && selectedIds().size > 0}>
        <div class="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-300 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 px-5 py-3">
          <span class="text-sm font-bold text-brand-700 dark:text-brand-300">
            {selectedIds().size} dipilih
            <Show when={selectedManualIds().length > 0}>
              <span class="font-normal text-brand-500"> ({selectedManualIds().length} manual)</span>
            </Show>
          </span>
          <div class="flex-1" />
          <Button
            onClick={() => setConfirmAnulir({ type: 'bulk' })}
            variant="danger"
            class="!px-4 !py-1.5 text-xs font-bold"
          >
            Anulir Massal
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
              aria-label="Pilih semua rekaman"
              checked={isAllSelected()}
              onChange={(e) => toggleSelectAll(e.currentTarget.checked)}
              class="accent-brand-600"
            />
          </Show>,
          <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Mahasiswa
          </SortableHeader>,
          <SortableHeader field="tanggal" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Tanggal
          </SortableHeader>,
          'Sumber',
          'Jenis',
          <SortableHeader field="durasi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Durasi
          </SortableHeader>,
          'Keterangan',
          'Diverifikasi',
          <Show when={props.canManage}>Aksi</Show>,
        ]}
      >
        <Show when={data.loading && !hasData()}>
          <For each={Array.from({ length: 5 })}>{() => <TableLoadingFallback cols={props.canManage ? 9 : 8} />}</For>
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
              <EmptyState message="Tidak ada rekaman kompensasi." />
            </Show>
          }
        >
          {(row) => (
            <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30">
              <Show when={props.canManage}>
                <td class="py-4 px-6">
                  <input
                    type="checkbox"
                    aria-label="Pilih rekaman baris ini"
                    checked={selectedIds().has(row.id)}
                    onChange={(e) => toggleSelect(row.id)}
                    class="accent-brand-600"
                  />
                </td>
              </Show>
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <StudentAvatar foto={row.foto} nama={row.nama} nim={row.nim} size="sm" />
                  <div>
                    <div class="font-bold text-secondary-800 dark:text-white">{row.nama}</div>
                    <div class="text-xs text-secondary-400 dark:text-secondary-200">{row.nim}</div>
                    <div class="text-xs text-secondary-400 dark:text-secondary-200">{row.prodiNama || '-'}</div>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 text-secondary-600 dark:text-secondary-200">{fmtTanggal(row.tanggal)}</td>
              <td class="py-4 px-6">
                <SumberBadge sumber={row.sumber} />
              </td>
              <td class="py-4 px-6">
                <StatusBadge status={row.status} />
              </td>
              <td class="py-4 px-6 font-semibold text-secondary-700 dark:text-secondary-100">{row.durasiMenit} mnt</td>
              <td class="py-4 px-6 max-w-[220px]">
                <span class="text-xs text-secondary-500 dark:text-secondary-300 line-clamp-2">
                  {row.keterangan || row.verificationNote || '-'}
                </span>
              </td>
              <td class="py-4 px-6">
                <div class="text-xs text-secondary-500 dark:text-secondary-300">
                  {row.verifiedByName || row.createdByName || '-'}
                </div>
                <div class="text-xs text-secondary-400 dark:text-secondary-500">
                  {row.verifiedAt ? fmtWaktu(row.verifiedAt) : row.sumber === 'MANUAL' ? 'Input manual' : '-'}
                </div>
              </td>
              <Show when={props.canManage}>
                <td class="py-4 px-6">
                  <div class="flex items-center gap-2">
                    <Show
                      when={row.sumber === 'MANUAL'}
                      fallback={
                        <Button
                          onClick={() => setVerifyRow(row)}
                          variant="primary"
                          class="!px-3 !py-1 text-xs font-bold"
                        >
                          Ubah
                        </Button>
                      }
                    >
                      <Button
                        onClick={() => openEditManual(row)}
                        variant="primary"
                        class="!px-3 !py-1 text-xs font-bold"
                      >
                        Ubah
                      </Button>
                    </Show>
                    <Button
                      onClick={() => setConfirmAnulir({ type: 'row', row })}
                      variant="danger"
                      class="!px-3 !py-1 text-xs font-bold"
                    >
                      Anulir
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

      <VerifyModal row={verifyRow()} onClose={() => setVerifyRow(null)} onSaved={refetch} />

      {/* Modal Edit Manual */}
      <Modal isOpen={editManual() !== null} onClose={() => setEditManual(null)} title="Ubah Rekaman Kompensasi Manual">
        <Show when={editManual()}>
          {(row) => (
            <div class="flex flex-col gap-4">
              <div class="text-sm text-secondary-500 dark:text-secondary-300">
                {row().nama} · {row().nim} — {fmtTanggal(row().tanggal)}
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FilterField label="Jenis Kompensasi">
                  <SearchableSelect
                    options={JENIS_OPTIONS}
                    value={manualJenis()}
                    onChange={(v) => setManualJenis(String(v))}
                  />
                </FilterField>
                <FilterField label="Durasi (Menit)">
                  <Input
                    type="number"
                    min="0"
                    value={manualDurasi()}
                    onInput={(e) => setManualDurasi(parseInt(e.currentTarget.value) || 0)}
                  />
                </FilterField>
              </div>
              <div class="flex flex-col gap-1">
                <label class="text-fine font-semibold uppercase tracking-wider text-secondary-400 dark:text-secondary-300">
                  Keterangan
                </label>
                <textarea
                  rows="3"
                  class="w-full bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl px-4 py-2.5 text-table text-secondary-800 dark:text-secondary-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  value={manualKeterangan()}
                  onInput={(e) => setManualKeterangan(e.currentTarget.value)}
                />
              </div>
              <div class="flex justify-end gap-2">
                <Button onClick={() => setEditManual(null)} variant="secondary">
                  Batal
                </Button>
                <Button onClick={saveManual} loading={savingManual()} variant="primary">
                  Simpan
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Modal>

      {/* Modal Konfirmasi Anulir */}
      <Modal
        isOpen={confirmAnulir() !== null}
        onClose={() => setConfirmAnulir(null)}
        title="Konfirmasi Anulir Kompensasi"
      >
        <Show when={confirmAnulir()}>
          {(target) => {
            const t = target();
            return (
              <div class="flex flex-col gap-4">
                <div class="rounded-xl bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 p-4 text-sm text-danger-700 dark:text-danger-300">
                  {t.type === 'bulk' ? (
                    <>
                      Anda akan menganulir <b>{selectedNonManualIds().length}</b> rekaman terverifikasi dan menghapus{' '}
                      <b>{selectedManualIds().length}</b> rekaman manual yang dipilih. Tindakan ini mengurangi beban
                      kompensasi dan akan tercatat pada audit log.
                    </>
                  ) : (
                    <>
                      Anulir rekaman <b>{t.row.nama}</b> ({t.row.nim}) tanggal {fmtTanggal(t.row.tanggal)}? Durasi akan
                      di-set 0 / rekaman dihapus.
                    </>
                  )}
                </div>
                <p class="text-xs text-secondary-400 dark:text-secondary-300">
                  Pastikan pilihan sudah benar sebelum melanjutkan.
                </p>
                <div class="flex justify-end gap-2">
                  <Button onClick={() => setConfirmAnulir(null)} variant="secondary">
                    Batal
                  </Button>
                  <Button onClick={executeAnulir} loading={submitting()} variant="danger">
                    Ya, Anulir
                  </Button>
                </div>
              </div>
            );
          }}
        </Show>
      </Modal>
    </div>
  );
}
