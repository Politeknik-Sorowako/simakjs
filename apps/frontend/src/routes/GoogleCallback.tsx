import { useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TurnstileWidget } from '../components/ui/TurnstileWidget';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';
import { AccountInactiveError } from '../utils/eden';

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const [loading, setLoading] = createSignal(true);
  const [stage, setStage] = createSignal('Memverifikasi tiket otentikasi Google...');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [inactiveEmail, setInactiveEmail] = createSignal('');
  const [resending, setResending] = createSignal(false);
  const [turnstileToken, setTurnstileToken] = createSignal('');
  const [turnstileReset, setTurnstileReset] = createSignal(0);

  createEffect(() => {
    const code = searchParams.code;
    const error = searchParams.error;

    if (error) {
      setErrorMsg('Akses ditolak atau otorisasi Google dibatalkan.');
      setLoading(false);
      return;
    }

    if (!code) {
      setErrorMsg('Kode otorisasi Google tidak ditemukan.');
      setLoading(false);
      return;
    }

    setStage('Memverifikasi akun Google Workspace Politeknik Sorowako...');

    authController
      .googleCallback(code)
      .then((res) => {
        setStage('Menyiapkan sesi otentikasi SIMAK Vokasi...');
        if (res.requires2FA && res.twoFactorToken) {
          sessionStorage.setItem('2fa_token', res.twoFactorToken);
          toast.showToast('Login Google berhasil. Silakan masukkan kode 2FA.', 'info');
          navigate('/login?step=2fa', { replace: true });
        } else if (res.token && res.user) {
          auth.login(res.user);
          toast.showToast('Login Google SSO berhasil!', 'success');
          if (res.user.role === 'calon_mahasiswa') {
            navigate('/admisi/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else {
          setErrorMsg('Respon login dari server tidak valid.');
        }
      })
      .catch((err: unknown) => {
        const msg = (err as Error).message || 'Gagal memproses login Google SSO.';
        setErrorMsg(msg);
        setInactiveEmail('');
        if (err instanceof AccountInactiveError) {
          setInactiveEmail(err.email);
        }
        toast.showToast(msg, 'error');
      })
      .finally(() => {
        setLoading(false);
      });
  });

  const handleResendActivation = async (e: Event) => {
    e.preventDefault();
    const email = inactiveEmail();
    if (!email) {
      toast.showToast('Alamat email akun tidak tersedia.', 'error');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken()) {
      toast.showToast('Selesaikan verifikasi keamanan terlebih dahulu.', 'error');
      return;
    }
    setResending(true);
    try {
      const res = await authController.resendActivation(email, turnstileToken());
      toast.showToast(res.message, 'success');
      setErrorMsg('Tautan aktivasi baru telah dikirimkan ke email Anda.');
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengirim email aktivasi.', 'error');
    } finally {
      setResending(false);
      setTurnstileToken('');
      setTurnstileReset((c) => c + 1);
    }
  };

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
        <Show when={loading()}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Memproses Login Google SSO...</h2>
            <p class="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-3 py-1.5 rounded-lg">
              {stage()}
            </p>
            <p class="text-xs text-slate-400 dark:text-slate-500">
              Mohon tunggu sebentar, sistem sedang melakukan enkripsi & otentikasi aman.
            </p>
          </div>
        </Show>

        <Show when={!loading() && errorMsg()}>
          <div class="flex flex-col items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-xl">
              !
            </div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Login SSO Gagal</h2>
            <p class="text-sm text-red-600 dark:text-red-400">{errorMsg()}</p>

            <Show when={inactiveEmail()}>
              <div class="w-full mt-2 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
                <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Akun Anda belum aktif. Kirim ulang link aktivasi ke:
                </p>
                <form onSubmit={handleResendActivation} class="flex flex-col gap-3">
                  <Input
                    type="email"
                    placeholder="Alamat email Anda"
                    value={inactiveEmail()}
                    onInput={(e) => setInactiveEmail(e.currentTarget.value)}
                    required
                  />
                  <Show when={TURNSTILE_SITE_KEY}>
                    <TurnstileWidget
                      siteKey={TURNSTILE_SITE_KEY}
                      theme="auto"
                      onVerify={setTurnstileToken}
                      onExpire={() => setTurnstileToken('')}
                      onError={() => setTurnstileToken('')}
                      resetCounter={turnstileReset()}
                    />
                  </Show>
                  <Button type="submit" loading={resending()} class="w-full">
                    Kirim Ulang Email Aktivasi
                  </Button>
                </form>
                <p class="text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Setelah mengaktifkan akun melalui email, silakan coba login Google SSO kembali.
                </p>
              </div>
            </Show>

            <button
              onClick={() => navigate('/login', { replace: true })}
              class="mt-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
