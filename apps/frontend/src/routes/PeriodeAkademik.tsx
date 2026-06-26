import { createSignal, createResource, Show, For } from 'solid-js';
import { periodeAkademikController, PeriodeAkademik as IPeriode } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';

export default function PeriodeAkademik() {
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Fetch Periode Data
  const [periodes, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit() }),
    ({ search, page, limit }) => periodeAkademikController.getAll(search, page, limit)
  );

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<string | null>(null);
  const [id, setId] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [aktif, setAktif] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setId('');
    setNama('');
    setAktif(false);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IPeriode) => {
    setEditId(item.id);
    setId(item.id);
    setNama(item.nama);
    setAktif(item.aktif);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (editId()) {
        await periodeAkademikController.update(editId()!, { nama: nama(), aktif: aktif() });
      } else {
        await periodeAkademikController.create({ id: id(), nama: nama(), aktif: aktif() });
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Periode Akademik ini?')) return;
    try {
      await periodeAkademikController.delete(id);
      refetch();
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus data');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-gray-800">Periode Akademik</h1>
            <p class="text-sm text-gray-500">Kelola semester aktif dan periode akademik perkuliahan.</p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Periode</Button>
        </div>

        <div class="max-w-xs">
          <Input
            placeholder="Cari periode..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show when={!periodes.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
          <Table headers={['ID / Kode', 'Nama Semester', 'Status', 'Aksi']}>
            <For each={periodes()?.data}>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-gray-600 font-semibold">{item.id}</td>
                  <td class="px-6 py-4 font-medium text-gray-800">{item.nama}</td>
                  <td class="px-6 py-4">
                    <span class={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      item.aktif ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-50 text-gray-600 border border-gray-150'
                    }`}>
                      {item.aktif ? 'Aktif' : 'Nonaktif'}
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
            <Show when={periodes()?.data.length === 0}>
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-gray-400">
                  Tidak ada data periode akademik ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={periodes() && periodes()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-gray-500">
                Menampilkan halaman {page()} dari {periodes()?.meta.totalPages} ({periodes()?.meta.total} total data)
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
                  disabled={page() >= periodes()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, periodes()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal show={showModal()} title={editId() ? 'Edit Periode Akademik' : 'Tambah Periode Akademik'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <Input
              label="ID Periode (5 Digit)"
              required
              disabled={!!editId()}
              value={id()}
              onInput={(e) => setId(e.currentTarget.value)}
              placeholder="Contoh: 20231 (Tahun 2023 Ganjil)"
            />
            <Input
              label="Nama Periode"
              required
              value={nama()}
              onInput={(e) => setNama(e.currentTarget.value)}
              placeholder="Contoh: Ganjil 2023/2024"
            />
            <Input
              isSelect
              label="Status Aktif"
              value={aktif() ? 'aktif' : 'nonaktif'}
              onChange={(e) => setAktif(e.currentTarget.value === 'aktif')}
              selectOptions={[
                { label: 'Aktif', value: 'aktif' },
                { label: 'Non-aktif', value: 'nonaktif' },
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
