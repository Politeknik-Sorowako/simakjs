import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiVABanks() {
  const toast = useToast();
  const [showForm, setShowForm] = createSignal(false);
  const [kode, setKode] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [isMidtrans, setIsMidtrans] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const [banks, { refetch }] = createResource(() => admisiAdminController.getAllVABanks());

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!kode() || !nama()) return;
    setSaving(true);
    try {
      await admisiAdminController.createVABank({ kode: kode(), nama: nama(), isMidtrans: isMidtrans() });
      toast.showToast('Bank VA ditambahkan', 'success');
      setShowForm(false);
      setKode('');
      setNama('');
      setIsMidtrans(false);
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: number, current: boolean) => {
    try {
      await admisiAdminController.updateVABank(id, { isActive: !current });
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus bank ini?')) return;
    try {
      await admisiAdminController.deleteVABank(id);
      toast.showToast('Bank dihapus', 'success');
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const presetBanks = [
    { kode: 'bca', nama: 'Bank BCA' },
    { kode: 'bni', nama: 'Bank BNI' },
    { kode: 'mandiri', nama: 'Bank Mandiri' },
    { kode: 'bri', nama: 'Bank BRI' },
    { kode: 'bsi', nama: 'Bank Syariah Indonesia' },
  ];

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Bank Virtual Account</h1>
            <p class="text-sm text-secondary-500">Kelola metode pembayaran VA untuk pendaftaran</p>
          </div>
          <Button onClick={() => setShowForm(!showForm())}>{showForm() ? 'Batal' : '+ Bank VA'}</Button>
        </div>

        <Show when={showForm()}>
          <form
            onSubmit={handleSubmit}
            class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6 space-y-4"
          >
            <div class="flex flex-wrap gap-2 mb-2">
              <span class="text-xs text-secondary-500 mr-1">Preset:</span>
              <For each={presetBanks}>
                {(p) => (
                  <button
                    type="button"
                    onClick={() => {
                      setKode(p.kode);
                      setNama(p.nama);
                    }}
                    class="text-xs px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded hover:bg-secondary-200"
                  >
                    {p.nama}
                  </button>
                )}
              </For>
            </div>
            <div class="grid md:grid-cols-2 gap-4">
              <div>
                <label class="text-sm font-medium block mb-1">Kode Bank</label>
                <input
                  required
                  value={kode()}
                  onInput={(e) => setKode(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
                  placeholder="bca"
                />
              </div>
              <div>
                <label class="text-sm font-medium block mb-1">Nama Bank</label>
                <input
                  required
                  value={nama()}
                  onInput={(e) => setNama(e.currentTarget.value)}
                  class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
                  placeholder="Bank BCA"
                />
              </div>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isMidtrans()}
                onChange={(e) => setIsMidtrans(e.currentTarget.checked)}
                class="rounded border-secondary-300 text-brand-600"
              />
              Integrasi Midtrans (webhook otomatis)
            </label>
            <Button type="submit" disabled={saving()}>
              {saving() ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </form>
        </Show>

        <div class="space-y-3">
          <For each={banks()?.data || []}>
            {(b: { id: number; nama: string; isActive: boolean; isMidtrans: boolean; kode: string }) => (
              <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold">{b.nama}</span>
                    <span
                      class={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {b.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                    {b.isMidtrans && (
                      <span class="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">Midtrans</span>
                    )}
                  </div>
                  <div class="text-xs text-secondary-400 mt-0.5">Kode: {b.kode}</div>
                </div>
                <div class="flex gap-2">
                  <button
                    onClick={() => handleToggle(b.id, b.isActive)}
                    class={`text-xs px-3 py-1 rounded border ${b.isActive ? 'border-amber-300 text-amber-600' : 'border-green-300 text-green-600'}`}
                  >
                    {b.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    class="text-xs px-3 py-1 rounded border border-red-300 text-red-600"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </MainLayout>
  );
}
