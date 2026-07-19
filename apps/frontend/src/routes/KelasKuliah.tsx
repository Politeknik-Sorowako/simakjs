import { useNavigate } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { dosenController } from '../controllers/dosenController';
import { dosenPengajarController } from '../controllers/dosenPengajarController';
import { KelasKuliah as IKelas, kelasKuliahController } from '../controllers/kelasKuliahController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { periodeAkademikController } from '../controllers/periodeAkademikController';
import { usePagination } from '../hooks/usePagination';

export default function KelasKuliah() {
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();
  const workspace = useWorkspace();
  const isGlobalFilterActive = () => auth.user()?.role === 'admin';

  const [search, setSearch] = createSignal('');
  const { page, limit, setPage, setLimit, resetPage } = usePagination();

  // Fetch Kelas Data
  const [kelas, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      prodiId: isGlobalFilterActive() ? workspace.selectedProdiId() : null,
      periodeId: isGlobalFilterActive() ? workspace.selectedPeriodeId() : null,
    }),
    ({ search, page, limit, prodiId, periodeId }) =>
      kelasKuliahController.getAll(search, page, limit, prodiId || undefined, periodeId || undefined),
  );

  // Fetch Dropdown Data
  const [matkuls] = createResource(() => mataKuliahController.getAll(undefined, 1, 100));
  const [periodes] = createResource(() => periodeAkademikController.getAll(undefined, 1, 100));
  const [dosens] = createResource(() => dosenController.getAll(undefined, 1, 100));

  // Sorting
  const [sortBy, setSortBy] = createSignal('nama');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => {
    const data = kelas()?.data || [];
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
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal menyimpan data');
      toast.showToast((e as Error).message || 'Gagal menyimpan data', 'error');
    }
  };

  const handlePlot = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await dosenPengajarController.create({
        dosenId: Number(plotDosenId()),
        kelasKuliahId: Number(plotKelasId()),
        sksBebanMengajar: Number(plotSks()),
      });
      setShowPlotModal(false);
      toast.showToast('Dosen berhasil di-plot ke kelas', 'success');
      refetch();
    } catch (e: unknown) {
      setErrorMsg((e as Error).message || 'Gagal melakukan plotting dosen');
      toast.showToast((e as Error).message || 'Gagal melakukan plotting dosen', 'error');
    }
  };

  const handleUnplot = async (plottingId: number) => {
    if (!confirm('Apakah Anda yakin ingin membatalkan plotting dosen ini?')) return;
    try {
      await dosenPengajarController.delete(plottingId);
      toast.showToast('Plotting dosen berhasil dihapus', 'success');
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membatalkan plotting', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Kelas Kuliah ini?')) return;
    try {
      await kelasKuliahController.delete(id);
      toast.showToast('Kelas kuliah berhasil dihapus', 'success');
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal menghapus data', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 dark:text-white">Kelas Kuliah</h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Kelola pembagian kelas mata kuliah untuk periode akademik tertentu.
            </p>
          </div>
          <Button onClick={openAddModal}>+ Tambah Kelas</Button>
        </div>

        <div class="max-w-xs">
          <Input
            placeholder="Cari nama kelas..."
            value={search()}
            onInput={(e) => {
              setSearch(e.currentTarget.value);
              resetPage();
            }}
          />
        </div>

        <Show
          when={!kelas.loading}
          fallback={<div class="text-center py-10 text-secondary-400 dark:text-secondary-200">Loading data...</div>}
        >
          <Table
            headers={[
              <SortableHeader field="namaKelas" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Nama Kelas
              </SortableHeader>,
              <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Mata Kuliah
              </SortableHeader>,
              <SortableHeader field="periodeId" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Periode Akademik
              </SortableHeader>,
              <SortableHeader field="dosenPengajarKelas" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Dosen Pengajar
              </SortableHeader>,
              'Aksi',
            ]}
          >
            <For each={sortedData()}>
              {(item) => (
                <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/50 transition-colors">
                  <td class="px-6 py-4 font-semibold text-secondary-800 dark:text-secondary-200">{item.namaKelas}</td>
                  <td class="px-6 py-4 text-secondary-700 dark:text-secondary-200">
                    {item.mataKuliah?.nama}{' '}
                    <span class="text-xs text-secondary-400 dark:text-secondary-200 font-mono">
                      ({item.mataKuliah?.kode})
                    </span>
                  </td>
                  <td class="px-6 py-4 text-secondary-600 dark:text-secondary-200">
                    {item.periodeAkademik?.nama || item.periodeId}
                  </td>
                  <td class="px-6 py-4 text-secondary-700 dark:text-secondary-200">
                    <div class="flex flex-wrap gap-1.5 items-center">
                      <For each={item.dosenPengajarKelas}>
                        {(dp) => (
                          <span class="inline-flex items-center gap-1 bg-brand-50 text-brand-700 border border-brand-100 rounded px-2 py-0.5 text-xs font-semibold dark:bg-brand-900/30 dark:text-white dark:border-brand-800">
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
                        class="inline-flex items-center px-2 py-0.5 text-xs font-semibold border border-dashed border-brand-300 dark:border-brand-700 text-brand-600 dark:text-brand-400 hover:bg-brand-50/55 dark:hover:bg-brand-900/20 rounded transition-all focus:outline-none"
                      >
                        + Plot Dosen
                      </button>
                    </div>
                  </td>
                  <td class="px-6 py-4 flex gap-2">
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/rps?mataKuliahId=${item.mataKuliahId}&periodeId=${item.periodeId}`)}
                      class="!py-1 !px-2.5 text-xs"
                    >
                      RPS
                    </Button>
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
                <td colspan="5" class="px-6 py-10 text-center text-secondary-400 dark:text-secondary-200">
                  Tidak ada data kelas kuliah ditemukan.
                </td>
              </tr>
            </Show>
          </Table>

          {/* Pagination */}
          <Show when={kelas() && kelas()!.meta.totalPages > 1}>
            <Pagination
              currentPage={page()}
              totalPages={kelas()!.meta.totalPages}
              total={kelas()!.meta.total}
              limit={limit()}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </Show>
        </Show>

        {/* Modal Add/Edit Kelas */}
        <Modal
          show={showModal()}
          title={editId() ? 'Edit Kelas Kuliah' : 'Tambah Kelas Kuliah'}
          onClose={() => setShowModal(false)}
        >
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
              selectOptions={matkuls()?.data.map((m) => ({ label: `${m.kode} - ${m.nama}`, value: m.id })) || []}
            />
            <Input
              isSelect
              label="Periode Akademik"
              value={periodeId()}
              onChange={(e) => setPeriodeId(e.currentTarget.value)}
              selectOptions={periodes()?.data.map((p) => ({ label: p.nama, value: p.id })) || []}
            />
            <Input
              label="Nama Kelas"
              required
              value={namaKelas()}
              onInput={(e) => setNamaKelas(e.currentTarget.value)}
              placeholder="Contoh: 1A, 2B, dll."
            />
            <div class="flex justify-end gap-2 border-t dark:border-secondary-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit">Simpan</Button>
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
              selectOptions={dosens()?.data.map((d) => ({ label: `${d.nip} - ${d.nama}`, value: d.id })) || []}
            />
            <Input
              type="number"
              label="Beban Mengajar (SKS)"
              value={plotSks()}
              onInput={(e) => setPlotSks(Number(e.currentTarget.value))}
              placeholder="Contoh: 3"
            />
            <div class="flex justify-end gap-2 border-t dark:border-secondary-800 pt-4">
              <Button type="button" variant="secondary" onClick={() => setShowPlotModal(false)}>
                Batal
              </Button>
              <Button type="submit">Plot Dosen</Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
