import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiPenilaian() {
  const toast = useToast();
  const [sessionFilter, setSessionFilter] = createSignal('');
  const [prodiFilter, setProdiFilter] = createSignal('');
  const [scores, setScores] = createSignal<Record<string, string>>({});
  const [saving, setSaving] = createSignal(false);

  const [components] = createResource(
    () => (sessionFilter() ? Number(sessionFilter()) : undefined),
    (sid) => admisiAdminController.getSelectionComponents(sid),
  );

  const [apps, { refetch }] = createResource(
    () => ({
      sessionId: sessionFilter() ? Number(sessionFilter()) : undefined,
      prodiId: prodiFilter() ? Number(prodiFilter()) : undefined,
      status: 'exam_scheduled',
    }),
    (f) => admisiAdminController.getApplications(f),
  );

  const handleInputScore = async (applicationId: number, componentId: number) => {
    const key = `${applicationId}-${componentId}`;
    const score = scores()[key];
    if (!score || isNaN(Number(score))) return;

    setSaving(true);
    try {
      await admisiAdminController.inputScore({
        applicationId,
        componentId,
        score: Number(score),
      });
      toast.showToast('Nilai disimpan', 'success');
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Penilaian Peserta</h1>
        <p class="text-sm text-secondary-500 mb-6">Input nilai untuk setiap komponen penilaian</p>

        <div class="flex gap-3 mb-6">
          <input
            type="number"
            placeholder="Sesi ID"
            value={sessionFilter()}
            onInput={(e) => setSessionFilter(e.currentTarget.value)}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm w-40 bg-white dark:bg-secondary-800"
          />
          <input
            type="number"
            placeholder="Prodi ID (opsional)"
            value={prodiFilter()}
            onInput={(e) => setProdiFilter(e.currentTarget.value)}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm w-40 bg-white dark:bg-secondary-800"
          />
        </div>

        <Show when={components()?.data}>
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4 mb-6">
            <h2 class="font-semibold text-sm mb-2">Komponen Penilaian</h2>
            <div class="flex gap-3 flex-wrap">
              <For each={components()?.data || []}>
                {(c: { namaKomponen: string; bobot: number }) => (
                  <span class="text-xs px-2 py-1 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full">
                    {c.namaKomponen} ({c.bobot}%)
                  </span>
                )}
              </For>
            </div>
          </div>
        </Show>

        <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl overflow-hidden">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800">
                <th class="text-left py-3 px-4">No Pendaftar</th>
                <th class="text-left py-3 px-4">Nama</th>
                <For each={components()?.data || []}>
                  {(c: { namaKomponen: string; id: number }) => <th class="text-left py-3 px-4">{c.namaKomponen}</th>}
                </For>
                <th class="text-left py-3 px-4">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <For each={apps()?.data || []}>
                {(app: { id: number; noPendaftar: string; namaLengkap: string }) => (
                  <tr class="border-b border-secondary-100 dark:border-secondary-800">
                    <td class="py-3 px-4 font-mono text-xs">{app.noPendaftar}</td>
                    <td class="py-3 px-4">{app.namaLengkap || '-'}</td>
                    <For each={components()?.data || []}>
                      {(c: { id: number }) => {
                        const key = `${app.id}-${c.id}`;
                        return (
                          <td class="py-3 px-4">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={scores()[key] || ''}
                              onInput={(e) => setScores((prev) => ({ ...prev, [key]: e.currentTarget.value }))}
                              class="w-20 px-2 py-1 border border-secondary-300 dark:border-secondary-600 rounded text-sm bg-white dark:bg-secondary-800"
                              placeholder="0-100"
                            />
                          </td>
                        );
                      }}
                    </For>
                    <td class="py-3 px-4">
                      <Button
                        size="sm"
                        onClick={() => {
                          components()?.data?.forEach((c: { id: number }) => handleInputScore(app.id, c.id));
                        }}
                        disabled={saving()}
                      >
                        Simpan
                      </Button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>

          <Show when={apps()?.data?.length === 0}>
            <div class="text-center py-8 text-secondary-400">Tidak ada peserta untuk dinilai</div>
          </Show>
        </div>
      </div>
    </MainLayout>
  );
}
