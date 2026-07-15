import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { prodiController } from '../controllers/prodiController';
import { ImportResult, visiMisiController } from '../controllers/visiMisiController';
import { isHeaderRow, parseCsv } from '../utils/csv';

export default function VisiMisiProdi() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  const [data, { refetch }] = createResource(
    () => ({ prodiId: prodiFilter() }),
    ({ prodiId }) => visiMisiController.getAll(prodiId),
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [visi, setVisi] = createSignal('');
  const [misi, setMisi] = createSignal('');
  const [tujuan, setTujuan] = createSignal('');
  const [sasaran, setSasaran] = createSignal('');
  const [tahunBerlaku, setTahunBerlaku] = createSignal('');
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [errorMsg, setErrorMsg] = createSignal('');

  const [showImportModal, setShowImportModal] = createSignal(false);
  const [importProdiId, setImportProdiId] = createSignal<number>(0);
  const [importItems, setImportItems] = createSignal<
    { tahunBerlaku: string; visi: string; misi: string; tujuan?: string; sasaran?: string }[]
  >([]);
  const [importResult, setImportResult] = createSignal<ImportResult | null>(null);
  const [importLoading, setImportLoading] = createSignal(false);

  function openAddModal() {
    setEditId(null);
    setVisi('');
    setMisi('');
    setTujuan('');
    setSasaran('');
    setTahunBerlaku('');
    setProdiId(prodiFilter() || 0);
    setErrorMsg('');
    setShowModal(true);
  }

  function openEditModal(item: {
    id: number;
    visi: string;
    misi: string;
    tujuan?: string | null;
    sasaran?: string | null;
    tahunBerlaku?: string | null;
    programStudiId: number;
  }) {
    setEditId(item.id);
    setVisi(item.visi);
    setMisi(item.misi);
    setTujuan(item.tujuan || '');
    setSasaran(item.sasaran || '');
    setTahunBerlaku(item.tahunBerlaku || '');
    setProdiId(item.programStudiId);
    setErrorMsg('');
    setShowModal(true);
  }

  async function handleSave() {
    setErrorMsg('');
    if (!visi() || !misi() || !prodiId()) {
      setErrorMsg('Visi, misi, dan program studi harus diisi');
      return;
    }
    try {
      if (editId() !== null) {
        await visiMisiController.update(editId()!, {
          visi: visi(),
          misi: misi(),
          tujuan: tujuan() || undefined,
          sasaran: sasaran() || undefined,
          tahunBerlaku: tahunBerlaku() || undefined,
        });
      } else {
        await visiMisiController.create({
          programStudiId: prodiId(),
          visi: visi(),
          misi: misi(),
          tujuan: tujuan() || undefined,
          sasaran: sasaran() || undefined,
          tahunBerlaku: tahunBerlaku() || undefined,
          isAktif: false,
        });
      }
      refetch();
      setShowModal(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus Visi Misi ini?')) return;
    try {
      await visiMisiController.delete(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  }

  async function handleSetAktif(id: number) {
    if (!confirm('Tetapkan Visi Misi ini sebagai versi aktif?')) return;
    try {
      await visiMisiController.setAktif(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah status aktif');
    }
  }

  function openImportModal() {
    setImportProdiId(prodiFilter() || 0);
    setImportItems([]);
    setImportResult(null);
    setErrorMsg('');
    setShowImportModal(true);
  }

  function parseVmCsv(
    text: string,
  ): { tahunBerlaku: string; visi: string; misi: string; tujuan?: string; sasaran?: string }[] {
    const rows = parseCsv(text);
    const items: { tahunBerlaku: string; visi: string; misi: string; tujuan?: string; sasaran?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      if (i === 0 && isHeaderRow(row[0], ['tahunberlaku'])) {
        continue;
      }

      const tahunBerlaku = row[0] || '';
      const visi = row[1] || '';
      const misi = row[2] || '';
      const tujuan = row[3] || undefined;
      const sasaran = row[4] || undefined;

      if (visi && misi) {
        items.push({ tahunBerlaku, visi, misi, tujuan: tujuan || undefined, sasaran: sasaran || undefined });
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
      const items = parseVmCsv(text);
      setImportItems(items);
      if (items.length === 0) {
        setErrorMsg('File CSV tidak valid. Format: tahunBerlaku,visi,misi,tujuan,sasaran');
      } else {
        setErrorMsg('');
      }
    };
    reader.readAsText(file);
    input.value = '';
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
      const result = await visiMisiController.import(importProdiId(), importItems());
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

  async function handleDownloadTemplate() {
    const csv = await visiMisiController.downloadTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-visi-misi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const headers = ['Tahun Berlaku', 'Visi', 'Misi', 'Program Studi', 'Status', 'Aksi'];

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Visi Misi Prodi</h1>
          <div class="flex gap-2">
            <Button variant="secondary" onClick={handleDownloadTemplate}>
              Download Template
            </Button>
            <Button variant="secondary" onClick={openImportModal}>
              Impor CSV
            </Button>
            <Button variant="primary" onClick={openAddModal}>
              Tambah Visi Misi
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
              when={!data.loading}
              fallback={
                <tr>
                  <td colspan={headers.length} class="text-center py-8 text-secondary-300">
                    Memuat...
                  </td>
                </tr>
              }
            >
              <For
                each={data() ?? []}
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
                    <td class="px-4 py-3 text-black dark:text-white">{item.tahunBerlaku || '-'}</td>
                    <td class="px-4 py-3 text-black dark:text-white max-w-md truncate">{item.visi}</td>
                    <td class="px-4 py-3 text-black dark:text-white max-w-md truncate">{item.misi}</td>
                    <td class="px-4 py-3 text-black dark:text-white">{item.programStudi?.nama || '-'}</td>
                    <td class="px-4 py-3">
                      <Show when={item.isAktif} fallback={<Badge variant="default">Tidak Aktif</Badge>}>
                        <Badge variant="success">Aktif</Badge>
                      </Show>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex gap-2">
                        <Show when={!item.isAktif}>
                          <Button variant="ghost" size="sm" onClick={() => handleSetAktif(item.id)}>
                            Set Aktif
                          </Button>
                        </Show>
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
        title={editId() !== null ? 'Edit Visi Misi' : 'Tambah Visi Misi'}
        maxWidth="lg"
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
          <Input
            label="Tahun Berlaku"
            placeholder="2024"
            value={tahunBerlaku()}
            onInput={(e: any) => setTahunBerlaku(e.currentTarget.value)}
          />
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Visi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Visi program studi"
              value={visi()}
              onInput={(e: any) => setVisi(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Misi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={4}
              placeholder="Misi program studi"
              value={misi()}
              onInput={(e: any) => setMisi(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Tujuan (Opsional)</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Tujuan program studi"
              value={tujuan()}
              onInput={(e: any) => setTujuan(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Sasaran (Opsional)</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Sasaran program studi"
              value={sasaran()}
              onInput={(e: any) => setSasaran(e.currentTarget.value)}
            />
          </div>
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
        show={showImportModal()}
        onClose={() => setShowImportModal(false)}
        title="Impor Visi Misi dari CSV"
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
                  Baris pertama (header) akan dilewati jika mengandung kata "tahunBerlaku"
                </p>
                <code class="block bg-slate-900 p-3 rounded text-sm text-green-400">
                  tahunBerlaku,visi,misi,tujuan,sasaran
                  <br />
                  2024,Menjadi program studi unggul,Menyelenggarakan pendidikan berkualitas,Menghasilkan lulusan
                  kompeten,Meningkatkan akreditasi
                  <br />
                  2025,Menjadi pusat inovasi,Melakukan penelitian terapan,Mengembangkan teknologi,Meningkatkan kerjasama
                  industri
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
                          <th class="text-left py-2 px-3 w-20">Tahun</th>
                          <th class="text-left py-2 px-3">Visi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={importItems()}>
                          {(item, index) => (
                            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td class="py-2 px-3 text-secondary-400">{index() + 1}</td>
                              <td class="py-2 px-3 text-black dark:text-white font-medium">{item.tahunBerlaku}</td>
                              <td class="py-2 px-3 text-slate-200 truncate max-w-xs">{item.visi}</td>
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
                          <th class="text-left py-2 px-3 w-20">Tahun</th>
                          <th class="text-left py-2 px-3">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={importResult()!.errors}>
                          {(err) => (
                            <tr class="border-b border-slate-700/50">
                              <td class="py-2 px-3 text-secondary-400">{err.row}</td>
                              <td class="py-2 px-3 text-black dark:text-white">{err.tahunBerlaku}</td>
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
