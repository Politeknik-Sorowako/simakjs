import { useParams } from '@solidjs/router';
import { createResource, createSignal, Show, Switch } from 'solid-js';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { rombelPraktikumController } from '../controllers/rombelPraktikumController';

export default function RombelEnroll() {
  const params = useParams<{ token: string }>();
  const auth = useAuth();
  const toast = useToast();
  const [enrolling, setEnrolling] = createSignal(false);
  const [enrolled, setEnrolled] = createSignal(false);
  const [error, setError] = createSignal('');

  const token = () => params.token;

  const [info] = createResource(token, async (tok) => {
    if (!tok) return null;
    try {
      return await rombelPraktikumController.getPublicRombel(tok);
    } catch {
      setError('Token tidak valid atau sudah tidak aktif.');
      return null;
    }
  });

  const handleEnroll = async () => {
    const tok = token();
    if (!tok) return;
    setEnrolling(true);
    setError('');
    try {
      await rombelPraktikumController.enrollByToken(tok);
      setEnrolled(true);
      toast.showToast('Pendaftaran berhasil!', 'success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mendaftar. Mungkin sudah terdaftar atau kelas penuh.');
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div class="min-h-screen flex items-center justify-center p-4 bg-secondary-50 dark:bg-secondary-950">
      <div class="w-full max-w-lg bg-white dark:bg-secondary-900 rounded-2xl shadow-xl border border-secondary-200/80 dark:border-secondary-800 p-8">
        <Switch
          fallback={<div class="text-secondary-500 dark:text-secondary-300 text-center py-10">Memuat informasi...</div>}
        >
          <Show when={info.error || (info() === null && !info.loading)}>
            <div class="text-center py-10">
              <p class="text-danger-600 dark:text-danger-400 font-semibold mb-4">
                Link pendaftaran tidak valid atau telah dinonaktifkan.
              </p>
              <a href="/login" class="text-primary-600 underline text-sm">
                Kembali ke aplikasi
              </a>
            </div>
          </Show>
          <Show when={info()}>
            {(i) => (
              <div class="space-y-6">
                <div class="text-center">
                  <Badge variant={i().enrollmentEnabled ? 'success' : 'warning'}>
                    {i().enrollmentEnabled ? 'Pendaftaran Terbuka' : 'Pendaftaran Ditutup'}
                  </Badge>
                  <h1 class="mt-3 text-2xl font-heading font-bold text-secondary-900 dark:text-white">
                    {i().namaGroup}
                  </h1>
                  <p class="mt-1 text-sm text-secondary-500 dark:text-secondary-300">
                    {i().mataKuliah?.kode && i().mataKuliah?.nama
                      ? `${i().mataKuliah?.kode} — ${i().mataKuliah?.nama}`
                      : 'Rombel Praktikum'}
                  </p>
                </div>

                <div class="bg-secondary-50 dark:bg-secondary-800 rounded-xl p-4 text-sm space-y-2">
                  <p class="text-secondary-700 dark:text-secondary-200">
                    Instruktur: <span class="font-semibold">{i().instruktur?.nama || 'Belum ditentukan'}</span>
                  </p>
                  <p class="text-secondary-700 dark:text-secondary-200">
                    Terdaftar:{' '}
                    <span class="font-semibold">
                      {i().enrolledCount}
                      {i().enrollmentMaxStudents ? ` / ${i().enrollmentMaxStudents}` : ''}
                    </span>
                  </p>
                  <Show when={i().keterangan}>
                    <p class="text-secondary-600 dark:text-secondary-300">{i().keterangan}</p>
                  </Show>
                  <Show when={i().enrollmentExpiresAt}>
                    <p class="text-secondary-500 dark:text-secondary-400">
                      Berakhir: {new Date(i().enrollmentExpiresAt!).toLocaleString()}
                    </p>
                  </Show>
                </div>

                <Switch>
                  <Show when={enrolled()}>
                    <div class="text-center text-success-600 dark:text-success-400 font-semibold py-4">
                      Berhasil! Anda telah terdaftar pada rombel ini.
                    </div>
                  </Show>
                  <Show when={!auth.user()}>
                    <div class="text-center">
                      <p class="text-sm text-secondary-500 dark:text-secondary-300 mb-4">
                        Silakan masuk sebagai mahasiswa terlebih dahulu untuk mendaftar.
                      </p>
                      <a href="/login">
                        <Button>Masuk / Login</Button>
                      </a>
                    </div>
                  </Show>
                  <Show when={auth.user()?.role !== 'mahasiswa'}>
                    <div class="text-center">
                      <p class="text-sm text-warning-600 dark:text-warning-400 font-semibold">
                        Hanya akun mahasiswa yang dapat mendaftar mandiri.
                      </p>
                    </div>
                  </Show>
                  <Show when={auth.user()?.role === 'mahasiswa'}>
                    <div class="space-y-3">
                      <Show when={error() !== ''}>
                        <p class="text-sm text-danger-600 dark:text-danger-400 text-center">{error()}</p>
                      </Show>
                      <Button
                        onClick={handleEnroll}
                        loading={enrolling()}
                        disabled={!i().enrollmentEnabled}
                        class="w-full"
                        variant="primary"
                      >
                        {enrolling() ? 'Mendaftar...' : 'Daftar / Join Rombel'}
                      </Button>
                    </div>
                  </Show>
                </Switch>
              </div>
            )}
          </Show>
        </Switch>
      </div>
    </div>
  );
}
