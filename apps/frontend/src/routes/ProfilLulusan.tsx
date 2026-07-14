import { useNavigate } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Table } from '../components/ui/Table';
import { prodiController } from '../controllers/prodiController';
import { profilLulusanController } from '../controllers/profilLulusanController';

export default function ProfilLulusan() {
  const navigate = useNavigate();
  const [prodiFilter, setProdiFilter] = createSignal<number | undefined>(undefined);

  const [data, { refetch }] = createResource(
    () => ({ prodiId: prodiFilter() }),
    ({ prodiId }) => profilLulusanController.getAll(prodiId),
  );

  const [prodis] = createResource(() => prodiController.getAll(undefined, 1, 100));

  const [showModal, setShowModal] = createSignal(false);
  const [editId, setEditId] = createSignal<number | null>(null);
  const [kode, setKode] = createSignal('');
  const [deskripsi, setDeskripsi] = createSignal('');
  const [urutan, setUrutan] = createSignal(0);
  const [prodiId, setProdiId] = createSignal<number>(0);
  const [errorMsg, setErrorMsg] = createSignal('');

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
        await profilLulusanController.update(editId()!, {
          kode: kode(),
          deskripsi: deskripsi(),
          urutan: urutan(),
        });
      } else {
        await profilLulusanController.create({
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
    if (!confirm('Hapus Profil Lulusan ini?')) return;
    try {
      await profilLulusanController.delete(id);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus');
    }
  }

  const headers = ['Kode', 'Deskripsi', 'Program Studi', 'Urutan', 'Aksi'];

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold text-white">Profil Lulusan</h1>
          <Button variant="primary" onClick={openAddModal}>
            Tambah Profil Lulusan
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
                    <td class="px-4 py-3 font-medium text-slate-900 dark:text-white">{item.kode}</td>
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300 max-w-md truncate">{item.deskripsi}</td>
                    <td class="px-4 py-3 text-slate-700 dark:text-slate-300">{item.programStudi?.nama || '-'}</td>
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
        title={editId() !== null ? 'Edit Profil Lulusan' : 'Tambah Profil Lulusan'}
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
          <Input label="Kode" placeholder="PL-1" value={kode()} onInput={(e: any) => setKode(e.currentTarget.value)} />
          <div>
            <label class="block text-sm font-medium text-secondary-200 mb-1">Deskripsi</label>
            <textarea
              class="w-full px-4 py-2.5 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder:text-secondary-400 focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              rows={3}
              placeholder="Deskripsi Profil Lulusan"
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
    </MainLayout>
  );
}
