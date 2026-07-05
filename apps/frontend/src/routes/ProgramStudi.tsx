import { createSignal, createResource, Show, For } from 'solid-js';
import { prodiController, Prodi } from '../controllers/prodiController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';

export default function ProgramStudi() {
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [showImportModal, setShowImportModal] = createSignal(false);

  // Fetch data
  const [prodis, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit() }),
    ({ search, page, limit }) => prodiController.getAll(search, page, limit)
  );

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
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Program Studi ini?')) return;
    try {
      await prodiController.delete(id);
      refetch();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus data');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        {/* Header */}
        <div class="flex justify-between items-center">
          <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-extrabold tracking-tight">Program Studi</h1>
            <p class="text-sm text-brand-gray-500 dark:text-brand-gray-400">Kelola daftar program studi vokasi yang tersedia.</p>
          </div>
          <div class="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>📥 Impor CSV</Button>
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
              setPage(1);
            }}
          />
        </div>

        {/* Data Table */}
        <Show when={!prodis.loading} fallback={<div class="text-center py-10 text-brand-gray-400">Loading data...</div>}>
          <Table headers={['Kode', 'Nama Program Studi', 'Jenjang', 'Aksi']}>
            <For each={prodis()?.data}>
              {(item) => (
                <tr class="hover:bg-brand-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono font-semibold text-brand-gray-700">{item.kode}</td>
                  <td class="px-6 py-4 font-medium text-brand-gray-800">{item.nama}</td>
                  <td class="px-6 py-4">
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-brand-50 text-brand-700 border border-brand-100">
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
                <td colspan="4" class="px-6 py-10 text-center text-brand-gray-400">
                  Tidak ada data program studi ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={prodis() && prodis()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-brand-gray-500">
                Menampilkan halaman {page()} dari {prodis()?.meta.totalPages} ({prodis()?.meta.total} total data)
              </span>
              <div class="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page() === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  class="!py-1 !px-3"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={page() >= prodis()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, prodis()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        {/* Modal Form */}
        <Modal show={showModal()} title={editId() ? 'Edit Program Studi' : 'Tambah Program Studi'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
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
              <Button type="submit">
                Simpan
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
