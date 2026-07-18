import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { prodiController } from '../controllers/prodiController';
import { ImportResult, visiMisiController } from '../controllers/visiMisiController';
import { usePagination } from '../hooks/usePagination';
import { isHeaderRow, parseCsv } from '../utils/csv';

export default function VisiMisiProdi() {
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  const [data, { refetch }] = createResource(
    () => ({ prodiId: prodiFilter() }),
    ({ prodiId }) => visiMisiController.getAll(prodiId),
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

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
    const allData = data() ?? [];
    return [...allData].sort((a, b) => {
      const getVal = (item: Record<string, unknown>) => {
        if (sortBy() === 'programStudi') return (item.programStudi as Record<string, unknown>)?.nama ?? '';
        return item[sortBy()] ?? '';
      };
      const aVal = getVal(a as unknown as Record<string, unknown>);
      const bVal = getVal(b as unknown as Record<string, unknown>);
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };
  const pagedData = () => {
    const sorted = sortedData();
    const start = (page() - 1) * limit();
    return sorted.slice(start, start + limit());
  };
  const totalPages = () => Math.ceil((data()?.length ?? 0) / limit());

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
  const [importItems, setImportItems] = createSignal<
    { kodeProdi: string; tahunBerlaku: string; visi: string; misi: string; tujuan?: string; sasaran?: string }[]
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
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Gagal menyimpan data');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Hapus Visi Misi ini?')) return;
    try {
      await visiMisiController.delete(id);
      refetch();
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal menghapus');
    }
  }

  async function handleSetAktif(id: number) {
    if (!confirm('Tetapkan Visi Misi ini sebagai versi aktif?')) return;
    try {
      await visiMisiController.setAktif(id);
      refetch();
    } catch (err: unknown) {
      alert((err as Error).message || 'Gagal mengubah status aktif');
    }
  }

  function openImportModal() {
    setImportItems([]);
    setImportResult(null);
    setErrorMsg('');
    setShowImportModal(true);
  }

  function parseVmCsv(
    text: string,
  ): { kodeProdi: string; tahunBerlaku: string; visi: string; misi: string; tujuan?: string; sasaran?: string }[] {
    const rows = parseCsv(text);
    const items: {
      kodeProdi: string;
      tahunBerlaku: string;
      visi: string;
      misi: string;
      tujuan?: string;
      sasaran?: string;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;

      if (i === 0 && isHeaderRow(row[0], ['kode_prodi', 'kodeprodi'])) {
        continue;
      }

      const kodeProdi = row[0] || '';
      const tahunBerlaku = row[1] || '';
      const visi = row[2] || '';
      const misi = row[3] || '';
      const tujuan = row[4] || undefined;
      const sasaran = row[5] || undefined;

      if (kodeProdi && visi && misi) {
        items.push({
          kodeProdi,
          tahunBerlaku,
          visi,
          misi,
          tujuan: tujuan || undefined,
          sasaran: sasaran || undefined,
        });
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
        setErrorMsg('File CSV tidak valid. Format: kode_prodi,tahunBerlaku,visi,misi,tujuan,sasaran');
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
      const result = await visiMisiController.import(importItems());
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
    const csv = await visiMisiController.downloadTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template-visi-misi.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const headers = [
    <SortableHeader field="tahunBerlaku" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Tahun Berlaku
    </SortableHeader>,
    <SortableHeader field="visi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Visi
    </SortableHeader>,
    <SortableHeader field="misi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Misi
    </SortableHeader>,
    <SortableHeader field="programStudi" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Program Studi
    </SortableHeader>,
    <SortableHeader field="isAktif" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
      Status
    </SortableHeader>,
    'Aksi',
  ];

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
              onInput={(e) => {
                const val = e.currentTarget.value;
                setProdiFilter(val ? Number(val) : undefined);
                resetPage();
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
                each={pagedData()}
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

        <Pagination
          currentPage={page()}
          totalPages={totalPages()}
          total={data()?.length ?? 0}
          limit={limit()}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
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
              onInput={(e) => setProdiId(Number(e.currentTarget.value))}
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
            onInput={(e) => setTahunBerlaku(e.currentTarget.value)}
          />
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Visi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Visi program studi"
              value={visi()}
              onInput={(e) => setVisi(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Misi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={4}
              placeholder="Misi program studi"
              value={misi()}
              onInput={(e) => setMisi(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Tujuan (Opsional)</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Tujuan program studi"
              value={tujuan()}
              onInput={(e) => setTujuan(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Sasaran (Opsional)</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Sasaran program studi"
              value={sasaran()}
              onInput={(e) => setSasaran(e.currentTarget.value)}
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
                  Baris pertama (header) akan dilewati jika mengandung kata "kode_prodi"
                </p>
                <code class="block bg-slate-900 p-3 rounded text-sm text-green-400">
                  kode_prodi,tahunBerlaku,visi,misi,tujuan,sasaran
                  <br />
                  TI,2024,Menjadi program studi unggul,Menyelenggarakan pendidikan berkualitas,Menghasilkan lulusan
                  kompeten,Meningkatkan akreditasi
                  <br />
                  TK,2025,Menjadi pusat inovasi,Melakukan penelitian terapan,Mengembangkan teknologi,Meningkatkan
                  kerjasama industri
                </code>
              </div>

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
                          <th class="text-left py-2 px-3 w-20">Tahun</th>
                          <th class="text-left py-2 px-3">Visi</th>
                        </tr>
                      </thead>
                      <tbody>
                        <For each={importItems()}>
                          {(item, index) => (
                            <tr class="border-b border-slate-700/50 hover:bg-slate-700/30">
                              <td class="py-2 px-3 text-secondary-400">{index() + 1}</td>
                              <td class="py-2 px-3 text-accent-400 font-medium">{item.kodeProdi}</td>
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
