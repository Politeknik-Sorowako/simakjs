import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { prodiController } from '../controllers/prodiController';
import { visiMisiController } from '../controllers/visiMisiController';

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

  const headers = ['Tahun Berlaku', 'Visi', 'Misi', 'Status', 'Aksi'];

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Visi Misi Prodi</h1>
          <Button variant="primary" onClick={openAddModal}>
            Tambah Visi Misi
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
                    <td class="px-4 py-3 text-white">{item.tahunBerlaku || '-'}</td>
                    <td class="px-4 py-3 text-secondary-200 max-w-md truncate">{item.visi}</td>
                    <td class="px-4 py-3 text-secondary-200 max-w-md truncate">{item.misi}</td>
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
    </MainLayout>
  );
}
