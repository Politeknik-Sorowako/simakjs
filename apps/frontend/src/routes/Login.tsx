import { A, useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { z } from 'zod';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';
import { RateLimitError } from '../utils/eden';

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes} menit ${seconds.toString().padStart(2, '0')} detik`;
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(6, { message: 'Password minimal harus 6 karakter' }),
});

const registerSchema = loginSchema.extend({
  nama: z.string().min(3, { message: 'Nama minimal harus 3 karakter' }),
  role: z.enum(['admin', 'dosen', 'mahasiswa'], { message: 'Peran tidak valid' }),
});

const getSafeRedirectUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('://')) {
    return url;
  }
  return null;
};

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [role, setRole] = createSignal('mahasiswa');
  const [isRegister, setIsRegister] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  // 2FA Signals
  const [is2FAStep, setIs2FAStep] = createSignal(false);
  const [twoFactorToken, setTwoFactorToken] = createSignal('');
  const [totpCode, setTotpCode] = createSignal('');
  const [isRecoveryMode, setIsRecoveryMode] = createSignal(false);

  // Inactive Account Signals
  const [showResendBtn, setShowResendBtn] = createSignal(false);
  const [resendingActivation, setResendingActivation] = createSignal(false);

  const [retryAfter, setRetryAfter] = createSignal<number | null>(null);
  const [countdown, setCountdown] = createSignal(0);
  const [ssoLoading, setSsoLoading] = createSignal(false);

  let countdownTimer: ReturnType<typeof setInterval> | null = null;

  const stopCountdown = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  onCleanup(stopCountdown);

  createEffect(() => {
    const seconds = retryAfter();
    if (seconds === null || seconds <= 0) {
      stopCountdown();
      setCountdown(0);
      return;
    }
    setCountdown(seconds);
    stopCountdown();
    countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopCountdown();
          setRetryAfter(null);
          setCountdown(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  });

  // Check 2FA step from Google SSO redirect or URL
  createEffect(() => {
    if (searchParams.step === '2fa' || sessionStorage.getItem('2fa_token')) {
      const storedToken = sessionStorage.getItem('2fa_token');
      if (storedToken) {
        setTwoFactorToken(storedToken);
        setIs2FAStep(true);
      }
    }
  });

  // If already logged in, redirect
  createEffect(() => {
    if (auth.isAuthenticated()) {
      const redirectUrl = getSafeRedirectUrl(searchParams.redirect);
      navigate(redirectUrl || '/dashboard', { replace: true });
    }
  });

  const handleGoogleSSO = async () => {
    try {
      setSsoLoading(true);
      setLoading(true);
      const res = await authController.getGoogleAuthUrl();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        toast.showToast('Gagal memuat URL login Google SSO', 'error');
        setSsoLoading(false);
        setLoading(false);
      }
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memulai login Google SSO', 'error');
      setSsoLoading(false);
      setLoading(false);
    }
  };

  const handleResendActivationEmail = async () => {
    if (!email()) {
      toast.showToast('Masukkan alamat email Anda terlebih dahulu', 'error');
      return;
    }
    setResendingActivation(true);
    try {
      const res = await authController.resendActivation(email());
      toast.showToast(res.message, 'success');
      setErrorMsg('Tautan aktivasi baru telah dikirimkan ke email Anda.');
      setShowResendBtn(false);
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengirim email aktivasi', 'error');
    } finally {
      setResendingActivation(false);
    }
  };

  const handleVerify2FA = async (e: Event) => {
    e.preventDefault();
    if (!totpCode().trim()) {
      toast.showToast('Masukkan kode 2FA atau kode pemulihan', 'error');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const response = await authController.twoFactorVerifyLogin(twoFactorToken(), totpCode().trim(), isRecoveryMode());
      sessionStorage.removeItem('2fa_token');
      if (response.token && response.user) {
        auth.login(response.token, response.user);
        toast.showToast('Login 2FA berhasil!', 'success');
        const redirectUrl = getSafeRedirectUrl(searchParams.redirect);
        if (redirectUrl) {
          navigate(redirectUrl, { replace: true });
        } else if (response.user.role === 'calon_mahasiswa') {
          navigate('/admisi/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (err: unknown) {
      const errText = (err as Error).message || 'Kode 2FA salah atau kedaluwarsa';
      setErrorMsg(errText);
      toast.showToast(errText, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    setShowResendBtn(false);

    if (retryAfter() !== null) {
      toast.showToast(`Tunggu ${formatCountdown(countdown())} sebelum mencoba lagi.`, 'error');
      return;
    }

    const formData = isRegister()
      ? { email: email(), password: password(), nama: nama(), role: role() }
      : { email: email(), password: password() };
    const schema = isRegister() ? registerSchema : loginSchema;

    const result = schema.safeParse(formData);
    if (!result.success) {
      const firstError = result.error.issues?.[0]?.message || 'Input tidak valid';
      setErrorMsg(firstError);
      toast.showToast(firstError, 'error');
      return;
    }

    setLoading(true);

    try {
      if (isRegister()) {
        const res = await authController.register(email(), password(), nama(), role());
        setIsRegister(false);
        const successMsg = res.message || 'Registrasi sukses! Silakan periksa email untuk aktivasi.';
        setErrorMsg(successMsg);
        toast.showToast(successMsg, 'success');
      } else {
        const response = await authController.login(email(), password());
        if (response.requires2FA && response.twoFactorToken) {
          setTwoFactorToken(response.twoFactorToken);
          setIs2FAStep(true);
          toast.showToast('Masukkan kode 2FA dari aplikasi authenticator Anda.', 'info');
        } else if (response.token && response.user) {
          auth.login(response.token, response.user);
          toast.showToast('Login berhasil! Selamat datang.', 'success');
          const redirectUrl = getSafeRedirectUrl(searchParams.redirect);
          if (redirectUrl) {
            navigate(redirectUrl, { replace: true });
          } else if (response.user.role === 'calon_mahasiswa') {
            navigate('/admisi/dashboard', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      }
    } catch (e: unknown) {
      if (e instanceof RateLimitError) {
        setRetryAfter(e.retryAfter);
        setErrorMsg(e.message);
        toast.showToast(`Terlalu banyak percobaan. Coba lagi dalam ${formatCountdown(e.retryAfter)}.`, 'error');
      } else {
        const errText = (e as Error).message || 'Gagal terhubung ke server';
        setErrorMsg(errText);
        if (errText.toLowerCase().includes('belum diaktifkan')) {
          setShowResendBtn(true);
        }
        toast.showToast(errText, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-secondary-100 via-secondary-50 to-brand-50 dark:from-secondary-950 dark:via-primary-950 dark:to-secondary-950 overflow-hidden px-4 transition-colors duration-200">
      <Show when={ssoLoading()}>
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-secondary-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div class="bg-white dark:bg-secondary-900 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl border border-secondary-100 dark:border-secondary-800 flex flex-col items-center gap-4">
            <div class="w-12 h-12 border-4 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
            <h3 class="text-base font-bold text-secondary-800 dark:text-white">Menghubungkan ke Google Workspace</h3>
            <p class="text-xs text-secondary-500 dark:text-secondary-400">
              Mengarahkan ke portal otentikasi Politeknik Sorowako...
            </p>
          </div>
        </div>
      </Show>

      {/* Floating Theme Toggle in Top Right */}
      <div class="absolute top-4 right-4 z-50">
        <button
          onClick={() => {
            const nextTheme = auth.theme() === 'light' ? 'dark' : 'light';
            auth.setTheme(nextTheme);
          }}
          class="p-2.5 rounded-xl bg-secondary-100/80 dark:bg-white/10 backdrop-blur-md border border-secondary-200/50 dark:border-white/20 text-secondary-700 dark:text-white hover:bg-secondary-200/80 dark:hover:bg-white/20 transition-all focus:outline-none shadow-md dark:shadow-lg"
          title="Beralih Mode Gelap/Terang"
        >
          {auth.theme() === 'light' ? (
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          ) : (
            <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Decorative Blur Orbs */}
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-accent-500/10 dark:bg-accent-500/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Login Card */}
      <div class="w-full max-w-md bg-white dark:bg-secondary-900/60 dark:backdrop-blur-xl border border-secondary-200/80 dark:border-white/10 p-8 rounded-2xl shadow-xl dark:shadow-2xl flex flex-col gap-6 relative z-10 text-secondary-800 dark:text-white transition-all duration-200">
        <div class="text-center flex flex-col items-center gap-2">
          <img src={logoImg} alt="Logo" class="w-16 h-16 object-contain mb-2" />
          <h2 class="text-2xl font-bold tracking-tight text-secondary-800 dark:text-white">
            {is2FAStep() ? 'Verifikasi 2FA' : isRegister() ? 'Buat Akun Baru' : 'Masuk ke SIMAK'}
          </h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            {is2FAStep() ? 'Masukkan kode authenticator Anda untuk melanjutkan' : 'Sistem Informasi Akademik Vokasi'}
          </p>
        </div>

        <Show when={errorMsg()}>
          <div
            class={`p-3 rounded-lg text-xs font-semibold text-center flex flex-col items-center gap-2 ${
              errorMsg().includes('sukses') || errorMsg().includes('dikirimkan')
                ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            <span>{errorMsg()}</span>
            <Show when={showResendBtn()}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={resendingActivation()}
                onClick={handleResendActivationEmail}
                class="!py-1 !px-3 !text-xs mt-1"
              >
                Kirim Ulang Link Aktivasi Email
              </Button>
            </Show>
          </div>
        </Show>

        {/* 2FA Step Form */}
        <Show when={is2FAStep()}>
          <form onSubmit={handleVerify2FA} class="flex flex-col gap-4">
            <Input
              type="text"
              label={isRecoveryMode() ? 'Kode Pemulihan Backup (Recovery Code)' : 'Kode 6-Digit TOTP'}
              placeholder={isRecoveryMode() ? 'XXXX-XXXX' : '123456'}
              required
              value={totpCode()}
              onInput={(e) => setTotpCode(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-secondary-50 dark:!bg-secondary-950/40 !border-secondary-200 dark:!border-white/10 !text-secondary-800 dark:!text-white focus:!ring-primary-500/30 text-center text-lg tracking-widest font-mono"
            />

            <Button type="submit" loading={loading()} class="w-full py-3">
              Verifikasi & Masuk
            </Button>

            <div class="flex justify-between items-center text-xs mt-1">
              <button
                type="button"
                onClick={() => setIsRecoveryMode(!isRecoveryMode())}
                class="text-brand-600 dark:text-brand-400 hover:underline"
              >
                {isRecoveryMode() ? 'Gunakan Kode 6-Digit Authenticator' : 'Gunakan Kode Pemulihan Backup'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIs2FAStep(false);
                  sessionStorage.removeItem('2fa_token');
                }}
                class="text-secondary-500 hover:underline"
              >
                Batal
              </button>
            </div>
          </form>
        </Show>

        {/* Normal Login / Register Form */}
        <Show when={!is2FAStep()}>
          {/* Google Workspace SSO Button */}
          <Show when={!isRegister()}>
            <button
              type="button"
              onClick={handleGoogleSSO}
              disabled={loading()}
              class="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-secondary-300 dark:border-white/20 bg-white dark:bg-secondary-800/80 hover:bg-secondary-50 dark:hover:bg-secondary-800 text-secondary-700 dark:text-white font-medium text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Login dengan Google Workspace</span>
            </button>

            <div class="relative flex items-center justify-center my-1">
              <div class="border-t border-secondary-200 dark:border-white/10 w-full" />
              <span class="bg-white dark:bg-secondary-900 px-3 text-[11px] uppercase tracking-wider text-secondary-400 dark:text-secondary-400 font-semibold absolute">
                atau
              </span>
            </div>
          </Show>

          <form onSubmit={handleSubmit} class="flex flex-col gap-4">
            <Input
              type="email"
              label="Email"
              required
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-secondary-50 dark:!bg-secondary-950/40 !border-secondary-200 dark:!border-white/10 !text-secondary-800 dark:!text-white focus:!ring-primary-500/30"
            />

            <Show when={isRegister()}>
              <Input
                type="text"
                label="Nama Lengkap"
                required
                value={nama()}
                onInput={(e) => setNama(e.currentTarget.value)}
                disabled={loading()}
                class="!bg-secondary-50 dark:!bg-secondary-950/40 !border-secondary-200 dark:!border-white/10 !text-secondary-800 dark:!text-white focus:!ring-primary-500/30"
              />
            </Show>

            <div class="relative">
              <Input
                type={showPassword() ? 'text' : 'password'}
                label="Password"
                required
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                disabled={loading()}
                class="!bg-secondary-50 dark:!bg-secondary-950/40 !border-secondary-200 dark:!border-white/10 !text-secondary-800 dark:!text-white focus:!ring-primary-500/30 !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword())}
                class="absolute right-3 top-[38px] text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors focus:outline-none"
                tabindex={-1}
              >
                {showPassword() ? (
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                    />
                  </svg>
                ) : (
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>

            <Show
              when={retryAfter() !== null}
              fallback={
                <Button type="submit" disabled={loading()} class="w-full mt-2 py-3">
                  {loading() ? 'Memproses...' : isRegister() ? 'Daftar Sekarang' : 'Masuk'}
                </Button>
              }
            >
              <div class="mt-2 p-3 rounded-lg text-xs font-semibold text-center bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Terlalu banyak percobaan. Coba lagi dalam {formatCountdown(countdown())}.
              </div>
            </Show>
          </form>
        </Show>

        <div class="text-center flex flex-col gap-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister());
              setErrorMsg('');
              setShowResendBtn(false);
            }}
            disabled={loading()}
            class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors focus:outline-none"
          >
            {isRegister() ? 'Sudah memiliki akun? Masuk' : 'Belum memiliki akun? Daftar'}
          </button>

          <Show when={!isRegister() && !is2FAStep()}>
            <A
              href="/forgot-password"
              class="text-xs text-secondary-500 dark:text-secondary-200 hover:text-secondary-700 dark:hover:text-secondary-300 transition-colors focus:outline-none mt-1"
            >
              Lupa Kata Sandi?
            </A>
          </Show>
        </div>
      </div>
    </div>
  );
}
