import { createResource, createSignal, For, Show } from 'solid-js';
import { z } from 'zod';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import { PeriodeAkademik as IPeriode, periodeAkademikController } from '../controllers/periodeAkademikController';

const periodeSchema = z.object({
  id: z
    .string()
    .length(5, { message: 'ID Periode harus tepat 5 karakter angka (contoh: 20231)' })
    .regex(/^\d+$/, { message: 'ID Periode harus berupa angka' }),
  nama: z.string().min(3, { message: 'Nama Periode minimal harus 3 karakter' }),
  aktif: z.boolean(),
});

export default function PeriodeAkademik() {
  const toast = useToast();
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Fetch Periode Data
  const [periodes, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit() }),
    async ({ search, page, limit }) => {
      try {
        return await periodeAkademikController.getAll(search, page, limit);
      } catch (e: any) {
        toast.showToast(e.message || 'Gagal memuat data periode akademik', 'error');
        throw e;
      }
    },
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

    // Zod validation
    const formData = { id: id(), nama: nama(), aktif: aktif() };
    const result = periodeSchema.safeParse(formData);
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Input tidak valid';
      setErrorMsg(firstError);
      toast.showToast(firstError, 'error');
      return;
    }

    try {
      if (editId()) {
        await periodeAkademikController.update(editId()!, { nama: nama(), aktif: aktif() });
        toast.showToast('Periode akademik berhasil diperbarui', 'success');
      } else {
        await periodeAkademikController.create({ id: id(), nama: nama(), aktif: aktif() });
        toast.showToast('Periode akademik berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      const errText = e.message || 'Gagal menyimpan data';
      setErrorMsg(errText);
      toast.showToast(errText, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Periode Akademik ini?')) return;
    try {
      await periodeAkademikController.delete(id);
      toast.showToast('Periode akademik berhasil dihapus', 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal menghapus data', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Periode Akademik</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Kelola semester aktif dan periode akademik perkuliahan.
            </p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Periode</Button>
        </div>

        <div class="max-w-xs">
          <Input
            placeholder="Cari periode..."
            value={search()}
            aria-label="Cari periode akademik"
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show
          when={!periodes.loading}
          fallback={
            <div class="flex flex-col items-center justify-center py-20 bg-white dark:bg-secondary-900 rounded-xl border border-secondary-100 dark:border-secondary-800 shadow-sm gap-4">
              <div
                class="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              <p class="text-sm font-medium text-secondary-500 dark:text-secondary-200 animate-pulse">
                Memuat data periode akademik...
              </p>
            </div>
          }
        >
          <Table headers={['ID / Kode', 'Nama Semester', 'Status', 'Aksi']}>
            <For each={periodes()?.data}>
              {(item) => (
                <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-secondary-600 dark:text-secondary-200 font-semibold">
                    {item.id}
                  </td>
                  <td class="px-6 py-4 font-medium text-secondary-800 dark:text-secondary-200">{item.nama}</td>
                  <td class="px-6 py-4">
                    <span
                      class={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                        item.aktif
                          ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                          : 'bg-secondary-50 text-secondary-600 border border-secondary-100 dark:bg-secondary-800 dark:text-secondary-200 dark:border-secondary-700'
                      }`}
                    >
                      {item.aktif ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td class="px-6 py-4 flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => openEditModal(item)}
                      class="!py-1 !px-2.5"
                      aria-label={`Ubah periode ${item.nama}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDelete(item.id)}
                      class="!py-1 !px-2.5"
                      aria-label={`Hapus periode ${item.nama}`}
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              )}
            </For>
            <Show when={periodes()?.data.length === 0}>
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                  Tidak ada data periode akademik ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={periodes() && periodes()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-secondary-500 dark:text-secondary-200">
                Menampilkan halaman {page()} dari {periodes()?.meta.totalPages} ({periodes()?.meta.total} total data)
              </span>
              <div class="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page() === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  class="!py-1 !px-3"
                  aria-label="Halaman sebelumnya"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={page() >= periodes()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, periodes()!.meta.totalPages))}
                  class="!py-1 !px-3"
                  aria-label="Halaman berikutnya"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal
          show={showModal()}
          title={editId() ? 'Edit Periode Akademik' : 'Tambah Periode Akademik'}
          onClose={() => setShowModal(false)}
        >
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
              aria-label="ID Periode Akademik"
            />
            <Input
              label="Nama Periode"
              required
              value={nama()}
              onInput={(e) => setNama(e.currentTarget.value)}
              placeholder="Contoh: Ganjil 2023/2024"
              aria-label="Nama Periode Akademik"
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
              aria-label="Status Periode Aktif"
            />
            <div class="flex justify-end gap-2 border-t dark:border-secondary-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)} aria-label="Batal">
                Batal
              </Button>
              <Button type="submit" aria-label="Simpan">
                Simpan
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
