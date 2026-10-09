import { useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TurnstileWidget } from '../components/ui/TurnstileWidget';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';

const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';

export default function AktivasiAkun() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [mode, setMode] = createSignal<'otp' | 'token'>('otp');
  const [loading, setLoading] = createSignal(false);
  const [success, setSuccess] = createSignal(false);
  const [message, setMessage] = createSignal('');

  // Form signal for OTP
  const [email, setEmail] = createSignal('');
  const [otp, setOtp] = createSignal('');
  const [verifying, setVerifying] = createSignal(false);

  // Resend signals
  const [emailResend, setEmailResend] = createSignal('');
  const [resending, setResending] = createSignal(false);
  const [turnstileToken, setTurnstileToken] = createSignal('');
  const [turnstileReset, setTurnstileReset] = createSignal(0);
  const [cooldown, setCooldown] = createSignal(0);

  let cooldownTimer: ReturnType<typeof setInterval> | undefined;

  const startCooldown = (seconds = 60) => {
    setCooldown(seconds);
    if (cooldownTimer) clearInterval(cooldownTimer);
    cooldownTimer = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(cooldownTimer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  createEffect(() => {
    const token = searchParams.token;
    if (token) {
      setMode('token');
      setLoading(true);
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
    }
  });

  const handleVerifyOtp = async (e: Event) => {
    e.preventDefault();
    if (!email() || !email().includes('@')) {
      toast.showToast('Masukkan alamat email yang valid.', 'error');
      return;
    }
    if (!otp() || otp().trim().length !== 6) {
      toast.showToast('Kode OTP harus berupa 6 digit angka.', 'error');
      return;
    }

    setVerifying(true);
    try {
      const res = await authController.activateAccountWithOtp(email().trim(), otp().trim());
      setSuccess(true);
      setMessage(res.message || 'Akun Anda berhasil diaktifkan!');
      toast.showToast('Akun berhasil diaktifkan.', 'success');
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengaktifkan akun.', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async (e: Event) => {
    e.preventDefault();
    const targetEmail = emailResend() || email();
    if (!targetEmail || !targetEmail.includes('@')) {
      toast.showToast('Masukkan alamat email yang valid untuk mengirim kode OTP.', 'error');
      return;
    }
    if (TURNSTILE_SITE_KEY && !turnstileToken()) {
      toast.showToast('Selesaikan verifikasi keamanan terlebih dahulu.', 'error');
      return;
    }

    setResending(true);
    try {
      const res = await authController.resendActivation(targetEmail, turnstileToken());
      toast.showToast(res.message, 'success');
      setEmail(targetEmail);
      startCooldown(60);
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengirim ulang kode OTP.', 'error');
    } finally {
      setResending(false);
      setTurnstileToken('');
      setTurnstileReset((c) => c + 1);
    }
  };

  return (
    <div class="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div class="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
        <div class="flex flex-col items-center mb-6">
          <img src={logoImg} alt="SIMAK Vokasi Logo" class="h-14 w-auto mb-3" />
          <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Aktivasi Akun SIMAK Vokasi</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
            Masukkan kode 2FA OTP 6-digit yang telah dikirim ke email Anda
          </p>
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

        <Show when={!loading() && !success() && mode() === 'otp'}>
          <div class="flex flex-col gap-4">
            <form onSubmit={handleVerifyOtp} class="flex flex-col gap-4">
              <Input
                type="email"
                label="Alamat Email"
                placeholder="misal: nama@politekniksorowako.ac.id"
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                required
              />
              <Input
                type="text"
                label="Kode 2FA OTP 6-Digit Email"
                placeholder="misal: 123456"
                maxlength={6}
                value={otp()}
                onInput={(e) => setOtp(e.currentTarget.value.replace(/\D/g, ''))}
                required
                class="tracking-widest font-mono text-center text-lg font-bold"
              />

              <Button type="submit" loading={verifying()} class="w-full mt-2">
                Aktifkan Akun Saya
              </Button>
            </form>

            <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-left">
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Belum Menerima Kode OTP?</p>
              <form onSubmit={handleResendOtp} class="flex flex-col gap-3">
                <Input
                  type="email"
                  placeholder="Masukkan alamat email Anda"
                  value={emailResend() || email()}
                  onInput={(e) => setEmailResend(e.currentTarget.value)}
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
                <Button type="submit" loading={resending()} disabled={cooldown() > 0} class="w-full">
                  {cooldown() > 0 ? `Tunggu ${cooldown()}d untuk Kirim Ulang` : 'Kirim Ulang Kode OTP Email'}
                </Button>
              </form>
            </div>

            <button
              onClick={() => navigate('/login', { replace: true })}
              class="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline text-center"
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </Show>

        <Show when={!loading() && !success() && mode() === 'token'}>
          <div class="flex flex-col text-center gap-4 py-2">
            <div class="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center font-bold text-xl mx-auto">
              !
            </div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-slate-100">Aktivasi Gagal</h2>
            <p class="text-sm text-slate-600 dark:text-slate-300">{message()}</p>
            <Button onClick={() => setMode('otp')} class="w-full mt-2">
              Aktivasi Menggunakan Kode OTP Email
            </Button>
          </div>
        </Show>
      </div>
    </div>
  );
}
