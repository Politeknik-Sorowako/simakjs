import { createSignal, createResource, Show, For } from 'solid-js';
import { kelasKuliahController, KelasKuliah as IKelas } from '../controllers/kelasKuliahController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { dosenController } from '../controllers/dosenController';
import { dosenPengajarController } from '../controllers/dosenPengajarController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../contexts/ToastContext';

export default function KelasKuliah() {
  const toast = useToast();
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
  const [dosens] = createResource(() => dosenController.getAll(undefined, 1, 100));

  // Form State
  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [matkulId, setMatkulId] = createSignal<number>(0);
  const [periodeId, setPeriodeId] = createSignal('');
  const [namaKelas, setNamaKelas] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  // Plot Dosen State
  const [showPlotModal, setShowPlotModal] = createSignal(false);
  const [plotKelasId, setPlotKelasId] = createSignal<number>(0);
  const [plotDosenId, setPlotDosenId] = createSignal<number>(0);
  const [plotSks, setPlotSks] = createSignal(3);

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

  const openPlotModal = (item: IKelas) => {
    setPlotKelasId(item.id);
    const firstDosen = dosens()?.data?.[0]?.id || 0;
    setPlotDosenId(firstDosen);
    setPlotSks(3);
    setErrorMsg('');
    setShowPlotModal(true);
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
        toast.showToast('Kelas kuliah berhasil diperbarui', 'success');
      } else {
        await kelasKuliahController.create(payload);
        toast.showToast('Kelas kuliah berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal menyimpan data');
      toast.showToast(e.message || 'Gagal menyimpan data', 'error');
    }
  };

  const handlePlot = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await dosenPengajarController.create({
        dosenId: Number(plotDosenId()),
        kelasKuliahId: Number(plotKelasId()),
        sksBebanMengajar: Number(plotSks())
      });
      setShowPlotModal(false);
      toast.showToast('Dosen berhasil di-plot ke kelas', 'success');
      refetch();
    } catch (e: any) {
      setErrorMsg(e.message || 'Gagal melakukan plotting dosen');
      toast.showToast(e.message || 'Gagal melakukan plotting dosen', 'error');
    }
  };

  const handleUnplot = async (plottingId: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan plotting dosen ini?')) return;
    try {
      await dosenPengajarController.delete(plottingId);
      toast.showToast('Plotting dosen berhasil dihapus', 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal membatalkan plotting', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Kelas Kuliah ini?')) return;
    try {
      await kelasKuliahController.delete(id);
      toast.showToast('Kelas kuliah berhasil dihapus', 'success');
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
          <Table headers={['Nama Kelas', 'Mata Kuliah', 'Periode Akademik', 'Dosen Pengajar', 'Aksi']}>
            <For each={kelas()?.data}>
              {(item) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-6 py-4 font-semibold text-gray-800">{item.namaKelas}</td>
                  <td class="px-6 py-4 text-gray-700">
                    {item.mataKuliah?.nama} <span class="text-xs text-gray-400 font-mono">({item.mataKuliah?.kode})</span>
                  </td>
                  <td class="px-6 py-4 text-gray-600">{item.periodeAkademik?.nama || item.periodeId}</td>
                  <td class="px-6 py-4 text-gray-700">
                    <div class="flex flex-wrap gap-1.5 items-center">
                      <For each={item.dosenPengajarKelas}>
                        {(dp) => (
                          <span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 rounded px-2 py-0.5 text-xs font-semibold">
                            {dp.dosen?.nama} ({dp.sksBebanMengajar || 0} SKS)
                            <button
                              onClick={() => handleUnplot(dp.id)}
                              class="text-red-500 hover:text-red-700 font-bold ml-1 text-sm focus:outline-none"
                              title="Batalkan plotting dosen"
                            >
                              ×
                            </button>
                          </span>
                        )}
                      </For>
                      <button
                        onClick={() => openPlotModal(item)}
                        class="inline-flex items-center px-2 py-0.5 text-xs font-semibold border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50/55 rounded transition-all focus:outline-none"
                      >
                        + Plot Dosen
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-4 flex gap-2">
                    <Button variant="secondary" onClick={() => openEditModal(item)} class="!py-1 !px-2.5 text-xs">
                      Edit
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(item.id)} class="!py-1 !px-2.5 text-xs">
                      Hapus
                    </Button>
                  </td>
                </tr>
              )}
            </For>
            <Show when={kelas()?.data.length === 0}>
              <tr>
                <td colspan="5" class="px-6 py-10 text-center text-gray-400">
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

        {/* Modal Add/Edit Kelas */}
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

        {/* Modal Plotting Dosen */}
        <Modal show={showPlotModal()} title="Plot Dosen Pengajar" onClose={() => setShowPlotModal(false)}>
          <form onSubmit={handlePlot} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100">
                {errorMsg()}
              </div>
            </Show>
            <Input
              isSelect
              label="Dosen"
              value={plotDosenId()}
              onChange={(e) => setPlotDosenId(Number(e.currentTarget.value))}
              selectOptions={
                dosens()?.data.map((d) => ({ label: `${d.nip} - ${d.nama}`, value: d.id })) || []
              }
            />
            <Input
              type="number"
              label="Beban Mengajar (SKS)"
              value={plotSks()}
              onInput={(e) => setPlotSks(Number(e.currentTarget.value))}
              placeholder="Contoh: 3"
            />
            <div class="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowPlotModal(false)}>
                Batal
              </Button>
              <Button type="submit">
                Plot Dosen
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
