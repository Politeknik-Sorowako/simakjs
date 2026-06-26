import { createSignal, createResource, Show, For } from 'solid-js';
import { kelasKuliahController, KelasKuliah as IKelas } from '../controllers/kelasKuliahController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';

export default function KelasKuliah() {
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);

  // Fetch Kelas Data
  const [kelas, { refetch }] = createResource(
    () => ({ search: search(), page: page(), limit: limit() }),
    ({ search, page, limit }) => kelasKuliahController.getAll(search, page, limit)
  );

  // Fetch Dropdown Data
  const [matkuls] = createResource(() => mataKuliahController.getAll(undefined, 1, 100));
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 100));

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [matkulId, setMatkulId] = createSignal<number>(0);
  const [periodeId, setPeriodeId] = createSignal('');
  const [namaKelas, setNamaKelas] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    const firstMatkul = matkuls()?.data?.[0]?.id || 0;
    const firstPeriode = periodes()?.data?.[0]?.id || '';
    setMatkulId(firstMatkul);
    setPeriodeId(firstPeriode);
    setNamaKelas('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IKelas) => {
    setEditId(item.id);
    setMatkulId(item.mataKuliahId);
    setPeriodeId(item.periodeId);
    setNamaKelas(item.namaKelas);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        mataKuliahId: Number(matkulId()),
        periodeId: periodeId(),
        namaKelas: namaKelas(),
      };

      if (editId()) {
        await kelasKuliahController.update(editId()!, payload);
      } else {
        await kelasKuliahController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Kelas Kuliah ini?')) return;
    try {
      await kelasKuliahController.delete(id);
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
            <h1 class="text-2xl font-extrabold text-gray-800">Kelas Kuliah</h1>
            <p class="text-sm text-gray-500">Kelola pembagian kelas mata kuliah untuk periode akademik tertentu.</p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Kelas</Button>
        </div>

        <div class="max-w-xs">
          <Input
            placeholder="Cari nama kelas..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show when={!kelas.loading} fallback={<div class="text-center py-10 text-gray-400">Loading data...</div>}>
          <Table headers={['Nama Kelas', 'Mata Kuliah', 'Periode Akademik', 'Aksi']}>
            <For each={kelas()?.data}>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-semibold text-gray-800">{item.namaKelas}</td>
                  <td class="px-6 py-4 text-gray-700">
                    {item.mataKuliah?.nama} <span class="text-xs text-gray-400 font-mono">({item.mataKuliah?.kode})</span>
                  </td>
                  <td class="px-6 py-4 text-gray-600">{item.periodeAkademik?.nama || item.periodeId}</td>
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
            <Show when={kelas()?.data.length === 0}>
              <tr>
                <td colspan="4" class="px-6 py-10 text-center text-gray-400">
                  Tidak ada data kelas kuliah ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={kelas() && kelas()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-gray-500">
                Menampilkan halaman {page()} dari {kelas()?.meta.totalPages} ({kelas()?.meta.total} total data)
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
                  disabled={page() >= kelas()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, kelas()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal show={showModal()} title={editId() ? 'Edit Kelas Kuliah' : 'Tambah Kelas Kuliah'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <Input
              isSelect
              label="Mata Kuliah"
              value={matkulId()}
              onChange={(e) => setMatkulId(Number(e.currentTarget.value))}
              selectOptions={
                matkuls()?.data.map((m) => ({ label: `${m.kode} - ${m.nama}`, value: m.id })) || []
              }
            />
            <Input
              isSelect
              label="Periode Akademik"
              value={periodeId()}
              onChange={(e) => setPeriodeId(e.currentTarget.value)}
              selectOptions={
                periodes()?.data.map((p) => ({ label: p.nama, value: p.id })) || []
              }
            />
            <Input
              label="Nama Kelas"
              required
              value={namaKelas()}
              onInput={(e) => setNamaKelas(e.currentTarget.value)}
              placeholder="Contoh: 1A, 2B, dll."
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
