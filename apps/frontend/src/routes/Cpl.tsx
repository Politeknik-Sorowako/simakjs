import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { cplController, Cpl as ICpl } from '../controllers/cplController';
import { profilLulusanController } from '../controllers/profilLulusanController';
import { prodiController } from '../controllers/prodiController';

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
          <Button variant="primary" onClick={openAddModal}>
            Tambah CPL
          </Button>
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
                    <td class="px-4 py-3 font-medium text-white">{item.kode}</td>
                    <td class="px-4 py-3 text-secondary-200 max-w-md truncate">{item.deskripsi}</td>
                    <td class="px-4 py-3 text-secondary-200">{item.programStudi?.nama || '-'}</td>
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
                    <td class="px-4 py-3 text-secondary-200">{item.urutan}</td>
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
              selectOptions={
                prodis()?.data?.map((p) => ({ value: String(p.id), label: `${p.kode} - ${p.nama}` })) || []
              }
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
    </MainLayout>
  );
}
