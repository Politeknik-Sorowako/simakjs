import { createResource, createSignal, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiPendaftaranBaru() {
  const navigate = useNavigate();
  const toast = useToast();

  const [sessions] = createResource(() => admisiController.getActiveSessions());
  const [selectedSession, setSelectedSession] = createSignal<number | null>(null);
  const [sessionProdis, setSessionProdis] = createSignal<any[]>([]);
  const [prodi1, setProdi1] = createSignal<string>('');
  const [prodi2, setProdi2] = createSignal<string>('');
  const [loading, setLoading] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);

  const handleSessionSelect = async (sessionId: number) => {
    setSelectedSession(sessionId);
    setProdi1('');
    setProdi2('');
    setSessionProdis([]);
    setLoading(true);
    try {
      const res = await admisiController.getSessionProdis(sessionId);
      setSessionProdis(res.data);
    } catch {
      toast.showToast('Gagal memuat program studi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSession() || !prodi1()) {
      toast.showToast('Pilih sesi dan program studi pilihan 1', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await admisiController.createApplication({
        sessionId: selectedSession()!,
        prodiPilihan1: Number(prodi1()),
        prodiPilihan2: prodi2() ? Number(prodi2()) : undefined,
      });
      toast.showToast('Pendaftaran berhasil dibuat!', 'success');
      navigate(`/admisi/pendaftaran/${result.applicationId}`);
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal membuat pendaftaran', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-3xl mx-auto">
        <h1 class="text-2xl font-bold mb-6">Pendaftaran Baru</h1>

        {/* Step 1: Pilih Sesi */}
        <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-4">
          <h2 class="font-semibold mb-3">1. Pilih Sesi Admisi</h2>
          <Show when={sessions.loading}>
            <p class="text-sm text-secondary-400">Memuat sesi...</p>
          </Show>
          <Show when={sessions() && sessions()!.data.length === 0}>
            <p class="text-sm text-amber-600">Tidak ada sesi admisi yang sedang dibuka.</p>
          </Show>
          <div class="grid gap-3">
            <For each={sessions()?.data || []}>
              {(session: any) => (
                <button
                  onClick={() => handleSessionSelect(session.id)}
                  class={`text-left p-4 rounded-lg border-2 transition-colors ${
                    selectedSession() === session.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-secondary-200 dark:border-secondary-700 hover:border-brand-300'
                  }`}
                >
                  <div class="font-semibold">{session.nama}</div>
                  <div class="text-xs text-secondary-500 mt-1">
                    {new Date(session.tanggalMulai).toLocaleDateString('id-ID')} - {new Date(session.tanggalTutup).toLocaleDateString('id-ID')}
                  </div>
                  <Show when={session.deskripsi}>
                    <div class="text-xs text-secondary-400 mt-1">{session.deskripsi}</div>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Step 2: Pilih Prodi — hanya tampil jika sesi dipilih */}
        {selectedSession() && (
          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-4">
            <h2 class="font-semibold mb-3">2. Pilih Program Studi</h2>

            {loading() && <p class="text-sm text-secondary-400">Memuat program studi...</p>}

            {!loading() && sessionProdis().length === 0 && selectedSession() && (
              <p class="text-sm text-amber-600">Tidak ada program studi tersedia di sesi ini.</p>
            )}

            {!loading() && sessionProdis().length > 0 && (
              <>
                <div class="mb-4">
                  <label class="text-sm font-medium text-secondary-700 dark:text-secondary-300 block mb-1">
                    Pilihan 1 <span class="text-red-500">*</span>
                  </label>
                  <select
                    value={prodi1()}
                    onChange={(e) => setProdi1(e.currentTarget.value)}
                    class="w-full px-3 py-2.5 border-2 border-secondary-300 dark:border-secondary-500 rounded-lg bg-white dark:bg-secondary-800 text-sm relative z-10"
                    style={{ 'pointer-events': 'auto', opacity: '1' }}
                  >
                    <option value="">-- Pilih Prodi --</option>
                    {sessionProdis().map((sp: any) => (
                      <option value={String(sp.prodiId)}>
                        {sp.namaProdi} ({sp.jenjang})
                      </option>
                    ))}
                  </select>
                </div>

                <div class="mb-4">
                  <label class="text-sm font-medium text-secondary-700 dark:text-secondary-300 block mb-1">
                    Pilihan 2 (opsional)
                  </label>
                  <select
                    value={prodi2()}
                    onChange={(e) => setProdi2(e.currentTarget.value)}
                    class="w-full px-3 py-2.5 border-2 border-secondary-300 dark:border-secondary-500 rounded-lg bg-white dark:bg-secondary-800 text-sm relative z-10"
                    style={{ 'pointer-events': 'auto', opacity: '1' }}
                  >
                    <option value="">-- Tidak Ada --</option>
                    {sessionProdis().map((sp: any) => (
                      <option value={String(sp.prodiId)} disabled={String(sp.prodiId) === prodi1()}>
                        {sp.namaProdi} ({sp.jenjang})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        )}

        {/* Submit */}
        <div class="flex gap-3">
          <Button onClick={() => navigate('/admisi/dashboard')} variant="secondary">
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedSession() || !prodi1() || submitting()}>
            {submitting() ? 'Menyimpan...' : 'Simpan Pendaftaran'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
