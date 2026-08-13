import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { PasalPelanggaran, pasalController } from '../controllers/pasalController';

export default function AdminPasalBpa() {
  const auth = useAuth();
  const toast = useToast();

  const [pasalList, { refetch }] = createResource(() => pasalController.getAll({ includeInactive: true }));
  const [search, setSearch] = createSignal('');

  const filteredPasal = () => {
    const q = search().toLowerCase();
    const list = pasalList() || [];
    if (!q) return list;
    return list.filter((p) => p.nomorPasal.toLowerCase().includes(q) || p.bunyiPasal.toLowerCase().includes(q));
  };

  // Form state
  const [showModal, setShowModal] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [nomorPasal, setNomorPasal] = createSignal('');
  const [bunyiPasal, setBunyiPasal] = createSignal('');
  const [jenisSanksi, setJenisSanksi] = createSignal(1);
  const [isActive, setIsActive] = createSignal(true);
  const [isSaving, setIsSaving] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');

  const openAddModal = () => {
    setEditingId(null);
    setNomorPasal('');
    setBunyiPasal('');
    setJenisSanksi(1);
    setIsActive(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const openEditModal = (p: PasalPelanggaran) => {
    setEditingId(p.id);
    setNomorPasal(p.nomorPasal);
    setBunyiPasal(p.bunyiPasal);
    setJenisSanksi(p.jenisSanksi);
    setIsActive(p.isActive);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleSave = async (e: Event) => {
    e.preventDefault();
    if (!nomorPasal() || !bunyiPasal()) {
      setErrorMsg('Nomor pasal dan bunyi pasal wajib diisi.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const payload = {
        nomorPasal: nomorPasal(),
        bunyiPasal: bunyiPasal(),
        jenisSanksi: jenisSanksi(),
        isActive: isActive(),
      };
      if (editingId()) {
        await pasalController.update(editingId()!, payload);
        toast.showToast('Pasal berhasil diperbarui', 'success');
      } else {
        await pasalController.create(payload);
        toast.showToast('Pasal berhasil ditambahkan', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan pasal.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (p: PasalPelanggaran) => {
    if (!window.confirm(`Hapus pasal "${p.nomorPasal}"? Data pelanggaran yang memakai pasal ini tidak terpengaruh.`)) {
      return;
    }
    try {
      await pasalController.remove(p.id);
      toast.showToast('Pasal berhasil dihapus', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal menghapus pasal.', 'error');
    }
  };

  const sanksiLabel = (s: number) => (s === 4 ? 'Tertulis (4 poin)' : 'Lisan (1 poin)');

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-secondary-100 shadow-sm dark:bg-secondary-900 dark:border-secondary-800">
          <div>
            <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
              Master Pasal Pelanggaran (BPA)
            </h1>
            <p class="text-sm text-secondary-500">
              Kelola nomor pasal, bunyi pasal, dan kategori sanksi (Lisan=1 poin / Tertulis=4 poin).
            </p>
          </div>
          <Show when={auth.hasRole(['admin', 'prodi', 'super_admin'])}>
            <Button onClick={openAddModal} variant="primary">
              + Tambah Pasal
            </Button>
          </Show>
        </div>

        <div class="bg-white border border-secondary-100 rounded-2xl shadow-sm p-6 flex flex-col gap-4 dark:bg-secondary-900 dark:border-secondary-800">
          <div class="flex items-center gap-3">
            <div class="relative flex-1">
              <span class="absolute left-3.5 top-2.5 text-secondary-400 dark:text-secondary-200">🔍</span>
              <input
                type="text"
                placeholder="Cari nomor atau bunyi pasal..."
                class="w-full bg-secondary-50 border border-secondary-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-secondary-800 dark:border-secondary-700 dark:text-white"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
              />
            </div>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 dark:text-secondary-200 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800">
                  <th class="p-3">No</th>
                  <th class="p-3">Nomor Pasal</th>
                  <th class="p-3">Bunyi Pasal</th>
                  <th class="p-3">Jenis Sanksi</th>
                  <th class="p-3">Status</th>
                  <th class="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-secondary-50 font-medium text-secondary-600 dark:text-secondary-200">
                <For each={filteredPasal()}>
                  {(p, idx) => (
                    <tr class="hover:bg-secondary-50/20 dark:hover:bg-secondary-800/20">
                      <td class="p-3">{idx() + 1}</td>
                      <td class="p-3 font-bold text-secondary-800 dark:text-white">{p.nomorPasal}</td>
                      <td class="p-3 max-w-[400px]">{p.bunyiPasal}</td>
                      <td class="p-3">
                        <span
                          class={`px-2 py-0.5 rounded border font-bold ${
                            p.jenisSanksi === 4
                              ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                          }`}
                        >
                          {sanksiLabel(p.jenisSanksi)}
                        </span>
                      </td>
                      <td class="p-3">
                        <span
                          class={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.isActive
                              ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-secondary-100 text-secondary-500 dark:bg-secondary-800 dark:text-secondary-400'
                          }`}
                        >
                          {p.isActive ? 'Aktif' : 'Non-aktif'}
                        </span>
                      </td>
                      <td class="p-3">
                        <div class="flex items-center justify-center gap-2">
                          <Button onClick={() => openEditModal(p)} variant="secondary" class="py-1 px-2.5 text-[10px]">
                            Edit
                          </Button>
                          <Show when={auth.hasRole(['admin', 'super_admin'])}>
                            <Button onClick={() => handleDelete(p)} variant="danger" class="py-1 px-2.5 text-[10px]">
                              Hapus
                            </Button>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Tambah/Edit Pasal */}
        <Modal
          show={showModal()}
          onClose={() => setShowModal(false)}
          title={editingId() ? 'Edit Pasal BPA' : 'Tambah Pasal BPA'}
        >
          <form onSubmit={handleSave} class="flex flex-col gap-4">
            <Show when={errorMsg()}>
              <div class="p-3 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800">
                {errorMsg()}
              </div>
            </Show>

            <Input
              label="Nomor Pasal"
              placeholder="Contoh: Pasal 1, Pasal 2A"
              value={nomorPasal()}
              onInput={(e) => setNomorPasal(e.currentTarget.value)}
              required
            />

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-secondary-700">Bunyi Pasal</label>
              <textarea
                rows="4"
                placeholder="Tuliskan bunyi pasal sesuai BPA..."
                value={bunyiPasal()}
                onInput={(e) => setBunyiPasal(e.currentTarget.value)}
                class="border border-secondary-200 rounded-xl p-3 text-xs focus:outline-none focus:border-brand-500 resize-none dark:border-secondary-700"
                required
              />
            </div>

            <div class="flex flex-col gap-1">
              <label class="text-xs font-bold text-secondary-700">Kategori Sanksi</label>
              <select
                value={jenisSanksi()}
                onChange={(e) => setJenisSanksi(parseInt(e.currentTarget.value))}
                class="border border-secondary-200 rounded-xl p-3 text-xs bg-white focus:outline-none focus:border-brand-500 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-200"
              >
                <option value={1}>Lisan (1 poin)</option>
                <option value={4}>Tertulis (4 poin)</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="pasal-active"
                class="h-4 w-4 accent-brand-600"
                checked={isActive()}
                onChange={(e) => setIsActive(e.currentTarget.checked)}
              />
              <label for="pasal-active" class="text-xs font-bold text-secondary-700">
                Aktif
              </label>
            </div>

            <div class="flex justify-end gap-3 border-t pt-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving()}>
                {isSaving() ? 'Menyimpan...' : 'Simpan Pasal'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </MainLayout>
  );
}
