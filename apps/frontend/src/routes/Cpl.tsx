import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { cplController, Cpl as ICpl, ImportCplResult } from '../controllers/cplController';
import { prodiController } from '../controllers/prodiController';
import { profilLulusanController } from '../controllers/profilLulusanController';
import { usePagination } from '../hooks/usePagination';
import { isHeaderRow, parseCsv } from '../utils/csv';

export default function Cpl() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  const [cplList, { refetch }] = createResource(
    () => ({ prodiId: prodiFilter() }),
    ({ prodiId }) => cplController.getAll(prodiId),
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [deskripsi, setDeskripsi] = createSignal('');
  const [urutan, setUrutan] = createSignal(0);
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [errorMsg, setErrorMsg] = createSignal('');

  const [showMappingModal, setShowMappingModal] = createSignal(false);
  const [mappingCplId, setMappingCplId] = createSignal<number | null>(null);
  const [mappingProdiId, setMappingProdiId] = createSignal<number>(0);
  const [selectedPlId, setSelectedPlId] = createSignal<number>(0);
  const [mappingBobot, setMappingBobot] = createSignal<string>('');
  const [mappings, setMappings] = createSignal<{ id: number; profilLulusan?: { kode: string }; bobot?: number }[]>([]);

  const [showImportModal, setShowImportModal] = createSignal(false);
  const [importItems, setImportItems] = createSignal<{ kodeProdi: string; kode: string; deskripsi: string }[]>([]);
  const [importResult, setImportResult] = createSignal<ImportCplResult | null>(null);
  const [importLoading, setImportLoading] = createSignal(false);

  const { page, limit, setPage, setLimit, resetPage } = usePagination();

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
    const data = cplList() || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

  function openAddModal() {
    setEditId(null);
    setKode('');
    setDeskripsi('');
    setUrutan(0);
    setProdiId(prodiFilter() || 0);
    setErrorMsg('');
    setShowModal(true);
  }

  function openEditModal(item: {
    id: number;
    kode: string;
    deskripsi: string;
    urutan: number;
    programStudiId: number;
  }) {
    setEditId(item.id);
    setKode(item.kode);
    setDeskripsi(item.deskripsi);
    setUrutan(item.urutan);
    setProdiId(item.programStudiId);
    setErrorMsg('');
    setShowModal(true);
  }

  async function handleSave() {
    setErrorMsg('');
    if (!kode() || !deskripsi() || !prodiId()) {
      setErrorMsg('Kode, deskripsi, dan program studi harus diisi');
      return;
    }
    try {
      if (editId() !== null) {
        await cplController.update(editId()!, { kode: kode(), deskripsi: deskripsi(), urutan: urutan() });
      } else {
        await cplController.create({
          programStudiId: prodiId(),
          kode: kode(),
          deskripsi: deskripsi(),
          urutan: urutan(),
        });
      }
      refetch();
      setShowModal(false);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal menyimpan data');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus CPL ini?')) return;
    try {
      await cplController.delete(id);
      refetch();
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus');
    }
  }

  async function openMappingModal(item: { id: number; programStudiId: number }) {
    setMappingCplId(item.id);
    setMappingProdiId(item.programStudiId);
    setSelectedPlId(0);
    setMappingBobot('');
    setErrorMsg('');
    const existMappings = await cplController.getMappings(undefined, item.id);
    setMappings(existMappings);
    setShowMappingModal(true);
  }

  async function handleAddMapping() {
    if (!mappingCplId() || !selectedPlId()) {
      setErrorMsg('Pilih Profil Lulusan terlebih dahulu');
      return;
    }
    try {
      await cplController.createMapping({
        cplId: mappingCplId()!,
        profilLulusanId: selectedPlId(),
        bobot: mappingBobot() ? Number(mappingBobot()) : null,
      });
      setSelectedPlId(0);
      setMappingBobot('');
      const existMappings = await cplController.getMappings(undefined, mappingCplId()!);
      setMappings(existMappings);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal menambah mapping');
    }
  }

  async function handleDeleteMapping(mappingId: number) {
    try {
      await cplController.deleteMapping(mappingId);
      const existMappings = await cplController.getMappings(undefined, mappingCplId()!);
      setMappings(existMappings);
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus mapping');
    }
  }

  function openImportModal() {
    setImportItems([]);
    setImportResult(null);
    setErrorMsg('');
    setShowImportModal(true);
  }

  function parseCplCsv(text: string): { kodeProdi: string; kode: string; deskripsi: string }[] {
    const rows = parseCsv(text);
    const items: { kodeProdi: string; kode: string; deskripsi: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      if (i === 0 && isHeaderRow(row[0], ['kode_prodi', 'kodeprodi'])) {
        continue;
      }

      const kodeProdi = row[0] || '';
      const kode = row[1] || '';
      const deskripsi = row.slice(2).join(',') || '';

      if (kode && deskripsi) {
        items.push({ kodeProdi, kode, deskripsi });
      }
    }

    return items;
  }

  function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const items = parseCplCsv(text);
      setImportItems(items);
      if (items.length === 0) {
        setErrorMsg('File CSV tidak valid. Format: kode_prodi,kode,deskripsi');
      } else {
        setErrorMsg('');
      }
    };
    reader.readAsText(file);
    input.value = '';
  }

  async function handleImport() {
    if (importItems().length === 0) {
      setErrorMsg('Upload file CSV terlebih dahulu');
      return;
    }

    setImportLoading(true);
    setErrorMsg('');
    try {
      const result = await cplController.import(importItems());
      setImportResult(result);
      if (result.success > 0) {
        refetch();
      }
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal mengimpor data');
    } finally {
      setImportLoading(false);
    }
  }

  async function handleDownloadTemplate() {
    const csv = await cplController.downloadTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-cpl.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const [plOptions] = createResource(
    () => mappingProdiId(),
    async (prodiId) => {
      if (!prodiId) return [];
      return profilLulusanController.getAll(prodiId);
    },
  );

  const headers = [
    <SortableHeader field="kode" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Kode
    </SortableHeader>,
    <SortableHeader field="deskripsi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Deskripsi
    </SortableHeader>,
    'Program Studi',
    'Mapping Profil Lulusan',
    <SortableHeader field="urutan" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Urutan
    </SortableHeader>,
    'Aksi',
  ];

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Capaian Pembelajaran Lulusan (CPL)</h1>
          <div class="flex gap-2">
            <Button variant="secondary" onClick={openImportModal}>
              Impor CSV
            </Button>
            <Button variant="primary" onClick={openAddModal}>
              Tambah CPL
            </Button>
          </div>
        </div>

        <div class="flex gap-4 items-center">
          <div class="w-64">
            <Input
              type="select"
              placeholder="Filter Program Studi"
              value={prodiFilter() ?? ''}
              onInput={(e) => {
                const val = e.currentTarget.value;
                setProdiFilter(val ? Number(val) : undefined);
              }}
              isSelect
              selectOptions={[
                { value: '', label: 'Semua Program Studi' },
                ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
              ]}
            />
          </div>
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        <div class="bg-[#1e293b] rounded-2xl overflow-hidden">
          <Table headers={headers}>
            <Show
              when={!cplList.loading}
              fallback={
                <tr>
                  <td colspan={headers.length} class="text-center py-8 text-secondary-300">
                    Memuat...
                  </td>
                </tr>
              }
            >
              <For
                each={sortedData()}
                fallback={
                  <tr>
                    <td colspan={headers.length} class="text-center py-8 text-secondary-300">
                      Belum ada data
                    </td>
                  </tr>
                }
              >
                {(item) => (
                  <tr class="border-t border-slate-700/50 hover:bg-slate-700/30">
                    <td class="px-4 py-3 font-medium text-black dark:text-white">{item.kode}</td>
                    <td class="px-4 py-3 text-black dark:text-white max-w-md truncate">{item.deskripsi}</td>
                    <td class="px-4 py-3 text-black dark:text-white">{item.programStudi?.nama || '-'}</td>
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openMappingModal(item)}>
                          Atur Mapping
                        </Button>
                        <Show when={item.profilLulusanMappings && item.profilLulusanMappings.length > 0}>
                          <Badge variant="info">{item.profilLulusanMappings?.length} PL</Badge>
                        </Show>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-black dark:text-white">{item.urutan}</td>
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
          totalPages={Math.ceil((cplList()?.length || 0) / limit())}
          total={cplList()?.length || 0}
          limit={limit()}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      <Modal
        show={showModal()}
        onClose={() => setShowModal(false)}
        title={editId() !== null ? 'Edit CPL' : 'Tambah CPL'}
      >
        <form
          class="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          <Show when={errorMsg()}>
            <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{errorMsg()}</div>
          </Show>
          <Show when={editId() === null}>
            <Input
              type="select"
              label="Program Studi"
              value={prodiId()}
              onInput={(e) => setProdiId(Number(e.currentTarget.value))}
              isSelect
              selectOptions={[
                { value: '0', label: 'Pilih Program Studi' },
                ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
              ]}
            />
          </Show>
          <Input label="Kode" placeholder="CPL-1" value={kode()} onInput={(e) => setKode(e.currentTarget.value)} />
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Deskripsi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Deskripsi CPL"
              value={deskripsi()}
              onInput={(e) => setDeskripsi(e.currentTarget.value)}
            />
          </div>
          <Input
            label="Urutan"
            type="number"
            value={urutan()}
            onInput={(e) => setUrutan(Number(e.currentTarget.value))}
          />
          <div class="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        show={showMappingModal()}
        onClose={() => setShowMappingModal(false)}
        title="Mapping CPL ke Profil Lulusan"
        maxWidth="lg"
      >
        <div class="space-y-4">
          <Show when={errorMsg()}>
            <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{errorMsg()}</div>
          </Show>

          <div class="flex gap-3 items-end">
            <div class="flex-1">
              <Input
                type="select"
                label="Profil Lulusan"
                value={selectedPlId()}
                onInput={(e) => setSelectedPlId(Number(e.currentTarget.value))}
                isSelect
                selectOptions={[
                  { value: '0', label: 'Pilih Profil Lulusan' },
                  ...(plOptions()?.map((pl: { id: number; kode: string; deskripsi: string }) => ({
                    value: String(pl.id),
                    label: `${pl.kode} - ${pl.deskripsi}`,
                  })) || []),
                ]}
              />
            </div>
            <div class="w-32">
              <Input
                label="Bobot"
                type="number"
                placeholder="(opsional)"
                value={mappingBobot()}
                onInput={(e) => setMappingBobot(e.currentTarget.value)}
              />
            </div>
            <Button variant="primary" size="sm" onClick={handleAddMapping}>
              Tambah
            </Button>
          </div>

          <div class="border-t border-slate-700 pt-4">
            <h4 class="text-sm font-medium text-secondary-200 mb-2">Mapping Saat Ini</h4>
            <Show when={mappings().length > 0} fallback={<p class="text-secondary-400 text-sm">Belum ada mapping</p>}>
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-secondary-400 border-b border-slate-700">
                    <th class="text-left py-2">Profil Lulusan</th>
                    <th class="text-left py-2">Bobot</th>
                    <th class="text-right py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={mappings()}>
                    {(m: { id: number; profilLulusan?: { kode: string }; bobot?: number }) => (
                      <tr class="border-b border-slate-700/50">
                        <td class="py-2 text-black dark:text-white">{m.profilLulusan?.kode || '-'}</td>
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
        title="Impor CPL dari CSV"
        maxWidth="lg"
      >
        <div class="space-y-4">
          <Show when={errorMsg()}>
            <div class="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg">{errorMsg()}</div>
          </Show>

          <Show when={!importResult()}>
            <div class="space-y-4">
              <div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <h4 class="text-blue-300 font-medium mb-2">Format CSV:</h4>
                <p class="text-slate-300 text-sm mb-2">
                  Baris pertama (header) akan dilewati jika mengandung kata "kode_prodi"
                </p>
                <code class="block bg-slate-900 p-3 rounded text-sm text-green-400">
                  kode_prodi,kode,deskripsi
                  <br />
                  TI,CPL-01,Mampu menerapkan konsep dasar pemrograman
                  <br />
                  TI,CPL-02,Mampu menganalisis kebutuhan sistem
                  <br />
                  TK,CPL-03,Mampu merancang solusi teknologi informasi
                </code>
              </div>

              <Button variant="secondary" onClick={handleDownloadTemplate} class="w-full">
                Download Template CSV
              </Button>

              <div>
                <label class="block text-sm font-medium text-secondary-200 mb-2">Upload File CSV</label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent-500 file:text-white hover:file:bg-accent-600"
                />
              </div>

              <Show when={importItems().length > 0}>
                <div class="border-t border-slate-700 pt-4">
                  <h4 class="text-sm font-medium text-secondary-200 mb-2">Preview ({importItems().length} data)</h4>
                  <div class="max-h-64 overflow-y-auto border border-slate-700 rounded-lg">
                    <table class="w-full text-sm">
                      <thead class="bg-slate-800 sticky top-0">
                        <tr class="text-secondary-400 border-b border-slate-700">
                          <th class="text-left py-2 px-3 w-12">#</th>
                          <th class="text-left py-2 px-3 w-16">Prodi</th>
                          <th class="text-left py-2 px-3 w-32">Kode</th>
                          <th class="text-left py-2 px-3">Deskripsi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={importItems()}>
                          {(item, index) => (
                            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td class="py-2 px-3 text-secondary-400">{index() + 1}</td>
                              <td class="py-2 px-3 text-accent-400 font-medium">{item.kodeProdi}</td>
                              <td class="py-2 px-3 text-black dark:text-white font-medium">{item.kode}</td>
                              <td class="py-2 px-3 text-slate-200">{item.deskripsi}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>

              <div class="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                  Batal
                </Button>
                <Button
                  variant="primary"
                  onClick={handleImport}
                  disabled={importLoading() || importItems().length === 0}
                >
                  {importLoading() ? 'Mengimpor...' : 'Impor'}
                </Button>
              </div>
            </div>
          </Show>

          <Show when={importResult()}>
            <div class="space-y-4">
              <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <h4 class="text-green-300 font-medium mb-2">Hasil Impor</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-secondary-400">Berhasil:</span>
                    <span class="text-green-400 font-medium ml-2">{importResult()!.success}</span>
                  </div>
                  <div>
                    <span class="text-secondary-400">Gagal:</span>
                    <span class="text-red-400 font-medium ml-2">{importResult()!.failed}</span>
                  </div>
                </div>
              </div>

              <Show when={importResult()!.errors.length > 0}>
                <div class="border-t border-slate-700 pt-4">
                  <h4 class="text-sm font-medium text-red-400 mb-2">Detail Error</h4>
                  <div class="max-h-48 overflow-y-auto border border-slate-700 rounded-lg">
                    <table class="w-full text-sm">
                      <thead class="bg-slate-800 sticky top-0">
                        <tr class="text-secondary-400 border-b border-slate-700">
                          <th class="text-left py-2 px-3 w-16">Baris</th>
                          <th class="text-left py-2 px-3 w-24">Kode</th>
                          <th class="text-left py-2 px-3">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={importResult()!.errors}>
                          {(err) => (
                            <tr class="border-b border-slate-700/50">
                              <td class="py-2 px-3 text-secondary-400">{err.row}</td>
                              <td class="py-2 px-3 text-black dark:text-white">{err.kode}</td>
                              <td class="py-2 px-3 text-red-400">{err.error}</td>
                            </tr>
                          )}
                        </For>
                      </tbody>
                    </table>
                  </div>
                </div>
              </Show>

              <div class="flex justify-end gap-3 pt-2">
                <Button variant="primary" onClick={() => setShowImportModal(false)}>
                  Selesai
                </Button>
              </div>
            </div>
          </Show>
        </div>
      </Modal>
    </MainLayout>
  );
}
