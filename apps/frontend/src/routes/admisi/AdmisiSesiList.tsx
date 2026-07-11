import { createResource, createSignal, For, Show } from 'solid-js';
import { A } from '@solidjs/router';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiSesiList() {
  const toast = useToast();
  const [sessions, { refetch }] = createResource(() => admisiAdminController.getSessions());
  const [showForm, setShowForm] = createSignal(false);
  const [form, setForm] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);
  const [deleting, setDeleting] = createSignal<number | null>(null);

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    setSaving(true);
    try {
      await admisiAdminController.createSession({
        kode: form().kode,
        nama: form().nama,
        deskripsi: form().deskripsi || undefined,
        tanggalMulai: form().tanggalMulai,
        tanggalTutup: form().tanggalTutup,
        tanggalVerif: form().tanggalVerif || undefined,
        tanggalUjian: form().tanggalUjian || undefined,
        tanggalPengumuman: form().tanggalPengumuman || undefined,
        kuota: form().kuota ? Number(form().kuota) : undefined,
      });
      toast.showToast('Sesi berhasil dibuat!', 'success');
      setShowForm(false);
      refetch();
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: number, current: boolean) => {
    try {
      await admisiAdminController.updateSession(id, { isActive: !current });
      refetch();
      toast.showToast('Status sesi diubah', 'success');
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Manajemen Sesi Admisi</h1>
            <p class="text-sm text-secondary-500">Kelola gelombang dan jalur pendaftaran</p>
          </div>
          <Button onClick={() => setShowForm(!showForm())}>
            {showForm() ? 'Batal' : '+ Sesi Baru'}
          </Button>
        </div>

        <Show when={showForm()}>
          <form onSubmit={handleCreate} class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6 grid md:grid-cols-3 gap-4">
            <div>
              <label class="text-sm font-medium block mb-1">Kode</label>
              <input
                required value={form().kode || ''}
                onInput={(e) => setForm((p) => ({ ...p, kode: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
                placeholder="GEL-1"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Nama</label>
              <input
                required value={form().nama || ''}
                onInput={(e) => setForm((p) => ({ ...p, nama: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
                placeholder="Gelombang 1"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Deskripsi</label>
              <input
                value={form().deskripsi || ''}
                onInput={(e) => setForm((p) => ({ ...p, deskripsi: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tgl Mulai</label>
              <input
                required type="date"
                value={form().tanggalMulai || ''}
                onInput={(e) => setForm((p) => ({ ...p, tanggalMulai: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tgl Tutup</label>
              <input
                required type="date"
                value={form().tanggalTutup || ''}
                onInput={(e) => setForm((p) => ({ ...p, tanggalTutup: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Kuota</label>
              <input
                type="number"
                value={form().kuota || ''}
                onInput={(e) => setForm((p) => ({ ...p, kuota: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tgl Verif (opsional)</label>
              <input
                type="date"
                value={form().tanggalVerif || ''}
                onInput={(e) => setForm((p) => ({ ...p, tanggalVerif: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tgl Ujian (opsional)</label>
              <input
                type="date"
                value={form().tanggalUjian || ''}
                onInput={(e) => setForm((p) => ({ ...p, tanggalUjian: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tgl Pengumuman (opsional)</label>
              <input
                type="date"
                value={form().tanggalPengumuman || ''}
                onInput={(e) => setForm((p) => ({ ...p, tanggalPengumuman: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
              />
            </div>
            <div class="md:col-span-3">
              <Button type="submit" disabled={saving()}>{saving() ? 'Menyimpan...' : 'Buat Sesi'}</Button>
            </div>
          </form>
        </Show>

        <Show when={sessions.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <div class="grid gap-4">
          <For each={sessions()?.data || []}>
            {(session: any) => (
              <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-semibold">{session.nama}</span>
                    <span class={`text-xs px-2 py-0.5 rounded-full ${session.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {session.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div class="text-xs text-secondary-400 mt-0.5">
                    {new Date(session.tanggalMulai).toLocaleDateString('id-ID')} - {new Date(session.tanggalTutup).toLocaleDateString('id-ID')}
                  </div>
                </div>
                <div class="flex gap-2">
                  <button
                    onClick={() => handleToggleActive(session.id, session.isActive)}
                    class={`text-xs px-3 py-1 rounded-lg border ${session.isActive ? 'border-amber-300 text-amber-600 hover:bg-amber-50' : 'border-green-300 text-green-600 hover:bg-green-50'}`}
                  >
                    {session.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <A
                    href={`/admisi/manajemen/sesi/${session.id}`}
                    class="text-xs px-3 py-1 rounded-lg border border-brand-300 text-brand-600 hover:bg-brand-50"
                  >
                    Detail
                  </A>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </MainLayout>
  );
}
