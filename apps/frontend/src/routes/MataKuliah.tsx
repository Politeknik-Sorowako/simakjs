import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { bahanKajianController } from '../controllers/bahanKajianController';
import { kurikulumController } from '../controllers/kurikulumController';
import { MataKuliah as IMataKuliah, mataKuliahController } from '../controllers/mataKuliahController';
import { prodiController } from '../controllers/prodiController';
import { usePagination } from '../hooks/usePagination';
import { fetchApi } from '../utils/api';

type SortField = 'nama' | 'kode' | 'sks' | 'semester' | 'programStudi' | 'kurikulum';

export default function MataKuliah() {
  const auth = useAuth();
  const ws = useWorkspace();
  const isAdmin = () => auth.user()?.role === 'admin';
  const [showImportModal, setShowImportModal] = createSignal(false);
  const { page, limit, setPage, setLimit, resetPage, search, setSearch } = usePagination();

  // Filters
  const [filterProdi, setFilterProdi] = createSignal<number | undefined>(ws.selectedProdiId() ?? undefined);
  const [filterKurikulum, setFilterKurikulum] = createSignal<number | undefined>(undefined);
  const [filterSemester, setFilterSemester] = createSignal<number | undefined>(undefined);
  const [sortBy, setSortBy] = createSignal<SortField>('nama');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field as SortField);
      setSortOrder('asc');
    }
  };

  // Fetch program studi for dropdown
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Fetch kurikulum list filtered by prodi
  const [kurikulums] = createResource(
    () => filterProdi(),
    (prodiId) => kurikulumController.getAll('', 1, 100, prodiId || undefined),
  );

  // Auto-select first kurikulum when prodi filter changes and kurikulum list loads, but only if none selected
  createEffect(() => {
    const data = kurikulums();
    if (data?.data?.length && filterKurikulum() === undefined) {
      // Only auto-select if there's exactly one kurikulum, otherwise keep "Semua Kurikulum"
      if (data.data.length === 1) {
        setFilterKurikulum(data.data[0].id);
      }
    }
  });

  // Fetch Mata Kuliah Data (always with kurikulum filter)
  const [matkuls, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      kurikulumId: filterKurikulum(),
      semester: filterSemester(),
      sortBy: sortBy(),
      sortOrder: sortOrder(),
      programStudiId: filterProdi(),
    }),
    ({ search, page, limit, kurikulumId, semester, sortBy, sortOrder, programStudiId }) =>
      mataKuliahController.getAll(search, page, limit, kurikulumId, semester, sortBy, sortOrder, programStudiId),
  );

  const sortedData = () => {
    const data = matkuls()?.data || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

  const semesters = () => [1, 2, 3, 4, 5, 6, 7, 8];

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [formProdiId, setFormProdiId] = createSignal<number>(ws.selectedProdiId() || 0);
  const [kode, setKode] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [sksTotal, setSksTotal] = createSignal(3);
  const [sksTatapMuka, setSksTatapMuka] = createSignal(2);
  const [sksPraktek, setSksPraktek] = createSignal(1);
  const [errorMsg, setErrorMsg] = createSignal('');

  // Bahan Kajian State
  const [showBkModal, setShowBkModal] = createSignal(false);
  const [bkMataKuliahId, setBkMataKuliahId] = createSignal<number | null>(null);
  const [bkMataKuliahNama, setBkMataKuliahNama] = createSignal('');
  const [selectedBkId, setSelectedBkId] = createSignal<number>(0);
  const [bkMappings, setBkMappings] = createSignal<
    { id: number; bahanKajian?: { id: number; kode: string; nama: string }; bobot?: number }[]
  >([]);

  const [allBk] = createResource(
    () => filterProdi(),
    async (prodiId) => {
      if (!prodiId) return [];
      return bahanKajianController.getAll(prodiId);
    },
  );

  const openAddModal = () => {
    setEditId(null);
    setFormProdiId(ws.selectedProdiId() || 0);
    setKode('');
    setNama('');
    setSksTotal(3);
    setSksTatapMuka(2);
    setSksPraktek(1);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IMataKuliah) => {
    setEditId(item.id);
    setFormProdiId(item.programStudiId || 0);
    setKode(item.kode);
    setNama(item.nama);
    setSksTotal(item.sksTotal);
    setSksTatapMuka(item.sksTatapMuka || 0);
    setSksPraktek(item.sksPraktek || 0);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        programStudiId: formProdiId(),
        kode: kode(),
        nama: nama(),
        sksTotal: Number(sksTotal()),
        sksTatapMuka: Number(sksTatapMuka()),
        sksPraktek: Number(sksPraktek()),
      };

      if (!payload.programStudiId) {
        setErrorMsg('Pilih Program Studi terlebih dahulu');
        return;
      }

      if (editId()) {
        await mataKuliahController.update(editId()!, payload);
      } else {
        await mataKuliahController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Mata Kuliah ini?')) return;
    try {
      await mataKuliahController.delete(id);
      refetch();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus data');
    }
  };

  const openBkModal = async (item: IMataKuliah) => {
    setBkMataKuliahId(item.id);
    setBkMataKuliahNama(item.nama);
    setErrorMsg('');
    const mappings = await fetchApi<
      { id: number; bahanKajian?: { id: number; kode: string; nama: string }; bobot?: number }[]
    >(`/mata-kuliah/${item.id}/bahan-kajian`);
    setBkMappings(mappings);
    setShowBkModal(true);
  };

  const handleAttachBk = async () => {
    if (!bkMataKuliahId() || !selectedBkId()) {
      setErrorMsg('Pilih Bahan Kajian terlebih dahulu');
      return;
    }
    try {
      await fetchApi(`/mata-kuliah/${bkMataKuliahId()}/bahan-kajian`, {
        method: 'POST',
        body: JSON.stringify({ bahanKajianId: selectedBkId() }),
      });
      setSelectedBkId(0);
      const mappings = await fetchApi<
        { id: number; bahanKajian?: { id: number; kode: string; nama: string }; bobot?: number }[]
      >(`/mata-kuliah/${bkMataKuliahId()}/bahan-kajian`);
      setBkMappings(mappings);
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menambah Bahan Kajian');
    }
  };

  const handleDetachBk = async (bkId: number) => {
    try {
      await fetchApi(`/mata-kuliah/${bkMataKuliahId()}/bahan-kajian/${bkId}`, {
        method: 'DELETE',
      });
      const mappings = await fetchApi<
        { id: number; bahanKajian?: { id: number; kode: string; nama: string }; bobot?: number }[]
      >(`/mata-kuliah/${bkMataKuliahId()}/bahan-kajian`);
      setBkMappings(mappings);
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus Bahan Kajian');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Mata Kuliah</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Daftar mata kuliah per Program Studi. Hubungkan MK ke kurikulum lewat menu Kurikulum.
            </p>
          </div>
          <div class="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              📥 Impor CSV
            </Button>
            <Button onClick={openAddModal}>+ Tambah Matkul</Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/mata-kuliah/import"
          templateHeaders={['kode_prodi', 'kode', 'nama', 'sks_total', 'sks_tatap_muka', 'sks_praktek', 'id_pddikti']}
          title="Mata Kuliah"
          onImport={async (rows, mode) => {
            const items = rows
              .slice(1)
              .filter((row) => row.some((cell) => cell.trim() !== ''))
              .map((row) => ({
                kodeProdi: row[0]?.trim() || undefined,
                kode: row[1]?.trim() || '',
                nama: row[2]?.trim() || '',
                sksTotal: Number(row[3]) || 0,
                sksTatapMuka: row[4]?.trim() ? Number(row[4]) : undefined,
                sksPraktek: row[5]?.trim() ? Number(row[5]) : undefined,
                idPddikti: row[6]?.trim() || undefined,
              }));
            const res = await mataKuliahController.import(items);
            return {
              successCount: res.success,
              errors: res.errors.map((e) => ({ line: e.row, error: e.error })),
            };
          }}
          onSuccess={() => refetch()}
        />

        {/* Filters */}
        <div class="flex flex-wrap gap-3 bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 items-end">
          <div class="flex-1 min-w-[200px]">
            <Input
              placeholder="Cari kode atau nama mata kuliah..."
              value={search()}
              onInput={(e) => {
                setSearch(e.currentTarget.value);
                resetPage();
              }}
            />
          </div>
          <div class="w-[200px]">
            <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-200 mb-1">
              Program Studi
            </label>
            <select
              class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={filterProdi() || ''}
              onChange={(e) => {
                setFilterProdi(e.currentTarget.value ? Number(e.currentTarget.value) : undefined);
                setFilterKurikulum(undefined);
                setFilterSemester(undefined);
                resetPage();
              }}
            >
              <option value="">Semua Prodi</option>
              <For each={prodis()?.data}>
                {(p) => (
                  <option value={p.id}>
                    {p.jenjang} - {p.nama}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="w-[220px]">
            <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-200 mb-1">Kurikulum</label>
            <select
              class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={filterKurikulum() || ''}
              onChange={(e) => {
                setFilterKurikulum(e.currentTarget.value ? Number(e.currentTarget.value) : undefined);
                setFilterSemester(undefined);
                resetPage();
              }}
            >
              <option value="">Semua Kurikulum</option>
              <For each={kurikulums()?.data}>
                {(k) => (
                  <option value={k.id}>
                    {k.nama} ({k.kode})
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="w-[140px]">
            <label class="block text-xs font-semibold text-secondary-500 dark:text-secondary-200 mb-1">Semester</label>
            <select
              class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={filterSemester() ?? ''}
              onChange={(e) => {
                setFilterSemester(e.currentTarget.value ? Number(e.currentTarget.value) : undefined);
                resetPage();
              }}
            >
              <option value="">Semua Semester</option>
              <For each={semesters()}>{(s) => <option value={s}>Semester {s}</option>}</For>
            </select>
          </div>
        </div>

        <Show
          when={!matkuls.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Show when={matkuls.error}>
            <div class="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
              Gagal memuat data: {String(matkuls.error)}
            </div>
          </Show>
          <Table
            headers={[
              <SortableHeader field="kode" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Kode
              </SortableHeader>,
              <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Nama
              </SortableHeader>,
              <SortableHeader field="sks" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                SKS
              </SortableHeader>,
              <SortableHeader field="semester" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Smt
              </SortableHeader>,
              <SortableHeader field="programStudi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Program Studi
              </SortableHeader>,
              <SortableHeader field="kurikulum" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Kurikulum
              </SortableHeader>,
              'Aksi',
            ]}
          >
            <For each={sortedData()}>
              {(item) => (
                <tr class="hover:bg-brand-50/50 dark:hover:bg-secondary-800/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-secondary-600 dark:text-secondary-200 font-semibold">
                    {item.kode}
                  </td>
                  <td class="px-6 py-4 font-medium text-secondary-800 dark:text-secondary-200">{item.nama}</td>
                  <td class="px-6 py-4 font-semibold text-secondary-700 dark:text-secondary-200">{item.sksTotal}</td>
                  <td class="px-6 py-4">
                    <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                      {item.semester ? `Semester ${item.semester}` : '-'}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">
                    {item.programStudi?.nama || '-'}
                  </td>
                  <td class="px-6 py-4 text-xs font-mono text-secondary-500 dark:text-secondary-200">
                    {item.kurikulum?.kode || '-'}
                  </td>
                  <td class="px-6 py-4 flex gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(item)} class="!py-1 !px-2.5">
                      Edit
                    </Button>
                    <Button variant="ghost" onClick={() => openBkModal(item)} class="!py-1 !px-2.5">
                      Bahan Kajian
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5">
                      Hapus
                    </Button>
                  </td>
                </tr>
              )}
            </For>
            <Show when={sortedData().length === 0}>
              <tr>
                <td colspan="7" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                  {filterKurikulum()
                    ? 'Tidak ada mata kuliah untuk kurikulum yang dipilih.'
                    : 'Tidak ada mata kuliah ditemukan.'}
                </td>
              </tr>
            </Show>
          </Table>

          <Pagination
            currentPage={page()}
            totalPages={matkuls()?.meta.totalPages || 1}
            total={matkuls()?.meta.total || 0}
            limit={limit()}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </Show>

        <Modal
          show={showModal()}
          title={editId() ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Show when={isAdmin()}>
                <div class="flex flex-col gap-1.5">
                  <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Program Studi</label>
                  <select
                    class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    value={formProdiId()}
                    onChange={(e) => setFormProdiId(Number(e.currentTarget.value))}
                  >
                    <option value="0">Pilih Prodi</option>
                    <For each={prodis()?.data}>
                      {(p) => (
                        <option value={p.id}>
                          {p.jenjang} - {p.nama}
                        </option>
                      )}
                    </For>
                  </select>
                </div>
              </Show>
              <Input
                label="Kode Matkul"
                required
                value={kode()}
                onInput={(e) => setKode(e.currentTarget.value)}
                placeholder="Contoh: MK001"
              />
              <Input
                label="Nama Mata Kuliah"
                required
                value={nama()}
                onInput={(e) => setNama(e.currentTarget.value)}
                placeholder="Contoh: Pemrograman JavaScript"
              />
              <Input
                type="number"
                label="SKS Total"
                required
                value={sksTotal()}
                onInput={(e) => setSksTotal(Number(e.currentTarget.value))}
              />
              <Input
                type="number"
                label="SKS Tatap Muka"
                required
                value={sksTatapMuka()}
                onInput={(e) => setSksTatapMuka(Number(e.currentTarget.value))}
              />
              <Input
                type="number"
                label="SKS Praktek"
                required
                value={sksPraktek()}
                onInput={(e) => setSksPraktek(Number(e.currentTarget.value))}
              />
            </div>
            <p class="text-xs text-secondary-500 dark:text-secondary-200">
              MK bersifat per-prodi. Untuk menempatkan MK dalam kurikulum, gunakan menu <strong>Kurikulum → MK</strong>.
            </p>
            <div class="flex justify-end gap-2 border-t dark:border-secondary-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>

        {/* Bahan Kajian Modal */}
        <Modal
          show={showBkModal()}
          title={`Bahan Kajian: ${bkMataKuliahNama()}`}
          onClose={() => setShowBkModal(false)}
          maxWidth="lg"
        >
          <div class="space-y-4">
            <Show when={errorMsg()}>
              <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{errorMsg()}</div>
            </Show>

            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <Input
                  type="select"
                  label="Bahan Kajian"
                  value={selectedBkId()}
                  onInput={(e) => setSelectedBkId(Number(e.currentTarget.value))}
                  isSelect
                  selectOptions={[
                    { value: '0', label: 'Pilih Bahan Kajian' },
                    ...(allBk()?.map((bk: { id: number; kode: string; nama: string }) => ({
                      value: String(bk.id),
                      label: `${bk.kode} - ${bk.nama}`,
                    })) || []),
                  ]}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleAttachBk}>
                Tambah
              </Button>
            </div>

            <div class="border-t border-slate-700 pt-4">
              <h4 class="text-sm font-medium text-secondary-200 mb-2">Bahan Kajian Terkait</h4>
              <Show
                when={bkMappings().length > 0}
                fallback={<p class="text-secondary-400 text-sm">Belum ada Bahan Kajian</p>}
              >
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-secondary-400 border-b border-slate-700">
                      <th class="text-left py-2">Kode</th>
                      <th class="text-left py-2">Nama</th>
                      <th class="text-right py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={bkMappings()}>
                      {(m: {
                        id: number;
                        bahanKajian?: { id: number; kode: string; nama: string };
                        bobot?: number;
                      }) => (
                        <tr class="border-b border-slate-700/50">
                          <td class="py-2 text-white">{m.bahanKajian?.kode || '-'}</td>
                          <td class="py-2 text-secondary-200">{m.bahanKajian?.nama || '-'}</td>
                          <td class="py-2 text-right">
                            <Button variant="danger" size="sm" onClick={() => handleDetachBk(m.bahanKajianId)}>
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </Show>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
