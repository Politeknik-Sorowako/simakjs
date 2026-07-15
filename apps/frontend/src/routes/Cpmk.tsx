import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { cplController } from '../controllers/cplController';
import { cpmkController, Cpmk as ICpmk } from '../controllers/cpmkController';
import { cpmkCplMappingController } from '../controllers/cpmkCplMappingController';
import { kurikulumController } from '../controllers/kurikulumController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { prodiController } from '../controllers/prodiController';
import { subCpmkController } from '../controllers/subCpmkController';

export default function Cpmk() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);
  const [kurikulumFilter, setKurikulumFilter] = createSignal<number | undefined>(undefined);
  const [mataKuliahFilter, setMataKuliahFilter] = createSignal<number | undefined>(undefined);
  const [search, setSearch] = createSignal('');
  const [page, setPage] = createSignal(1);
  const [limit] = createSignal(10);

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [kurikulums] = createResource(
    () => prodiFilter(),
    (prodiId) => (prodiId ? kurikulumController.getAll('', 1, 100, prodiId) : null),
  );

  const [mataKuliahs] = createResource(
    () => kurikulumFilter(),
    (kurikulumId) => (kurikulumId ? mataKuliahController.getAll('', 1, 500, kurikulumId) : null),
  );

  const [cpmkList, { refetch }] = createResource(
    () => ({
      search: search(),
      page: page(),
      limit: limit(),
      kurikulumId: kurikulumFilter(),
      mataKuliahId: mataKuliahFilter(),
    }),
    ({ search, page, limit, kurikulumId, mataKuliahId }) =>
      cpmkController.getAll(search, page, limit, kurikulumId, mataKuliahId),
  );

  const [cplOptions] = createResource(
    () => prodiFilter(),
    (prodiId) => (prodiId ? cplController.getAll(prodiId) : null),
  );

  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [mataKuliahId, setMataKuliahId] = createSignal<number>(0);
  const [kurikulumMataKuliahId, setKurikulumMataKuliahId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [deskripsi, setDeskripsi] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');

  const [showSubCpmkModal, setShowSubCpmkModal] = createSignal(false);
  const [subCpmkCpmkId, setSubCpmkCpmkId] = createSignal<number | null>(null);
  const [subCpmkKode, setSubCpmkKode] = createSignal('');
  const [subCpmkDeskripsi, setSubCpmkDeskripsi] = createSignal('');
  const [subCpmkUrutan, setSubCpmkUrutan] = createSignal(0);
  const [subCpmkEditId, setSubCpmkEditId] = createSignal<number | null>(null);
  const [subCpmkList, setSubCpmkList] = createSignal<any[]>([]);
  const [subCpmkErrorMsg, setSubCpmkErrorMsg] = createSignal('');

  const [showMappingModal, setShowMappingModal] = createSignal(false);
  const [mappingCpmkId, setMappingCpmkId] = createSignal<number | null>(null);
  const [selectedCplId, setSelectedCplId] = createSignal<number>(0);
  const [mappingBobot, setMappingBobot] = createSignal<string>('');
  const [mappingList, setMappingList] = createSignal<any[]>([]);
  const [mappingErrorMsg, setMappingErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditId(null);
    setMataKuliahId(mataKuliahFilter() || 0);
    setKurikulumMataKuliahId(null);
    setKode('');
    setDeskripsi('');
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (item: ICpmk) => {
    setEditId(item.id);
    setMataKuliahId(item.mataKuliahId);
    setKurikulumMataKuliahId(item.kurikulumMataKuliahId);
    setKode(item.kode);
    setDeskripsi(item.deskripsi);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setErrorMsg('');
    if (!mataKuliahId() || !kode() || !deskripsi()) {
      setErrorMsg('Mata Kuliah, Kode, dan Deskripsi harus diisi');
      return;
    }
    try {
      const payload = {
        mataKuliahId: mataKuliahId(),
        kurikulumMataKuliahId: kurikulumMataKuliahId() || undefined,
        kode: kode(),
        deskripsi: deskripsi(),
      };
      if (editId() !== null) {
        await cpmkController.update(editId()!, payload);
      } else {
        await cpmkController.create(payload);
      }
      setShowModal(false);
      refetch();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus CPMK ini?')) return;
    try {
      await cpmkController.delete(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  };

  const openSubCpmkModal = async (cpmkId: number) => {
    setSubCpmkCpmkId(cpmkId);
    setSubCpmkKode('');
    setSubCpmkDeskripsi('');
    setSubCpmkUrutan(0);
    setSubCpmkEditId(null);
    setSubCpmkErrorMsg('');
    const list = await subCpmkController.getByCpmk(cpmkId);
    setSubCpmkList(list);
    setShowSubCpmkModal(true);
  };

  const handleSaveSubCpmk = async () => {
    setSubCpmkErrorMsg('');
    if (!subCpmkKode() || !subCpmkDeskripsi()) {
      setSubCpmkErrorMsg('Kode dan Deskripsi harus diisi');
      return;
    }
    try {
      if (subCpmkEditId() !== null) {
        await subCpmkController.update(subCpmkEditId()!, {
          kode: subCpmkKode(),
          deskripsi: subCpmkDeskripsi(),
          urutan: subCpmkUrutan(),
        });
      } else {
        await subCpmkController.create({
          cpmkId: subCpmkCpmkId()!,
          kode: subCpmkKode(),
          deskripsi: subCpmkDeskripsi(),
          urutan: subCpmkUrutan(),
        });
      }
      setSubCpmkKode('');
      setSubCpmkDeskripsi('');
      setSubCpmkUrutan(0);
      setSubCpmkEditId(null);
      const list = await subCpmkController.getByCpmk(subCpmkCpmkId()!);
      setSubCpmkList(list);
    } catch (err: any) {
      setSubCpmkErrorMsg(err.message || 'Gagal menyimpan Sub-CPMK');
    }
  };

  const openEditSubCpmk = (item: any) => {
    setSubCpmkEditId(item.id);
    setSubCpmkKode(item.kode);
    setSubCpmkDeskripsi(item.deskripsi);
    setSubCpmkUrutan(item.urutan);
  };

  const handleDeleteSubCpmk = async (id: number) => {
    if (!confirm('Hapus Sub-CPMK ini?')) return;
    try {
      await subCpmkController.delete(id);
      const list = await subCpmkController.getByCpmk(subCpmkCpmkId()!);
      setSubCpmkList(list);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  };

  const openMappingModal = async (cpmkId: number) => {
    setMappingCpmkId(cpmkId);
    setSelectedCplId(0);
    setMappingBobot('');
    setMappingErrorMsg('');
    const list = await cpmkCplMappingController.getAll(cpmkId);
    setMappingList(list);
    setShowMappingModal(true);
  };

  const handleAddMapping = async () => {
    setMappingErrorMsg('');
    if (!mappingCpmkId() || !selectedCplId()) {
      setMappingErrorMsg('Pilih CPL terlebih dahulu');
      return;
    }
    try {
      await cpmkCplMappingController.create({
        cpmkId: mappingCpmkId()!,
        cplId: selectedCplId(),
        bobot: mappingBobot() ? Number(mappingBobot()) : null,
      });
      setSelectedCplId(0);
      setMappingBobot('');
      const list = await cpmkCplMappingController.getAll(mappingCpmkId()!);
      setMappingList(list);
    } catch (err: any) {
      setMappingErrorMsg(err.message || 'Gagal menambah mapping');
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('Hapus mapping ini?')) return;
    try {
      await cpmkCplMappingController.delete(id);
      const list = await cpmkCplMappingController.getAll(mappingCpmkId()!);
      setMappingList(list);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Capaian Pembelajaran Mata Kuliah (CPMK)</h1>
          <Button variant="primary" onClick={openAddModal}>
            Tambah CPMK
          </Button>
        </div>

        <div class="flex flex-wrap gap-4 items-end">
          <div class="w-64">
            <Input
              type="select"
              label="Program Studi"
              placeholder="Filter Program Studi"
              value={prodiFilter() ?? ''}
              onInput={(e: any) => {
                const val = e.currentTarget.value;
                setProdiFilter(val ? Number(val) : undefined);
                setKurikulumFilter(undefined);
                setMataKuliahFilter(undefined);
                setPage(1);
              }}
              isSelect
              selectOptions={[
                { value: '', label: 'Semua Program Studi' },
                ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
              ]}
            />
          </div>
          <div class="w-64">
            <Input
              type="select"
              label="Kurikulum"
              placeholder="Filter Kurikulum"
              value={kurikulumFilter() ?? ''}
              onInput={(e: any) => {
                const val = e.currentTarget.value;
                setKurikulumFilter(val ? Number(val) : undefined);
                setMataKuliahFilter(undefined);
                setPage(1);
              }}
              isSelect
              selectOptions={[
                { value: '', label: 'Semua Kurikulum' },
                ...(kurikulums()?.data?.map((k) => ({ value: String(k.id), label: `${k.kode} - ${k.nama}` })) || []),
              ]}
            />
          </div>
          <div class="w-64">
            <Input
              type="select"
              label="Mata Kuliah"
              placeholder="Filter Mata Kuliah"
              value={mataKuliahFilter() ?? ''}
              onInput={(e: any) => {
                const val = e.currentTarget.value;
                setMataKuliahFilter(val ? Number(val) : undefined);
                setPage(1);
              }}
              isSelect
              selectOptions={[
                { value: '', label: 'Semua Mata Kuliah' },
                ...(mataKuliahs()?.data?.map((mk) => ({ value: String(mk.id), label: `${mk.kode} - ${mk.nama}` })) ||
                  []),
              ]}
            />
          </div>
          <div class="flex-1">
            <Input
              label="Cari"
              placeholder="Cari kode atau deskripsi..."
              value={search()}
              onInput={(e: any) => {
                setSearch(e.currentTarget.value);
                setPage(1);
              }}
            />
          </div>
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <div class="bg-[#1e293b] rounded-2xl overflow-hidden">
          <Table headers={['Kode', 'Deskripsi', 'Mata Kuliah', 'Sub-CPMK', 'CPL Mapping', 'Aksi']}>
            <Show
              when={!cpmkList.loading}
              fallback={
                <tr>
                  <td colspan={6} class="text-center py-8 text-secondary-300">
                    Memuat...
                  </td>
                </tr>
              }
            >
              <For
                each={cpmkList()?.data ?? []}
                fallback={
                  <tr>
                    <td colspan={6} class="text-center py-8 text-secondary-300">
                      Belum ada data
                    </td>
                  </tr>
                }
              >
                {(item) => (
                  <tr class="border-t border-slate-700/50 hover:bg-slate-700/30">
                    <td class="px-4 py-3 font-medium text-black dark:text-white">{item.kode}</td>
                    <td class="px-4 py-3 text-black dark:text-white max-w-md truncate">{item.deskripsi}</td>
                    <td class="px-4 py-3 text-black dark:text-white">{item.mataKuliah?.nama || '-'}</td>
                    <td class="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openSubCpmkModal(item.id)}>
                        {item.subCpmk?.length || 0} Sub
                      </Button>
                    </td>
                    <td class="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => openMappingModal(item.id)}>
                        {item.cplMappings?.length || 0} CPL
                      </Button>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </Show>
          </Table>
        </div>

        <Show when={cpmkList() && cpmkList()!.meta.totalPages > 1}>
          <div class="flex justify-between items-center">
            <span class="text-sm text-secondary-400">
              Halaman {page()} dari {cpmkList()?.meta.totalPages} ({cpmkList()?.meta.total} total)
            </span>
            <div class="flex gap-2">
              <Button variant="secondary" disabled={page() === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))}>
                Sebelumnya
              </Button>
              <Button
                variant="secondary"
                disabled={page() >= cpmkList()!.meta.totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, cpmkList()!.meta.totalPages))}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        </Show>

        <Modal show={showModal()} onClose={() => setShowModal(false)} title={editId() ? 'Edit CPMK' : 'Tambah CPMK'}>
          <div class="space-y-4">
            <Show when={errorMsg()}>
              <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{errorMsg()}</div>
            </Show>

            <Input
              type="select"
              label="Mata Kuliah"
              value={mataKuliahId()}
              onInput={(e: any) => {
                setMataKuliahId(Number(e.currentTarget.value));
                setKurikulumMataKuliahId(null);
              }}
              isSelect
              selectOptions={[
                { value: '0', label: 'Pilih Mata Kuliah' },
                ...(mataKuliahs()?.data?.map((mk) => ({ value: String(mk.id), label: `${mk.kode} - ${mk.nama}` })) ||
                  []),
              ]}
            />

            <Input
              type="select"
              label="Kurikulum Mata Kuliah (Opsional)"
              value={kurikulumMataKuliahId() || ''}
              onInput={(e: any) =>
                setKurikulumMataKuliahId(e.currentTarget.value ? Number(e.currentTarget.value) : null)
              }
              isSelect
              selectOptions={[
                { value: '', label: 'Tidak Ada' },
                ...(mataKuliahs()
                  ?.data?.filter((mk) => mk.id === mataKuliahId())
                  .map((mk) => ({
                    value: String(mk.kurikulumMataKuliahId || ''),
                    label: `Semester ${mk.semester}`,
                  })) || []),
              ]}
            />

            <Input label="Kode CPMK" value={kode()} onInput={(e: any) => setKode(e.currentTarget.value)} />
            <div>
              <label class="block text-sm font-medium text-secondary-200 mb-1">Deskripsi</label>
              <textarea
                class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                rows={3}
                value={deskripsi()}
                onInput={(e: any) => setDeskripsi(e.currentTarget.value)}
              />
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSave}>
                Simpan
              </Button>
            </div>
          </div>
        </Modal>

        <Modal show={showSubCpmkModal()} onClose={() => setShowSubCpmkModal(false)} title="Sub-CPMK" maxWidth="lg">
          <div class="space-y-4">
            <Show when={subCpmkErrorMsg()}>
              <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{subCpmkErrorMsg()}</div>
            </Show>

            <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 class="text-blue-300 font-medium mb-2">Tambah Sub-CPMK</h4>
              <div class="grid grid-cols-4 gap-3">
                <div class="col-span-1">
                  <Input
                    label="Kode"
                    value={subCpmkKode()}
                    onInput={(e: any) => setSubCpmkKode(e.currentTarget.value)}
                  />
                </div>
                <div class="col-span-2">
                  <Input
                    label="Deskripsi"
                    value={subCpmkDeskripsi()}
                    onInput={(e: any) => setSubCpmkDeskripsi(e.currentTarget.value)}
                  />
                </div>
                <div class="col-span-1">
                  <Input
                    type="number"
                    label="Urutan"
                    value={subCpmkUrutan()}
                    onInput={(e: any) => setSubCpmkUrutan(Number(e.currentTarget.value))}
                  />
                </div>
              </div>
              <div class="flex justify-end gap-2 mt-3">
                <Show when={subCpmkEditId() !== null}>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSubCpmkEditId(null);
                      setSubCpmkKode('');
                      setSubCpmkDeskripsi('');
                      setSubCpmkUrutan(0);
                    }}
                  >
                    Batal Edit
                  </Button>
                </Show>
                <Button variant="primary" onClick={handleSaveSubCpmk}>
                  {subCpmkEditId() !== null ? 'Update' : 'Tambah'}
                </Button>
              </div>
            </div>

            <div class="border-t border-slate-700 pt-4">
              <h4 class="text-sm font-medium text-secondary-200 mb-2">Daftar Sub-CPMK</h4>
              <Show
                when={subCpmkList().length > 0}
                fallback={<p class="text-secondary-400 text-sm">Belum ada Sub-CPMK</p>}
              >
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-secondary-400 border-b border-slate-700">
                      <th class="text-left py-2">Kode</th>
                      <th class="text-left py-2">Deskripsi</th>
                      <th class="text-left py-2">Urutan</th>
                      <th class="text-right py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={subCpmkList()}>
                      {(item) => (
                        <tr class="border-b border-slate-700/50">
                          <td class="py-2 text-black dark:text-white">{item.kode}</td>
                          <td class="py-2 text-black dark:text-white">{item.deskripsi}</td>
                          <td class="py-2 text-black dark:text-white">{item.urutan}</td>
                          <td class="py-2 text-right">
                            <div class="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditSubCpmk(item)}>
                                Edit
                              </Button>
                              <Button variant="danger" size="sm" onClick={() => handleDeleteSubCpmk(item.id)}>
                                Hapus
                              </Button>
                            </div>
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

        <Modal
          show={showMappingModal()}
          onClose={() => setShowMappingModal(false)}
          title="Mapping CPMK ke CPL"
          maxWidth="lg"
        >
          <div class="space-y-4">
            <Show when={mappingErrorMsg()}>
              <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{mappingErrorMsg()}</div>
            </Show>

            <div class="flex gap-3 items-end">
              <div class="flex-1">
                <Input
                  type="select"
                  label="CPL"
                  value={selectedCplId()}
                  onInput={(e: any) => setSelectedCplId(Number(e.currentTarget.value))}
                  isSelect
                  selectOptions={[
                    { value: '0', label: 'Pilih CPL' },
                    ...(cplOptions()?.map((c: any) => ({ value: String(c.id), label: `${c.kode} - ${c.deskripsi}` })) ||
                      []),
                  ]}
                />
              </div>
              <div class="w-32">
                <Input
                  label="Bobot"
                  type="number"
                  placeholder="(opsional)"
                  value={mappingBobot()}
                  onInput={(e: any) => setMappingBobot(e.currentTarget.value)}
                />
              </div>
              <Button variant="primary" size="sm" onClick={handleAddMapping}>
                Tambah
              </Button>
            </div>

            <div class="border-t border-slate-700 pt-4">
              <h4 class="text-sm font-medium text-secondary-200 mb-2">Mapping Saat Ini</h4>
              <Show
                when={mappingList().length > 0}
                fallback={<p class="text-secondary-400 text-sm">Belum ada mapping</p>}
              >
                <table class="w-full text-sm">
                  <thead>
                    <tr class="text-secondary-400 border-b border-slate-700">
                      <th class="text-left py-2">CPL</th>
                      <th class="text-left py-2">Bobot</th>
                      <th class="text-right py-2">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={mappingList()}>
                      {(m) => (
                        <tr class="border-b border-slate-700/50">
                          <td class="py-2 text-black dark:text-white">{m.cpl?.kode || '-'}</td>
                          <td class="py-2 text-black dark:text-white">{m.bobot ?? '(merata)'}</td>
                          <td class="py-2 text-right">
                            <Button variant="danger" size="sm" onClick={() => handleDeleteMapping(m.id)}>
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
