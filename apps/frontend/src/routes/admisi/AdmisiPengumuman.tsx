import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiPengumuman() {
  const toast = useToast();
  const [showForm, setShowForm] = createSignal(false);
  const [editingId, setEditingId] = createSignal<number | null>(null);
  const [judul, setJudul] = createSignal('');
  const [isi, setIsi] = createSignal('');
  const [isPinned, setIsPinned] = createSignal(false);
  const [file, setFile] = createSignal<File | null>(null);
  const [saving, setSaving] = createSignal(false);

  const [list, { refetch }] = createResource(() => admisiAdminController.getAnnouncements());

  const resetForm = () => {
    setEditingId(null);
    setJudul('');
    setIsi('');
    setIsPinned(false);
    setFile(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!judul() || !isi()) return;
    setSaving(true);
    try {
      if (editingId() !== null) {
        await admisiAdminController.updateAnnouncement(editingId()!, {
          judul: judul(), isi: isi(), isPinned: isPinned(),
        });
        toast.showToast('Pengumuman diperbarui!', 'success');
      } else {
        const fd = new FormData();
        fd.append('judul', judul());
        fd.append('isi', isi());
        fd.append('isPinned', String(isPinned()));
        if (file()) fd.append('file', file()!);
        await admisiAdminController.createAnnouncementForm(fd);
        toast.showToast('Pengumuman berhasil dipublikasikan!', 'success');
      }
      resetForm();
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setJudul(a.judul);
    setIsi(a.isi);
    setIsPinned(a.isPinned);
    setFile(null);
    setShowForm(true);
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

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-4xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Pengumuman PMB</h1>
            <p class="text-sm text-secondary-500">Kelola pengumuman yang tampil di dashboard calon mahasiswa</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(!showForm()); }}>
            {showForm() ? 'Batal' : '+ Pengumuman Baru'}
          </Button>
        </div>

        <Show when={showForm()}>
          <form onSubmit={handleSubmit} class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6 space-y-4">
            <div class="text-xs font-semibold text-brand-600 mb-1">
              {editingId() !== null ? '✏️ Edit Pengumuman' : '📝 Pengumuman Baru'}
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Judul</label>
              <input required value={judul()} onInput={(e) => setJudul(e.currentTarget.value)}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm" />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Isi Pengumuman</label>
              <textarea required value={isi()} onInput={(e) => setIsi(e.currentTarget.value)} rows={4}
                class="w-full px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg bg-white dark:bg-secondary-800 text-sm" />
            </div>
            <Show when={editingId() === null}>
              <div>
                <label class="text-sm font-medium block mb-1">Lampiran (opsional)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setFile(e.currentTarget.files?.[0] || null)}
                  class="w-full text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900/30 dark:file:text-brand-300" />
              </div>
            </Show>
            <label class="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPinned()} onChange={(e) => setIsPinned(e.currentTarget.checked)}
                class="rounded border-secondary-300 text-brand-600" />
              Sematkan di atas (pinned)
            </label>
            <div class="flex gap-2">
              <Button type="submit" disabled={saving()}>
                {saving() ? 'Menyimpan...' : editingId() !== null ? 'Simpan Perubahan' : 'Publikasikan'}
              </Button>
              <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>
            </div>
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
                    <Show when={a.fileName}>
                      <a href={`${apiUrl}/admisi/announcements/${a.id}/file`} target="_blank" rel="noopener noreferrer"
                        class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 underline mt-1">📎 {a.fileName}</a>
                    </Show>
                    <p class="text-xs text-secondary-400 mt-1">{new Date(a.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div class="flex gap-2 ml-4 flex-shrink-0">
                    <button onClick={() => handleEdit(a)} class="text-xs text-brand-600 hover:text-brand-700">Edit</button>
                    <button onClick={() => handleDelete(a.id)} class="text-xs text-red-500 hover:text-red-700">Hapus</button>
                  </div>
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
