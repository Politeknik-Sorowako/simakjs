import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { Cpl, cplController } from '../controllers/cplController';
import { cpmkController, Cpmk as ICpmk } from '../controllers/cpmkController';
import { CpmkCplMapping, cpmkCplMappingController } from '../controllers/cpmkCplMappingController';
import { kurikulumController } from '../controllers/kurikulumController';
import { mataKuliahController } from '../controllers/mataKuliahController';
import { prodiController } from '../controllers/prodiController';
import { SubCpmk, subCpmkController } from '../controllers/subCpmkController';
import { usePagination } from '../hooks/usePagination';
import { isHeaderRow, parseCsv } from '../utils/csv';

export default function Cpmk() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);
  const [kurikulumFilter, setKurikulumFilter] = createSignal<number | undefined>(undefined);
  const [mataKuliahFilter, setMataKuliahFilter] = createSignal<number | undefined>(undefined);
  const [search, setSearch] = createSignal('');
  const { page, limit, setPage, setLimit, resetPage } = usePagination();

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [kurikulums] = createResource(
    () => prodiFilter(),
    (prodiId) => (prodiId ? kurikulumController.getAll('', 1, 100, prodiId) : null),
  );

  const [mataKuliahs] = createResource(
    () => kurikulumFilter(),
    (kurikulumId) => (kurikulumId ? mataKuliahController.getAll('', 1, 500, kurikulumId) : null),
  );

  // Fetch all mata kuliah for form dropdown (independent of filter)
  const [allMataKuliahs] = createResource(() => mataKuliahController.getAll('', 1, 500));

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

  const [sortBy, setSortBy] = createSignal('kode');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => {
    const data = cpmkList()?.data || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

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
  const [subCpmkList, setSubCpmkList] = createSignal<SubCpmk[]>([]);
  const [subCpmkErrorMsg, setSubCpmkErrorMsg] = createSignal('');

  const [showMappingModal, setShowMappingModal] = createSignal(false);
  const [mappingCpmkId, setMappingCpmkId] = createSignal<number | null>(null);
  const [selectedCplId, setSelectedCplId] = createSignal<number>(0);
  const [mappingBobot, setMappingBobot] = createSignal<string>('');
  const [mappingList, setMappingList] = createSignal<CpmkCplMapping[]>([]);
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
    } catch (err: unknown) {
      setErrorMsg((err instanceof Error ? (err as Error).message : null) || 'Gagal menyimpan data');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus CPMK ini?')) return;
    try {
      await cpmkController.delete(id);
      refetch();
    } catch (err: unknown) {
      alert((err instanceof Error ? (err as Error).message : null) || 'Gagal menghapus');
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
    } catch (err: unknown) {
      setSubCpmkErrorMsg((err instanceof Error ? (err as Error).message : null) || 'Gagal menyimpan Sub-CPMK');
    }
  };

  const openEditSubCpmk = (item: SubCpmk) => {
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
    } catch (err: unknown) {
      alert((err instanceof Error ? (err as Error).message : null) || 'Gagal menghapus');
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
    } catch (err: unknown) {
      setMappingErrorMsg((err instanceof Error ? (err as Error).message : null) || 'Gagal menambah mapping');
    }
  };

  const handleDeleteMapping = async (id: number) => {
    if (!confirm('Hapus mapping ini?')) return;
    try {
      await cpmkCplMappingController.delete(id);
      const list = await cpmkCplMappingController.getAll(mappingCpmkId()!);
      setMappingList(list);
    } catch (err: unknown) {
      alert((err instanceof Error ? (err as Error).message : null) || 'Gagal menghapus');
    }
  };

  const [showImportModal, setShowImportModal] = createSignal(false);
  const [importFile, setImportFile] = createSignal<File | null>(null);
  const [importResult, setImportResult] = createSignal<{
    success: number;
    failed: number;
    errors: { row: number; kode: string; error: string }[];
  } | null>(null);
  const [importLoading, setImportLoading] = createSignal(false);

  const handleDownloadTemplate = () => {
    const csv =
      'kode_mata_kuliah,kode,deskripsi\nTI001,CPMK-01,Mampu menerapkan konsep dasar pemrograman\nTI001,CPMK-02,Mampu menganalisis kebutuhan sistem\nTI002,CPMK-01,Mampu merancang basis data relasional';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template-cpmk.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    setImportFile(input.files?.[0] || null);
  };

  const handleImport = async () => {
    if (!importFile()) {
      alert('Pilih file CSV terlebih dahulu');
      return;
    }
    setImportLoading(true);
    try {
      const text = await importFile()!.text();
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setImportLoading(false);
        alert('File CSV kosong atau format tidak sesuai');
        return;
      }
      const items: { kodeMataKuliah?: string; kode: string; deskripsi: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 3) continue;
        if (i === 0 && isHeaderRow(row[0], ['kode_mata_kuliah', 'kode_matakuliah'])) continue;
        const kodeMataKuliah = row[0]?.trim() || undefined;
        const kode = row[1]?.trim() || '';
        const deskripsi = row[2]?.trim() || '';
        if (kode && deskripsi) {
          items.push({ kodeMataKuliah, kode, deskripsi });
        }
      }
      if (items.length === 0) {
        setImportLoading(false);
        alert('Tidak ada data valid untuk diimport');
        return;
      }
      const result = await cpmkController.import(items);
      setImportResult(result);
      if (result.failed === 0) {
        refetch();
      }
    } catch (err: unknown) {
      alert((err instanceof Error ? (err as Error).message : null) || 'Gagal import');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Capaian Pembelajaran Mata Kuliah (CPMK)</h1>
          <div class="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setImportResult(null);
                setImportFile(null);
                setShowImportModal(true);
              }}
            >
              Import CSV
            </Button>
            <Button variant="primary" onClick={openAddModal}>
              Tambah CPMK
            </Button>
          </div>
        </div>

        <div class="flex flex-wrap gap-4 items-end">
          <div class="w-64">
            <Input
              type="select"
              label="Program Studi"
              placeholder="Filter Program Studi"
              value={prodiFilter() ?? ''}
              onInput={(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                setProdiFilter(val ? Number(val) : undefined);
                setKurikulumFilter(undefined);
                setMataKuliahFilter(undefined);
                resetPage();
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
              onInput={(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                setKurikulumFilter(val ? Number(val) : undefined);
                setMataKuliahFilter(undefined);
                resetPage();
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
              onInput={(e: Event) => {
                const val = (e.target as HTMLSelectElement).value;
                setMataKuliahFilter(val ? Number(val) : undefined);
                resetPage();
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
              onInput={(e: Event) => {
                setSearch((e.target as HTMLInputElement).value);
                resetPage();
              }}
            />
          </div>
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <div class="bg-[#1e293b] rounded-2xl overflow-hidden">
          <Table
            headers={[
              <SortableHeader field="kode" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Kode
              </SortableHeader>,
              <SortableHeader field="deskripsi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Deskripsi
              </SortableHeader>,
              <SortableHeader field="mataKuliahId" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                Mata Kuliah
              </SortableHeader>,
              'Sub-CPMK',
              'CPL Mapping',
              'Aksi',
            ]}
          >
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
                each={sortedData()}
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

        <Pagination
          currentPage={page()}
          totalPages={cpmkList()?.meta.totalPages || 1}
          total={cpmkList()?.meta.total || 0}
          limit={limit()}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />

        <Modal show={showModal()} onClose={() => setShowModal(false)} title={editId() ? 'Edit CPMK' : 'Tambah CPMK'}>
          <div class="space-y-4">
            <Show when={errorMsg()}>
              <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{errorMsg()}</div>
            </Show>

            <Input
              type="select"
              label="Mata Kuliah"
              value={String(mataKuliahId())}
              onInput={(e: Event) => {
                const val = Number((e.target as HTMLSelectElement).value);
                setMataKuliahId(val);
                setKurikulumMataKuliahId(null);
              }}
              isSelect
              selectOptions={[
                { value: '0', label: 'Pilih Mata Kuliah' },
                ...(allMataKuliahs()?.data?.map((mk) => ({ value: String(mk.id), label: `${mk.kode} - ${mk.nama}` })) ||
                  []),
              ]}
            />

            <Input
              label="Kode CPMK"
              value={kode()}
              onInput={(e: Event) => setKode((e.target as HTMLInputElement).value)}
            />
            <div>
              <label class="block text-sm font-medium text-secondary-200 mb-1">Deskripsi</label>
              <textarea
                class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                rows={3}
                value={deskripsi()}
                onInput={(e: Event) => setDeskripsi((e.target as HTMLTextAreaElement).value)}
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
                    onInput={(e: Event) => setSubCpmkKode((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div class="col-span-2">
                  <Input
                    label="Deskripsi"
                    value={subCpmkDeskripsi()}
                    onInput={(e: Event) => setSubCpmkDeskripsi((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div class="col-span-1">
                  <Input
                    type="number"
                    label="Urutan"
                    value={subCpmkUrutan()}
                    onInput={(e: Event) => setSubCpmkUrutan(Number((e.target as HTMLInputElement).value))}
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
                  onInput={(e: Event) => setSelectedCplId(Number((e.target as HTMLSelectElement).value))}
                  isSelect
                  selectOptions={[
                    { value: '0', label: 'Pilih CPL' },
                    ...(cplOptions()?.map((c: Cpl) => ({ value: String(c.id), label: `${c.kode} - ${c.deskripsi}` })) ||
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
                  onInput={(e: Event) => setMappingBobot((e.target as HTMLInputElement).value)}
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

        <Modal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          title="Import CPMK dari CSV"
          maxWidth="lg"
        >
          <div class="space-y-4">
            <Show when={importResult()}>
              <div class="space-y-3">
                <div
                  class={`p-4 rounded-lg border ${
                    importResult()!.failed === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}
                >
                  <p class="font-medium text-black dark:text-white">
                    {importResult()!.failed === 0
                      ? `Semua ${importResult()!.success} data berhasil diimport!`
                      : `${importResult()!.success} berhasil, ${importResult()!.failed} gagal`}
                  </p>
                  <Show when={importResult()!.errors.length > 0}>
                    <div class="mt-3 space-y-1 max-h-48 overflow-y-auto">
                      <For each={importResult()!.errors}>
                        {(err) => (
                          <p class="text-sm text-red-600 dark:text-red-300">
                            Baris {err.row}: {err.kode ? `(${err.kode}) ` : ''}
                            {err.error}
                          </p>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
                <div class="flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowImportModal(false);
                      setImportResult(null);
                    }}
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </Show>

            <Show when={!importResult()}>
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <p class="text-sm text-black dark:text-blue-300">
                  Format CSV: <code>kode_mata_kuliah,kode,deskripsi</code>
                </p>
                <p class="text-xs text-black dark:text-secondary-400 mt-1">
                  Kode Mata Kuliah harus terdaftar di sistem. Kode CPMK harus unik per Mata Kuliah.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleDownloadTemplate}>
                Download Template CSV
              </Button>
              <div>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportFileChange}
                  class="block w-full text-sm text-secondary-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent-600 file:text-white hover:file:bg-accent-500 file:cursor-pointer"
                />
              </div>
              <div class="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                  Batal
                </Button>
                <Button variant="primary" onClick={handleImport} disabled={importLoading()}>
                  {importLoading() ? 'Mengimport...' : 'Import'}
                </Button>
              </div>
            </Show>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
