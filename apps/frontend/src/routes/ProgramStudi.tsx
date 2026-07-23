import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { ExportButtonGroup } from '../components/reports/ExportButton';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { Prodi, prodiController } from '../controllers/prodiController';
import { usePagination } from '../hooks/usePagination';
import { ExportColumn } from '../utils/export';

export default function ProgramStudi() {
  const [search, setSearch] = createSignal('');
  const { page, limit, setPage, setLimit, resetPage } = usePagination();
  const [showImportModal, setShowImportModal] = createSignal(false);

  const exportColumns: ExportColumn[] = [
    { header: 'Kode Prodi', accessor: (row: Prodi) => row.kode },
    { header: 'Nama Program Studi', accessor: (row: Prodi) => row.nama },
    { header: 'Jenjang', accessor: (row: Prodi) => row.jenjang },
  ];

  // Fetch data
  const [prodis, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit() }),
    ({ search, page, limit }) => prodiController.getAll(search, page, limit),
  );

  // Sorting state
  const [sortBy, setSortBy] = createSignal('kode');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortBy() === field) {
      setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const sortedData = () => {
    const data = prodis()?.data || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [jenjang, setJenjang] = createSignal('D4');
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setKode('');
    setNama('');
    setJenjang('D4');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: Prodi) => {
    setEditId(item.id);
    setKode(item.kode);
    setNama(item.nama);
    setJenjang(item.jenjang);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editId()) {
        await prodiController.update(editId()!, { kode: kode(), nama: nama(), jenjang: jenjang() });
      } else {
        await prodiController.create({ kode: kode(), nama: nama(), jenjang: jenjang() });
      }
      setShowModal(false);
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Program Studi ini?')) return;
    try {
      await prodiController.delete(id);
      refetch();
    } catch (e: unknown) {
      alert((e as Error).message || 'Gagal menghapus data');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex justify-between items-center">
          <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-extrabold tracking-tight">Program Studi</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-400">
              Kelola daftar program studi vokasi yang tersedia.
            </p>
          </div>
          <div class="flex items-center gap-2 flex-wrap">
            <ExportButtonGroup
              onFetchAll={async () => {
                const res = await prodiController.getAll(search(), 1, 10000);
                return res.data;
              }}
              columns={exportColumns}
              filename={`Program_Studi_${new Date().toISOString().split('T')[0]}`}
              title="Daftar Program Studi"
              subtitle="Data Program Studi SIMAK Vokasi"
            />
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              📥 Impor CSV
            </Button>
            <Button onClick={openAddModal}>+ Tambah Prodi</Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/prodi/import"
          templateHeaders={['kode', 'nama', 'jenjang']}
          title="Program Studi"
          onSuccess={() => refetch()}
        />

        {/* Search */}
        <div class="max-w-xs">
          <Input
            placeholder="Cari prodi..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
          />
        </div>

        {/* Data Table */}
        <Show
          when={!prodis.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Table
            headers={[
              <SortableHeader field="kode" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Kode
              </SortableHeader>,
              <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Nama Program Studi
              </SortableHeader>,
              <SortableHeader field="jenjang" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Jenjang
              </SortableHeader>,
              'Aksi',
            ]}
          >
            <For each={sortedData()}>
              {(item) => (
                <tr class="hover:bg-brand-50/50 transition-colors dark:hover:bg-brand-900/50">
                  <td class="px-6 py-4 font-mono font-semibold text-secondary-700 dark:text-secondary-200">
                    {item.kode}
                  </td>
                  <td class="px-6 py-4 font-medium text-secondary-800 dark:text-white">{item.nama}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 border border-brand-100 dark:bg-brand-900/30 dark:text-brand-400 dark:border-brand-800">
                      {item.jenjang}
                    </span>
                  </td>
                  <td class="px-6 py-4 flex gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(item)} class="!py-1 !px-2.5">
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5">
                      Hapus
                    </Button>
                  </td>
                </tr>
              )}
            </For>
            <Show when={prodis()?.data.length === 0}>
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                  Tidak ada data program studi ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          <Pagination
            currentPage={page()}
            totalPages={prodis()?.meta.totalPages || 1}
            total={prodis()?.meta.total || 0}
            limit={limit()}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </Show>

        {/* Modal Form */}
        <Modal
          show={showModal()}
          title={editId() ? 'Edit Program Studi' : 'Tambah Program Studi'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 dark:bg-red-900/30 dark:text-red-400">
                {errorMsg()}
              </div>
            </Show>
            <Input
              label="Kode Prodi"
              required
              value={kode()}
              onInput={(e) => setKode(e.currentTarget.value)}
              placeholder="Contoh: TI"
            />
            <Input
              label="Nama Prodi"
              required
              value={nama()}
              onInput={(e) => setNama(e.currentTarget.value)}
              placeholder="Contoh: Teknik Informatika"
            />
            <Input
              isSelect
              label="Jenjang"
              value={jenjang()}
              onChange={(e) => setJenjang(e.currentTarget.value)}
              selectOptions={[
                { label: 'D3', value: 'D3' },
                { label: 'D4', value: 'D4' },
                { label: 'S1', value: 'S1' },
              ]}
            />
            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
