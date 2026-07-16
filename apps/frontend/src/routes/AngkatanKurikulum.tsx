import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import type { AngkatanKurikulum } from '../controllers/angkatanKurikulumController';
import { angkatanKurikulumController } from '../controllers/angkatanKurikulumController';
import { kurikulumController } from '../controllers/kurikulumController';
import { prodiController } from '../controllers/prodiController';

export default function AngkatanKurikulum() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  // Fetch Bindings
  const [bindings, { refetch }] = createResource(
    () => prodiFilter(),
    (prodiId) => angkatanKurikulumController.getAll(prodiId),
  );

  // Fetch Program Studi for Dropdown
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Form State — separate from filter state
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [formProdiId, setFormProdiId] = createSignal<number>(0);
  const [angkatan, setAngkatan] = createSignal('');
  const [kurikulumId, setKurikulumId] = createSignal<number>(0);
  const [errorMsg, setErrorMsg] = createSignal('');

  // Fetch Kurikulum for form dropdown — depends on formProdiId, NOT prodiFilter
  const [formKurikulums] = createResource(
    () => formProdiId(),
    (prodiId) =>
      prodiId
        ? kurikulumController.getAll('', 1, 100, prodiId)
        : { data: [], meta: { total: 0, page: 1, limit: 100, totalPages: 0 } },
  );

  const openAddModal = () => {
    setEditId(null);
    setFormProdiId(0);
    setAngkatan('');
    setKurikulumId(0);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: AngkatanKurikulum) => {
    setEditId(item.id);
    setFormProdiId(item.programStudiId);
    setAngkatan(item.angkatan);
    setKurikulumId(item.kurikulumId);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    if (!formProdiId()) {
      setErrorMsg('Pilih Program Studi terlebih dahulu');
      return;
    }
    try {
      const payload = {
        programStudiId: formProdiId(),
        angkatan: angkatan(),
        kurikulumId: Number(kurikulumId()),
      };

      if (editId()) {
        await angkatanKurikulumController.update(editId()!, payload);
      } else {
        await angkatanKurikulumController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus binding ini? Kurikulum akan di-unlock.')) return;
    try {
      await angkatanKurikulumController.delete(id);
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
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Binding Angkatan Kurikulum</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Mengikat angkatan mahasiswa ke kurikulum tertentu untuk menjaga konsistensi paket kurikulum antar angkatan
            </p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Binding</Button>
        </div>

        {/* Filter */}
        <div class="flex flex-wrap gap-4 bg-white dark:bg-secondary-900 p-4 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800">
          <div class="w-[300px]">
            <label class="block text-sm font-semibold text-secondary-700 dark:text-secondary-200 mb-1">
              Program Studi
            </label>
            <select
              class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              onChange={(e) => setProdiFilter(e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
            >
              <option value="">Semua Program Studi</option>
              <For each={prodis()?.data}>{(prodi) => <option value={prodi.id}>{prodi.nama}</option>}</For>
            </select>
          </div>
        </div>

        {/* Binding Table */}
        <Table headers={['Program Studi', 'Angkatan', 'Kurikulum', 'Status', 'Aksi']}>
          <Show when={bindings.loading}>
            <tr>
              <td colspan="5" class="p-8 text-center text-secondary-500">
                Memuat data...
              </td>
            </tr>
          </Show>
          <Show when={!bindings.loading && (!bindings() || bindings()?.length === 0)}>
            <tr>
              <td colspan="5" class="p-8 text-center text-secondary-500">
                Belum ada binding.
              </td>
            </tr>
          </Show>
          <For each={bindings()}>
            {(item) => (
              <tr class="hover:bg-secondary-50 dark:hover:bg-secondary-800/50">
                <td class="px-6 py-4 text-sm text-secondary-900 dark:text-white">{item.programStudi?.nama || '-'}</td>
                <td class="px-6 py-4 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                  {item.angkatan}
                </td>
                <td class="px-6 py-4 text-sm text-secondary-700 dark:text-secondary-200">
                  {item.kurikulum?.nama || '-'} ({item.kurikulum?.kode || '-'})
                </td>
                <td class="px-6 py-4 text-sm">
                  <span
                    class={`px-2 py-1 rounded-full text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200'}`}
                  >
                    {item.isActive ? 'Aktif' : 'Tidak Aktif'}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm space-x-2">
                  <Button variant="secondary" onClick={() => openEditModal(item)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(item.id)}>
                    Hapus
                  </Button>
                </td>
              </tr>
            )}
          </For>
        </Table>

        {/* Modal Form */}
        <Modal
          show={showModal()}
          onClose={() => setShowModal(false)}
          title={editId() ? 'Edit Binding Angkatan' : 'Tambah Binding Angkatan'}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{errorMsg()}</div>
            </Show>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Program Studi</label>
              <select
                class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={formProdiId()}
                onChange={(e) => {
                  setFormProdiId(Number(e.currentTarget.value));
                  setKurikulumId(0);
                }}
                required
              >
                <option value={0}>Pilih Program Studi</option>
                <For each={prodis()?.data}>{(prodi) => <option value={prodi.id}>{prodi.nama}</option>}</For>
              </select>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Angkatan (Tahun)</label>
              <Input
                type="text"
                placeholder="Contoh: 2024"
                value={angkatan()}
                onInput={(e) => setAngkatan(e.currentTarget.value)}
                required
              />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Kurikulum</label>
              <select
                class="w-full h-10 px-3 rounded-lg border border-secondary-300 dark:border-secondary-700 bg-white dark:bg-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                value={kurikulumId()}
                onChange={(e) => setKurikulumId(Number(e.currentTarget.value))}
                required
              >
                <option value={0}>Pilih Kurikulum</option>
                <For each={formKurikulums()?.data}>
                  {(kur) => (
                    <option value={kur.id}>
                      {kur.nama} ({kur.kode})
                    </option>
                  )}
                </For>
              </select>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
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
