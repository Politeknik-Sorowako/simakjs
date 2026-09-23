import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { type KetidakhadiranRow, kompensasiAdminController } from '../../controllers/kompensasiAdminController';
import { presensiController } from '../../controllers/presensiController';
import { prodiController } from '../../controllers/prodiController';
import { fmtTanggal } from '../../utils/format';
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
  VerifBadge,
} from './shared';
import { VerifyModal } from './VerifyModal';

const PER_PAGE_DEFAULT = 20;

const SUMBER_OPTIONS: SelectOption[] = [
  { value: 'BAP', label: 'Perkuliahan (BAP)' },
  { value: 'APEL', label: 'Apel' },
  { value: 'PRAKTIKUM', label: 'Praktikum' },
  { value: 'MANUAL', label: 'Manual' },
];

const VERIF_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Semua Status' },
  { value: 'belum', label: 'Belum Diverifikasi' },
  { value: 'sudah', label: 'Sudah Diverifikasi' },
];

export default function TabKetidakhadiran() {
  const toast = useToast();
  const workspace = useWorkspace();

  const [page, setPage] = createSignal(1);
  const [limit, setLimit] = createSignal(PER_PAGE_DEFAULT);
  const [search, setSearch] = createSignal('');
  const [debouncedSearch, setDebouncedSearch] = createSignal('');
  const [filterProdi, setFilterProdi] = createSignal<number | undefined>(workspace.selectedProdiId() ?? undefined);
  const [filterSumber, setFilterSumber] = createSignal<string>('');
  const [filterVerif, setFilterVerif] = createSignal<'all' | 'belum' | 'sudah'>('all');
  const [tglDari, setTglDari] = createSignal('');
  const [tglSampai, setTglSampai] = createSignal('');
  const [sortBy, setSortBy] = createSignal('tanggal');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('desc');

  const [verifyRow, setVerifyRow] = createSignal<KetidakhadiranRow | null>(null);

  const [previewRow, setPreviewRow] = createSignal<KetidakhadiranRow | null>(null);
  const [previewUrl, setPreviewUrl] = createSignal<string | null>(null);
  const [previewLoading, setPreviewLoading] = createSignal(false);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    clearTimeout(searchTimer);
    const url = previewUrl();
    if (url) URL.revokeObjectURL(url);
  });

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
      statusVerif: filterVerif(),
      tglDari: tglDari(),
      tglSampai: tglSampai(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
    }),
    (params) =>
      kompensasiAdminController.getRiwayatKetidakhadiran({
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,
        prodiId: params.prodiId,
        sumber: (params.sumber as 'BAP' | 'APEL' | 'PRAKTIKUM' | 'MANUAL') || undefined,
        statusVerif: params.statusVerif === 'all' ? undefined : params.statusVerif,
        tglDari: params.tglDari || undefined,
        tglSampai: params.tglSampai || undefined,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
      }),
  );

  createEffect(() => {
    if (data.error && data()) {
      toast.showToast('Gagal memperbarui data. Menampilkan data sebelumnya.', 'error');
    }
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

  const resetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setFilterProdi(workspace.selectedProdiId() ?? undefined);
    setFilterSumber('');
    setFilterVerif('all');
    setTglDari('');
    setTglSampai('');
    setSortBy('tanggal');
    setSortOrder('desc');
    setPage(1);
  };

  const openPreview = async (row: KetidakhadiranRow) => {
    if (!row.lampiranEvidens) return;
    setPreviewRow(row);
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const url = await presensiController.getLampiranBlobUrl(row.lampiranEvidens);
      setPreviewUrl(url);
    } catch (e: unknown) {
      toast.showToast(e instanceof Error ? e.message : 'Gagal memuat berkas surat', 'error');
      setPreviewRow(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    const url = previewUrl();
    if (url) URL.revokeObjectURL(url);
    setPreviewUrl(null);
    setPreviewRow(null);
  };

  const meta = () => data()?.meta;
  const totalPages = () => Math.max(meta()?.totalPages || 0, 1);

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
          <FilterField label="Status Verifikasi">
            <SearchableSelect
              options={VERIF_OPTIONS}
              value={filterVerif()}
              onChange={(v) => {
                setFilterVerif(String(v) as 'all' | 'belum' | 'sudah');
                setPage(1);
              }}
            />
          </FilterField>
          <FilterField label="Rentang Tanggal">
            <div class="flex items-center gap-2">
              <Input type="date" value={tglDari()} onInput={(e) => setTglDari(e.currentTarget.value)} class="!py-2" />
              <span class="text-secondary-400">–</span>
              <Input
                type="date"
                value={tglSampai()}
                onInput={(e) => setTglSampai(e.currentTarget.value)}
                class="!py-2"
              />
            </div>
          </FilterField>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-xs text-secondary-400 dark:text-secondary-300">
            {meta()?.total ?? 0} data ketidakhadiran
          </span>
          <div class="flex items-center gap-4">
            <RefreshingBadge show={data.loading && !!data()} />
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

      <Table
        headers={[
          <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Mahasiswa
          </SortableHeader>,
          <SortableHeader field="tanggal" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Tanggal
          </SortableHeader>,
          'Sumber',
          'Konteks',
          <SortableHeader field="durasi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Durasi
          </SortableHeader>,
          <SortableHeader field="status" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
            Status
          </SortableHeader>,
          'Verifikasi',
          'Bukti',
          'Aksi',
        ]}
      >
        <Show when={data.loading && !data()}>
          <For each={Array.from({ length: 5 })}>{() => <TableLoadingFallback cols={9} />}</For>
        </Show>
        <Show when={data.error && !data()}>
          <ErrorState
            message={data.error instanceof Error ? data.error.message : String(data.error)}
            onRetry={refetch}
          />
        </Show>
        <Show when={data() && !data.error}>
          <For each={data()?.data || []} fallback={<EmptyState message="Tidak ada data ketidakhadiran." />}>
            {(row) => (
              <tr class="border-b border-secondary-50 hover:bg-secondary-50/30 transition-colors dark:hover:bg-secondary-800/30">
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
                <td class="py-4 px-6 max-w-xs">
                  <div class="text-xs text-secondary-600 dark:text-secondary-200">
                    <Show when={row.namaKelas}>
                      <div class="font-semibold">
                        {row.mataKuliahNama || 'MK'} · {row.namaKelas}
                      </div>
                      <Show when={row.dosenNama}>
                        <div class="text-secondary-400">Dosen: {row.dosenNama}</div>
                      </Show>
                      <Show when={row.pertemuanKe != null}>
                        <div class="text-secondary-400">Pertemuan/Sesi {row.pertemuanKe}</div>
                      </Show>
                    </Show>
                    <Show when={row.kelompokNama}>
                      <div class="font-semibold">Apel · {row.kelompokNama}</div>
                      <Show when={row.shift}>
                        <div class="text-secondary-400">Shift {row.shift}</div>
                      </Show>
                    </Show>
                    <Show when={row.materi}>
                      <div class="text-secondary-400 line-clamp-2">{row.materi}</div>
                    </Show>
                    <Show when={!row.namaKelas && !row.kelompokNama}>
                      <div class="text-secondary-400">Input manual</div>
                    </Show>
                  </div>
                </td>
                <td class="py-4 px-6 text-secondary-700 dark:text-secondary-100 font-semibold">
                  {row.durasiMenit} mnt
                </td>
                <td class="py-4 px-6">
                  <StatusBadge status={row.status} />
                </td>
                <td class="py-4 px-6">
                  <VerifBadge isVerified={row.isVerified} />
                  <Show when={row.isVerified && row.verifiedByName}>
                    <div class="text-xs text-secondary-400 dark:text-secondary-300 mt-1">
                      {row.verifiedByName}
                      <Show when={row.verifiedAt}>
                        {' · '}
                        {fmtTanggal(row.verifiedAt)}
                      </Show>
                    </div>
                  </Show>
                </td>
                <td class="py-4 px-6">
                  <Show
                    when={row.lampiranEvidens}
                    fallback={<span class="text-xs text-secondary-400 dark:text-secondary-500">-</span>}
                  >
                    <Button onClick={() => openPreview(row)} variant="ghost" class="!px-3 !py-1 text-xs font-bold">
                      Lihat
                    </Button>
                  </Show>
                </td>
                <td class="py-4 px-6">
                  <Button onClick={() => setVerifyRow(row)} variant="primary" class="!px-3 !py-1.5 text-xs font-bold">
                    {row.isVerified ? 'Ubah' : 'Verifikasi'}
                  </Button>
                </td>
              </tr>
            )}
          </For>
        </Show>
      </Table>

      <Pagination
        currentPage={page()}
        totalPages={totalPages()}
        total={meta()?.total ?? 0}
        limit={limit()}
        onPageChange={setPage}
        onLimitChange={(l) => {
          setLimit(l);
          setPage(1);
        }}
      />

      <VerifyModal row={verifyRow()} onClose={() => setVerifyRow(null)} onSaved={refetch} />

      {/* Modal Preview Bukti */}
      <Modal isOpen={previewRow() !== null} onClose={closePreview} title="Pratinjau Bukti Surat" maxWidth="lg">
        <div class="flex flex-col gap-3">
          <Show when={previewLoading}>
            <div class="h-64 flex items-center justify-center text-secondary-400">Memuat berkas...</div>
          </Show>
          <Show when={previewUrl()}>
            <iframe
              src={previewUrl() as string}
              class="w-full h-[480px] rounded-xl border border-secondary-200 dark:border-secondary-800"
            />
          </Show>
        </div>
      </Modal>
    </div>
  );
}
