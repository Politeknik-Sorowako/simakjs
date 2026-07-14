import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { cplController, Cpl as ICpl, ImportCplResult } from '../controllers/cplController';
import { prodiController } from '../controllers/prodiController';
import { profilLulusanController } from '../controllers/profilLulusanController';

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
  const [selectedPlId, setSelectedPlId] = createSignal<number>(0);
  const [mappingBobot, setMappingBobot] = createSignal<string>('');
  const [mappings, setMappings] = createSignal<any[]>([]);

  const [showImportModal, setShowImportModal] = createSignal(false);
  const [importProdiId, setImportProdiId] = createSignal<number>(0);
  const [importItems, setImportItems] = createSignal<{ kode: string; deskripsi: string }[]>([]);
  const [importResult, setImportResult] = createSignal<ImportCplResult | null>(null);
  const [importLoading, setImportLoading] = createSignal(false);

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
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus CPL ini?')) return;
    try {
      await cplController.delete(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  }

  async function openMappingModal(cplId: number) {
    setMappingCplId(cplId);
    setSelectedPlId(0);
    setMappingBobot('');
    setErrorMsg('');
    const existMappings = await cplController.getMappings(undefined, cplId);
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
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambah mapping');
    }
  }

  async function handleDeleteMapping(mappingId: number) {
    try {
      await cplController.deleteMapping(mappingId);
      const existMappings = await cplController.getMappings(undefined, mappingCplId()!);
      setMappings(existMappings);
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus mapping');
    }
  }

  function openImportModal() {
    setImportProdiId(prodiFilter() || 0);
    setImportItems([]);
    setImportResult(null);
    setErrorMsg('');
    setShowImportModal(true);
  }

  function parseCsv(text: string): { kode: string; deskripsi: string }[] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const items: { kode: string; deskripsi: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (i === 0 && (line.toLowerCase().includes('kode') || line.toLowerCase().includes('code'))) {
        continue;
      }

      const parts = line.split(',');
      if (parts.length < 2) continue;

      const kode = parts[0]?.trim().replace(/^"|"$/g, '') || '';
      const deskripsi = parts.slice(1).join(',').trim().replace(/^"|"$/g, '') || '';

      if (kode && deskripsi) {
        items.push({ kode, deskripsi });
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
      const items = parseCsv(text);
      setImportItems(items);
      if (items.length === 0) {
        setErrorMsg('File CSV tidak valid. Format: kode,deskripsi');
      } else {
        setErrorMsg('');
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!importProdiId()) {
      setErrorMsg('Pilih Program Studi terlebih dahulu');
      return;
    }
    if (importItems().length === 0) {
      setErrorMsg('Upload file CSV terlebih dahulu');
      return;
    }

    setImportLoading(true);
    setErrorMsg('');
    try {
      const result = await cplController.import(importProdiId(), importItems());
      setImportResult(result);
      if (result.success > 0) {
        refetch();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengimpor data');
    } finally {
      setImportLoading(false);
    }
  }

  const [plOptions] = createResource(
    () => prodiFilter(),
    async (prodiId) => {
      if (!prodiId) return [];
      return profilLulusanController.getAll(prodiId);
    },
  );

  const headers = ['Kode', 'Deskripsi', 'Program Studi', 'Mapping Profil Lulusan', 'Urutan', 'Aksi'];

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
              onInput={(e: any) => {
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
                each={cplList() ?? []}
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
                    <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.kode}</td>
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-md truncate">{item.deskripsi}</td>
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{item.programStudi?.nama || '-'}</td>
                    <td class="px-4 py-3">
                      <div class="flex flex-wrap gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openMappingModal(item.id)}>
                          Atur Mapping
                        </Button>
                        <Show when={item.profilLulusanMappings && item.profilLulusanMappings.length > 0}>
                          <Badge variant="info">{item.profilLulusanMappings?.length} PL</Badge>
                        </Show>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{item.urutan}</td>
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
              onInput={(e: any) => setProdiId(Number(e.currentTarget.value))}
              isSelect
              selectOptions={[
                { value: '0', label: 'Pilih Program Studi' },
                ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
              ]}
            />
          </Show>
          <Input label="Kode" placeholder="CPL-1" value={kode()} onInput={(e: any) => setKode(e.currentTarget.value)} />
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Deskripsi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Deskripsi CPL"
              value={deskripsi()}
              onInput={(e: any) => setDeskripsi(e.currentTarget.value)}
            />
          </div>
          <Input
            label="Urutan"
            type="number"
            value={urutan()}
            onInput={(e: any) => setUrutan(Number(e.currentTarget.value))}
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
                onInput={(e: any) => setSelectedPlId(Number(e.currentTarget.value))}
                isSelect
                selectOptions={[
                  { value: '0', label: 'Pilih Profil Lulusan' },
                  ...(plOptions()?.map((pl: any) => ({
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
                onInput={(e: any) => setMappingBobot(e.currentTarget.value)}
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
                    {(m: any) => (
                      <tr class="border-b border-slate-700/50">
                        <td class="py-2 text-white">{m.profilLulusan?.kode || '-'}</td>
                        <td class="py-2 text-secondary-200">{m.bobot ?? '(merata)'}</td>
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
                  Baris pertama (header) akan dilewati jika mengandung kata "kode" atau "code"
                </p>
                <code class="block bg-slate-900 p-3 rounded text-sm text-green-400">
                  kode,deskripsi
                  <br />
                  CPL-01,Mampu menerapkan konsep dasar pemrograman
                  <br />
                  CPL-02,Mampu menganalisis kebutuhan sistem
                  <br />
                  CPL-03,Mampu merancang solusi teknologi informasi
                </code>
              </div>

              <Input
                type="select"
                label="Program Studi"
                value={importProdiId()}
                onInput={(e: any) => setImportProdiId(Number(e.currentTarget.value))}
                isSelect
                selectOptions={[
                  { value: '0', label: 'Pilih Program Studi' },
                  ...(prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []),
                ]}
              />

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
                          <th class="text-left py-2 px-3 w-32">Kode</th>
                          <th class="text-left py-2 px-3">Deskripsi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={importItems()}>
                          {(item, index) => (
                            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td class="py-2 px-3 text-secondary-400">{index() + 1}</td>
                              <td class="py-2 px-3 text-white font-medium">{item.kode}</td>
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
                  disabled={importLoading() || importItems().length === 0 || !importProdiId()}
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
                              <td class="py-2 px-3 text-white">{err.kode}</td>
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
