import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiPengumuman() {
  const toast = useToast();
  const [showForm, setShowForm] = createSignal(false);
  const [judul, setJudul] = createSignal('');
  const [isi, setIsi] = createSignal('');
  const [isPinned, setIsPinned] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const [list, { refetch }] = createResource(() => admisiAdminController.getAnnouncements());

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!judul() || !isi()) return;
    setSaving(true);
    try {
      await admisiAdminController.createAnnouncement({
        judul: judul(),
        isi: isi(),
        isPinned: isPinned(),
      });
      toast.showToast('Pengumuman berhasil dipublikasikan!', 'success');
      setShowForm(false);
      setJudul('');
      setIsi('');
      setIsPinned(false);
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Hapus pengumuman ini?')) return;
    try {
      await admisiAdminController.deleteAnnouncement(id);
      toast.showToast('Pengumuman dihapus', 'success');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Pengumuman PMB</h1>
            <p class="text-sm text-secondary-500">Kelola pengumuman yang tampil di dashboard calon mahasiswa</p>
          </div>
          <Button onClick={() => setShowForm(!showForm())}>
            {showForm() ? 'Batal' : '+ Pengumuman Baru'}
          </Button>
        </div>

        <Show when={showForm()}>
          <form onSubmit={handleSubmit} class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6 space-y-4">
            <div>
              <label class="text-sm font-medium block mb-1">Judul</label>
              <input
                required value={judul()} onInput={(e) => setJudul(e.currentTarget.value)}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
                placeholder="Contoh: Jadwal Ujian Gelombang 1"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Isi Pengumuman</label>
              <textarea
                required value={isi()} onInput={(e) => setIsi(e.currentTarget.value)}
                rows={4}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm"
                placeholder="Tulis pengumuman di sini..."
              />
            </div>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPinned()} onChange={(e) => setIsPinned(e.currentTarget.checked)}
                class="rounded border-secondary-300 text-brand-600" />
              Sematkan di atas (pinned)
            </label>
            <Button type="submit" disabled={saving()}>
              {saving() ? 'Menyimpan...' : 'Publikasikan'}
            </Button>
          </form>
        </Show>

        <div class="space-y-3">
          <For each={list()?.data || []}>
            {(a: any) => (
              <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      {a.isPinned ? <span class="text-xs px-1.5 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded font-semibold">PINNED</span> : null}
                      <span class="font-semibold">{a.judul}</span>
                    </div>
                    <p class="text-sm text-secondary-600 dark:text-secondary-300 mt-1 whitespace-pre-wrap">{a.isi}</p>
                    <p class="text-xs text-secondary-400 mt-1">{new Date(a.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <button onClick={() => handleDelete(a.id)} class="text-xs text-red-500 hover:text-red-700 ml-4 flex-shrink-0">Hapus</button>
                </div>
              </div>
            )}
          </For>
          <Show when={!list.loading && (!list()?.data || list()!.data.length === 0)}>
            <div class="text-center py-8 text-secondary-400">Belum ada pengumuman.</div>
          </Show>
        </div>
      </div>
    </MainLayout>
  );
}
