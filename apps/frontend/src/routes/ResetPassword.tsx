import { A, useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, onMount, Show } from 'solid-js';
import { z } from 'zod';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';

const resetSchema = z
  .object({
    password: z.string().min(8, { message: 'Password minimal harus 8 karakter' }),
    confirmPassword: z.string().min(8, { message: 'Password minimal harus 8 karakter' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

export default function ResetPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();
  const [searchParams] = useSearchParams();

  const [useOtp, setUseOtp] = createSignal(true);
  const [email, setEmail] = createSignal('');
  const [otp, setOtp] = createSignal('');
  const [token, setToken] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  onMount(() => {
    const t = searchParams.token;
    if (t) {
      setToken(t);
      setUseOtp(false);
    }
  });

  createEffect(() => {
    const t = token();
    if (t && !useOtp()) {
      authController
        .validateResetToken(t)
        .then((data) => {
          if (data.email) {
            setEmail(data.email);
          }
        })
        .catch(() => {
          setEmail('');
        });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');

    if (useOtp()) {
      if (!email() || !email().includes('@')) {
        const err = 'Alamat email wajib diisi.';
        setErrorMsg(err);
        toast.showToast(err, 'error');
        return;
      }
      if (!otp() || otp().trim().length !== 6) {
        const err = 'Kode 2FA OTP 6-digit wajib diisi.';
        setErrorMsg(err);
        toast.showToast(err, 'error');
        return;
      }
    } else {
      if (!token()) {
        const err = 'Token reset password tidak ditemukan';
        setErrorMsg(err);
        toast.showToast(err, 'error');
        return;
      }
    }

    const result = resetSchema.safeParse({ password: password(), confirmPassword: confirmPassword() });
    if (!result.success) {
      const firstError = result.error.issues?.[0]?.message || 'Input tidak valid';
      setErrorMsg(firstError);
      toast.showToast(firstError, 'error');
      return;
    }

    setLoading(true);

    try {
      if (useOtp()) {
        await authController.resetPasswordWithOtp(email().trim(), otp().trim(), password());
      } else {
        await authController.resetPassword(token(), password());
      }
      toast.showToast('Kata sandi berhasil diubah! Silakan login.', 'success');
      navigate('/login', { replace: true });
    } catch (e: unknown) {
      const errText = (e as Error).message || 'Gagal mengubah kata sandi';
      setErrorMsg(errText);
      toast.showToast(errText, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-secondary-100 via-secondary-50 to-brand-50 dark:from-secondary-950 dark:via-primary-950 dark:to-secondary-950 overflow-hidden px-4 transition-colors duration-200">
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

      <div class="w-full max-w-md bg-white dark:bg-secondary-900/60 dark:backdrop-blur-xl border border-secondary-200/80 dark:border-white/10 p-8 rounded-2xl shadow-xl dark:shadow-2xl flex flex-col gap-6 relative z-10 text-secondary-800 dark:text-white transition-all duration-200">
        <div class="text-center flex flex-col items-center gap-2">
          <img src={logoImg} alt="Logo" class="w-16 h-16 object-contain mb-2" />
          <h2 class="text-2xl font-bold tracking-tight text-secondary-800 dark:text-white">Atur Ulang Kata Sandi</h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-400">
            {useOtp()
              ? 'Masukkan alamat email, kode 2FA OTP 6-digit, dan kata sandi baru Anda.'
              : 'Masukkan kata sandi baru untuk akun Anda.'}
          </p>
        </div>

        <Show when={errorMsg()}>
          <div class="p-3 rounded-lg text-xs font-semibold text-center bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {errorMsg()}
          </div>
        </Show>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <Show when={useOtp()}>
            <Input
              type="email"
              label="Alamat Email"
              placeholder="misal: nama@politekniksorowako.ac.id"
              required
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              disabled={loading()}
            />
            <Input
              type="text"
              label="Kode 2FA OTP 6-Digit Email"
              placeholder="misal: 123456"
              maxlength={6}
              required
              value={otp()}
              onInput={(e) => setOtp(e.currentTarget.value.replace(/\D/g, ''))}
              disabled={loading()}
              class="tracking-widest font-mono text-center text-lg font-bold"
            />
          </Show>

          <Show when={!useOtp()}>
            <Input
              type="text"
              label="Token Reset Password"
              required
              value={token()}
              onInput={(e) => setToken(e.currentTarget.value)}
              disabled={loading() || !!searchParams.token}
            />
          </Show>

          <div class="relative">
            <Input
              type={showPassword() ? 'text' : 'password'}
              label="Kata Sandi Baru"
              required
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              disabled={loading()}
              class="!pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword())}
              class="absolute right-3 top-[38px] text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors focus:outline-none"
              tabindex={-1}
            >
              {showPassword() ? '🙈' : '👁️'}
            </button>
          </div>

          <div class="relative">
            <Input
              type={showConfirmPassword() ? 'text' : 'password'}
              label="Konfirmasi Kata Sandi Baru"
              required
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              disabled={loading()}
              class="!pr-12"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword())}
              class="absolute right-3 top-[38px] text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors focus:outline-none"
              tabindex={-1}
            >
              {showConfirmPassword() ? '🙈' : '👁️'}
            </button>
          </div>

          <Button type="submit" disabled={loading()} class="w-full mt-2 py-3">
            {loading() ? 'Memproses...' : 'Ubah Kata Sandi'}
          </Button>
        </form>

        <div class="flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={() => setUseOtp(!useOtp())}
            class="text-secondary-500 hover:text-secondary-700 dark:hover:text-secondary-300 underline"
          >
            {useOtp() ? 'Gunakan Link Reset' : 'Gunakan Kode OTP Email'}
          </button>
          <A
            href="/login"
            class="text-brand-800 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-300 font-semibold transition-colors focus:outline-none"
          >
            Kembali ke Halaman Masuk
          </A>
        </div>
      </div>
    </div>
  );
}
