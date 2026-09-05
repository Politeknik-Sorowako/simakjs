import { useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';

export default function AktivasiAkun() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = createSignal(true);
  const [success, setSuccess] = createSignal(false);
  const [message, setMessage] = createSignal('');
  const [emailResend, setEmailResend] = createSignal('');
  const [resending, setResending] = createSignal(false);

  createEffect(() => {
    const token = searchParams.token;
    if (!token) {
      setLoading(false);
      setMessage('Token aktivasi tidak ditemukan di URL.');
      return;
    }

    authController
      .activateAccount(token)
      .then((res) => {
        setSuccess(true);
        setMessage(res.message || 'Akun Anda berhasil diaktifkan!');
        toast.showToast('Akun berhasil diaktifkan.', 'success');
      })
      .catch((err: unknown) => {
        setSuccess(false);
        setMessage((err as Error).message || 'Gagal mengaktifkan akun.');
      })
      .finally(() => {
        setLoading(false);
      });
  });

  const handleResend = async (e: Event) => {
    e.preventDefault();
    if (!emailResend() || !emailResend().includes('@')) {
      toast.showToast('Masukkan alamat email yang valid', 'error');
      return;
    }

    setResending(true);
    try {
      const res = await authController.resendActivation(emailResend());
      toast.showToast(res.message, 'success');
      setMessage('Tautan aktivasi baru telah dikirim. Silakan periksa kotak masuk email Anda.');
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengirim ulang aktivasi.', 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div class="flex flex-col items-center mb-6">
          <img src={logoImg} alt="SIMAK Vokasi Logo" class="h-14 w-auto mb-3" />
          <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Aktivasi Akun SIMAK Vokasi</h1>
        </div>

        <Show when={loading()}>
          <div class="flex flex-col items-center gap-4 py-8">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-sm text-slate-600 dark:text-slate-400">Memverifikasi token aktivasi Anda...</p>
          </div>
        </Show>

        <Show when={!loading() && success()}>
          <div class="flex flex-col items-center text-center gap-4 py-4">
            <div class="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-2xl">
              ✓
            </div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivasi Berhasil!</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">{message()}</p>
            <Button onClick={() => navigate('/login', { replace: true })} class="w-full mt-4">
              Masuk ke Akun Saya
            </Button>
          </div>
        </Show>

        <Show when={!loading() && !success()}>
          <div class="flex flex-col text-center gap-4 py-2">
            <div class="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-xl mx-auto">
              !
            </div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivasi Gagal</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">{message()}</p>

            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Kirim Ulang Link Aktivasi?</p>
              <form onSubmit={handleResend} class="flex flex-col gap-3">
                <Input
                  type="email"
                  placeholder="Masukkan alamat email Anda"
                  value={emailResend()}
                  onInput={(e) => setEmailResend(e.currentTarget.value)}
                  required
                />
                <Button type="submit" loading={resending()} class="w-full">
                  Kirim Ulang Email Aktivasi
                </Button>
              </form>
            </div>

            <button
              onClick={() => navigate('/login', { replace: true })}
              class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
