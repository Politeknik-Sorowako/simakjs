import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiJadwal() {
  const toast = useToast();
  const [sessionFilter, setSessionFilter] = createSignal('');
  const [showForm, setShowForm] = createSignal(false);
  const [saving, setSaving] = createSignal(false);

  const [schedules, { refetch }] = createResource(
    () => (sessionFilter() ? Number(sessionFilter()) : undefined),
    (sid) => admisiAdminController.getExamSchedules(sid),
  );

  const [form, setForm] = createSignal<Record<string, string>>({});

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    if (!sessionFilter()) {
      toast.showToast('Pilih sesi terlebih dahulu', 'error');
      return;
    }
    setSaving(true);
    try {
      await admisiAdminController.createExamSchedule({
        applicationId: Number(form().applicationId),
        sessionId: Number(sessionFilter()),
        tipeUjian: form().tipeUjian,
        tanggal: form().tanggal,
        waktuMulai: form().waktuMulai,
        waktuSelesai: form().waktuSelesai || undefined,
        lokasiType: form().lokasiType || 'kampus',
        lokasiDetail: form().lokasiDetail || undefined,
        reviewerId: form().reviewerId ? Number(form().reviewerId) : undefined,
      });
      toast.showToast('Jadwal ujian berhasil dibuat', 'success');
      setShowForm(false);
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h1 class="text-2xl font-bold">Jadwal Ujian</h1>
            <p class="text-sm text-secondary-500">Atur jadwal tes, wawancara, dan ujian praktik</p>
          </div>
          <div class="flex gap-3">
            <input
              type="number"
              placeholder="Sesi ID"
              value={sessionFilter()}
              onInput={(e) => setSessionFilter(e.currentTarget.value)}
              class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm w-32 bg-white dark:bg-secondary-800"
            />
            <Button onClick={() => setShowForm(!showForm())}>{showForm() ? 'Batal' : '+ Jadwal Baru'}</Button>
          </div>
        </div>

        <Show when={showForm()}>
          <form
            onSubmit={handleCreate}
            class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6 grid md:grid-cols-3 gap-4"
          >
            <div>
              <label class="text-sm font-medium block mb-1">ID Peserta</label>
              <input
                required
                value={form().applicationId || ''}
                onInput={(e) => setForm((p) => ({ ...p, applicationId: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tipe Ujian</label>
              <select
                required
                value={form().tipeUjian || ''}
                onChange={(e) => setForm((p) => ({ ...p, tipeUjian: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              >
                <option value="">-- Pilih --</option>
                <option value="tulis">Tes Tulis</option>
                <option value="wawancara">Wawancara</option>
                <option value="fisik">Tes Fisik</option>
                <option value="praktek">Ujian Praktik</option>
              </select>
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Tanggal</label>
              <input
                required
                type="date"
                value={form().tanggal || ''}
                onInput={(e) => setForm((p) => ({ ...p, tanggal: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Jam Mulai</label>
              <input
                required
                type="time"
                value={form().waktuMulai || ''}
                onInput={(e) => setForm((p) => ({ ...p, waktuMulai: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Jam Selesai</label>
              <input
                type="time"
                value={form().waktuSelesai || ''}
                onInput={(e) => setForm((p) => ({ ...p, waktuSelesai: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Lokasi</label>
              <select
                value={form().lokasiType || 'kampus'}
                onChange={(e) => setForm((p) => ({ ...p, lokasiType: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              >
                <option value="kampus">Kampus</option>
                <option value="online">Online</option>
                <option value="mitra_industri">Mitra Industri</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-sm font-medium block mb-1">Detail Lokasi / Link</label>
              <input
                value={form().lokasiDetail || ''}
                onInput={(e) => setForm((p) => ({ ...p, lokasiDetail: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
                placeholder="Ruang 201 / Link Zoom / PT. Mitra"
              />
            </div>
            <div>
              <label class="text-sm font-medium block mb-1">Reviewer ID (opsional)</label>
              <input
                type="number"
                value={form().reviewerId || ''}
                onInput={(e) => setForm((p) => ({ ...p, reviewerId: e.currentTarget.value }))}
                class="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm bg-white dark:bg-secondary-800"
              />
            </div>
            <div class="md:col-span-3">
              <Button type="submit" disabled={saving()}>
                {saving() ? 'Menyimpan...' : 'Buat Jadwal'}
              </Button>
            </div>
          </form>
        </Show>

        <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800">
                <th class="text-left py-3 px-4">Peserta ID</th>
                <th class="text-left py-3 px-4">Tipe</th>
                <th class="text-left py-3 px-4">Tanggal</th>
                <th class="text-left py-3 px-4">Jam</th>
                <th class="text-left py-3 px-4">Lokasi</th>
                <th class="text-left py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody>
              <For each={schedules()?.data || []}>
                {(s: any) => (
                  <tr class="border-b border-secondary-100 dark:border-secondary-800">
                    <td class="py-3 px-4">{s.applicationId}</td>
                    <td class="py-3 px-4">
                      <span class="capitalize">{s.tipeUjian}</span>
                    </td>
                    <td class="py-3 px-4">{s.tanggal}</td>
                    <td class="py-3 px-4">
                      {s.waktuMulai}
                      {s.waktuSelesai ? ` - ${s.waktuSelesai}` : ''}
                    </td>
                    <td class="py-3 px-4">
                      <span class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{s.lokasiType}</span>
                      <Show when={s.lokasiDetail}>
                        <div class="text-xs text-secondary-400 mt-0.5">{s.lokasiDetail}</div>
                      </Show>
                    </td>
                    <td class="py-3 px-4">
                      <span
                        class={`text-xs px-2 py-0.5 rounded-full ${s.isCompleted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                      >
                        {s.isCompleted ? 'Selesai' : 'Terjadwal'}
                      </span>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
          <Show when={schedules()?.data?.length === 0}>
            <div class="text-center py-8 text-secondary-400">Belum ada jadwal untuk sesi ini</div>
          </Show>
        </div>
      </div>
    </MainLayout>
  );
}
