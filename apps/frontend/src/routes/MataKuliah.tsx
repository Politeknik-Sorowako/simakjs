import { createSignal, createResource, Show, For } from 'solid-js';
import { mataKuliahController, MataKuliah as IMataKuliah } from '../controllers/mataKuliahController';
import { prodiController } from '../controllers/prodiController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuth } from '../contexts/AuthContext';

export default function MataKuliah() {
  const auth = useAuth();
  const workspace = useWorkspace();
  const isGlobalFilterActive = () => auth.user()?.role === 'admin';

  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);
  const [showImportModal, setShowImportModal] = createSignal(false);

  // Fetch Mata Kuliah Data
  const [matkuls, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      prodiId: isGlobalFilterActive() ? workspace.selectedProdiId() : null
    }),
    ({ search, page, limit, prodiId }) => mataKuliahController.getAll(search, page, limit, prodiId || undefined)
  );

  // Fetch Program Studi for Dropdown
  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [sksTotal, setSksTotal] = createSignal(3);
  const [sksTatapMuka, setSksTatapMuka] = createSignal(2);
  const [sksPraktek, setSksPraktek] = createSignal(1);
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setKode('');
    setNama('');
    setSksTotal(3);
    setSksTatapMuka(2);
    setSksPraktek(1);
    const firstProdi = prodis()?.data?.[0]?.id || 0;
    setProdiId(firstProdi);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: IMataKuliah) => {
    setEditId(item.id);
    setKode(item.kode);
    setNama(item.nama);
    setSksTotal(item.sksTotal);
    setSksTatapMuka(item.sksTatapMuka || 0);
    setSksPraktek(item.sksPraktek || 0);
    setProdiId(item.programStudiId || 0);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const payload = {
        kode: kode(),
        nama: nama(),
        sksTotal: Number(sksTotal()),
        sksTatapMuka: Number(sksTatapMuka()),
        sksPraktek: Number(sksPraktek()),
        programStudiId: Number(prodiId()),
      };

      if (editId()) {
        await mataKuliahController.update(editId()!, payload);
      } else {
        await mataKuliahController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Mata Kuliah ini?')) return;
    try {
      await mataKuliahController.delete(id);
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
            <h1 class="text-2xl font-extrabold text-brand-gray-800">Mata Kuliah</h1>
            <p class="text-sm text-brand-gray-500">Kelola daftar kurikulum mata kuliah, SKS, dan program studi terkait.</p>
          </div>
          <div class="flex gap-2">
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>📥 Impor CSV</Button>
            <Button onClick={openAddModal}>+ Tambah Matkul</Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/mata-kuliah/import"
          templateHeaders={['kode', 'nama', 'sksTotal', 'sksTatapMuka', 'sksPraktek', 'sksPraktekLapangan', 'sksSimulasi', 'programStudiKode']}
          title="Mata Kuliah"
          onSuccess={() => refetch()}
        />

        <div class="max-w-xs">
          <Input
            placeholder="Cari kode atau nama matkul..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
          />
        </div>

        <Show when={!matkuls.loading} fallback={<div class="text-center py-10 text-brand-gray-400">Loading data...</div>}>
          <Table headers={['Kode', 'Nama', 'SKS Total', 'Teori / Praktek', 'Program Studi', 'Aksi']}>
            <For each={matkuls()?.data}>
              {(item) => (
                <tr class="hover:bg-brand-50/50 transition-colors">
                  <td class="px-6 py-4 font-mono text-brand-gray-600 font-semibold">{item.kode}</td>
                  <td class="px-6 py-4 font-medium text-brand-gray-800">{item.nama}</td>
                  <td class="px-6 py-4 font-semibold text-brand-gray-700">{item.sksTotal} SKS</td>
                  <td class="px-6 py-4 text-xs text-brand-gray-500">
                    Tatap Muka: {item.sksTatapMuka || 0} / Praktek: {item.sksPraktek || 0}
                  </td>
                  <td class="px-6 py-4 text-brand-gray-600">{item.programStudi?.nama || '-'}</td>
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
            <Show when={matkuls()?.data.length === 0}>
              <tr>
                <td colspan="6" class="px-6 py-10 text-center text-brand-gray-400">
                  Tidak ada data mata kuliah ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={matkuls() && matkuls()!.meta.totalPages > 1}>
            <div class="flex justify-between items-center mt-4">
              <span class="text-xs text-brand-gray-500">
                Menampilkan halaman {page()} dari {matkuls()?.meta.totalPages} ({matkuls()?.meta.total} total data)
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
                  disabled={page() >= matkuls()!.meta.totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, matkuls()!.meta.totalPages))}
                  class="!py-1 !px-3"
                >
                  Berikutnya
                </Button>
              </div>
            </div>
          </Show>
        </Show>

        <Modal show={showModal()} title={editId() ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Input
                isSelect
                label="Program Studi"
                value={prodiId()}
                onChange={(e) => setProdiId(Number(e.currentTarget.value))}
                selectOptions={
                  prodis()?.data.map((p) => ({ label: `${p.jenjang} - ${p.nama}`, value: p.id })) || []
                }
              />
            </div>
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
