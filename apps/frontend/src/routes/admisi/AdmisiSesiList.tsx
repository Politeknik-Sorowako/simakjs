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

        <Show when={sessions.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show when={sessions()}>
          {(() => {
            const today = new Date();
            const all = sessions()!.data || [];

            const aktif = all.filter((s: any) => s.isActive && today >= new Date(s.tanggalMulai) && today <= new Date(s.tanggalTutup));
            const akanDatang = all.filter((s: any) => s.isActive && today < new Date(s.tanggalMulai));
            const ditutup = all.filter((s: any) => s.isActive && today > new Date(s.tanggalTutup));
            const nonaktif = all.filter((s: any) => !s.isActive);

            const sections: { label: string; icon: string; color: string; items: any[] }[] = [];
            if (aktif.length) sections.push({ label: 'Sedang Berlangsung', icon: '🟢', color: 'border-l-green-500', items: aktif });
            if (akanDatang.length) sections.push({ label: 'Akan Datang', icon: '🟡', color: 'border-l-amber-400', items: akanDatang });
            if (nonaktif.length) sections.push({ label: 'Nonaktif', icon: '⚪', color: 'border-l-gray-400', items: nonaktif });
            if (ditutup.length) sections.push({ label: 'Sudah Ditutup', icon: '🔴', color: 'border-l-red-400', items: ditutup });

            return (
              <div class="space-y-6">
                <For each={sections}>
                  {(sec) => (
                    <div>
                      <h3 class="text-sm font-semibold text-secondary-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        {sec.icon} {sec.label} ({sec.items.length})
                      </h3>
                      <div class="grid gap-3">
                        <For each={sec.items}>
                          {(session: any) => {
                            const mulai = new Date(session.tanggalMulai);
                            const tutup = new Date(session.tanggalTutup);
                            const visibleToPublic = session.isActive && today >= mulai && today <= tutup;
                            return (
                              <div class={`bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 border-l-4 ${sec.color}`}>
                                <div class="flex items-center justify-between">
                                  <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                      <span class="font-semibold">{session.nama}</span>
                                      <span class={`text-xs px-2 py-0.5 rounded-full ${visibleToPublic ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-400'}`}>
                                        {visibleToPublic ? 'Terlihat' : 'Tersembunyi'}
                                      </span>
                                    </div>
                                    <div class="text-xs text-secondary-400 mt-0.5">
                                      {mulai.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} — {tutup.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                    <Show when={session.kuota}>
                                      <div class="text-xs text-secondary-400 mt-0.5">Kuota: {session.kuota} peserta</div>
                                    </Show>
                                  </div>
                                  <div class="flex gap-2 flex-shrink-0 ml-4">
                                    <Show when={sec.label !== 'Nonaktif'}>
                                      <button onClick={() => handleToggleActive(session.id, true)}
                                        class="text-xs px-2 py-1 rounded border border-amber-300 text-amber-600 hover:bg-amber-50">Nonaktifkan</button>
                                    </Show>
                                    <Show when={sec.label === 'Nonaktif'}>
                                      <button onClick={() => handleToggleActive(session.id, false)}
                                        class="text-xs px-2 py-1 rounded border border-green-300 text-green-600 hover:bg-green-50">Aktifkan</button>
                                    </Show>
                                    <A href={`/admisi/manajemen/sesi/${session.id}`}
                                      class="text-xs px-2 py-1 rounded border border-brand-300 text-brand-600 hover:bg-brand-50">Detail</A>
                                  </div>
                                </div>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  )}
                </For>
              </div>
            );
          })()}
        </Show>
      </div>
    </MainLayout>
  );
}
