import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiSeleksiMassal() {
  const toast = useToast();
  const [sessionId, setSessionId] = createSignal('');
  const [results, setResults] = createSignal<{
    passed: { noPendaftar: string; namaLengkap: string; finalScore: number }[];
    failed: { noPendaftar: string; namaLengkap: string; finalScore: number }[];
  } | null>(null);
  const [processing, setProcessing] = createSignal(false);

  const [sessions] = createResource(() => admisiAdminController.getSessions());

  const handlePreview = async () => {
    if (!sessionId()) return;
    try {
      const res = await admisiAdminController.getPassedCandidates(Number(sessionId()));
      setResults(res);
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    }
  };

  const handleAnnounce = async () => {
    if (!sessionId()) return;
    setProcessing(true);
    try {
      const res = await admisiAdminController.announceResults(Number(sessionId()));
      toast.showToast(res.message, 'success');
      setResults(null);
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Seleksi Massal</h1>
        <p class="text-sm text-secondary-500 mb-6">
          Proses kelulusan peserta berdasarkan nilai akhir dan passing grade
        </p>

        <div class="flex gap-3 mb-6">
          <select
            value={sessionId()}
            onChange={(e) => {
              setSessionId(e.currentTarget.value);
              setResults(null);
            }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
          >
            <option value="">-- Pilih Sesi --</option>
            <For each={sessions()?.data || []}>
              {(s: { id: number; nama: string }) => <option value={s.id}>{s.nama}</option>}
            </For>
          </select>
          <Button onClick={handlePreview} disabled={!sessionId()}>
            Preview Hasil
          </Button>
        </div>

        <Show when={results}>
          <div class="grid md:grid-cols-2 gap-6 mb-6">
            {/* Lulus */}
            <div class="bg-white dark:bg-secondary-800/40 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <h2 class="font-semibold text-sm text-green-700 dark:text-green-400 mb-2">
                ✅ Lulus ({results()!.passed.length})
              </h2>
              <div class="space-y-1 max-h-80 overflow-y-auto">
                <For each={results()!.passed}>
                  {(p: { noPendaftar: string; namaLengkap: string; finalScore: number }) => (
                    <div class="flex items-center justify-between py-1 text-sm border-b border-green-100 dark:border-green-900/30">
                      <span class="font-mono text-xs text-secondary-400">{p.noPendaftar}</span>
                      <span>{p.namaLengkap}</span>
                      <span class="text-xs font-semibold text-green-600">{p.finalScore}</span>
                    </div>
                  )}
                </For>
              </div>
              <Show when={results()!.passed.length === 0}>
                <p class="text-xs text-secondary-400 py-2">Tidak ada peserta yang lulus.</p>
              </Show>
            </div>

            {/* Tidak Lulus */}
            <div class="bg-white dark:bg-secondary-800/40 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <h2 class="font-semibold text-sm text-red-700 dark:text-red-400 mb-2">
                ❌ Tidak Lulus ({results()!.failed.length})
              </h2>
              <div class="space-y-1 max-h-80 overflow-y-auto">
                <For each={results()!.failed}>
                  {(f: { noPendaftar: string; namaLengkap: string; finalScore: number }) => (
                    <div class="flex items-center justify-between py-1 text-sm border-b border-red-100 dark:border-red-900/30">
                      <span class="font-mono text-xs text-secondary-400">{f.noPendaftar}</span>
                      <span>{f.namaLengkap}</span>
                      <span class="text-xs font-semibold text-red-600">{f.finalScore || '-'}</span>
                    </div>
                  )}
                </For>
              </div>
              <Show when={results()!.failed.length === 0}>
                <p class="text-xs text-secondary-400 py-2">Tidak ada peserta yang tidak lulus.</p>
              </Show>
            </div>
          </div>

          <div class="flex gap-3">
            <Button onClick={handleAnnounce} disabled={processing()} class="bg-green-600 hover:bg-green-700">
              {processing() ? 'Memproses...' : `Terbitkan Pengumuman (${results()!.passed.length} Lulus)`}
            </Button>
            <Button variant="secondary" onClick={() => setResults(null)}>
              Batal
            </Button>
          </div>
        </Show>

        <Show when={!results && sessionId()}>
          <div class="text-center py-8 text-secondary-400">
            Klik <strong>Preview Hasil</strong> untuk melihat kandidat lulus/tidak lulus berdasarkan nilai akhir dan
            passing grade.
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
