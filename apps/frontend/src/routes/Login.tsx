import { A, useNavigate } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import { z } from 'zod';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';

const loginSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
  password: z.string().min(6, { message: 'Password minimal harus 6 karakter' }),
});

const registerSchema = loginSchema.extend({
  nama: z.string().min(3, { message: 'Nama minimal harus 3 karakter' }),
  role: z.enum(['admin', 'dosen', 'mahasiswa'], { message: 'Peran tidak valid' }),
});

export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [role, setRole] = createSignal('mahasiswa');
  const [isRegister, setIsRegister] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);
  const [errorMsg, setErrorMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  // If already logged in, redirect (wrapped in createEffect to prevent render phase routing crashes)
  createEffect(() => {
    if (auth.isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  });

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');

    // Zod validation
    const formData = isRegister()
      ? { email: email(), password: password(), nama: nama(), role: role() }
      : { email: email(), password: password() };
    const schema = isRegister() ? registerSchema : loginSchema;

    const result = schema.safeParse(formData);
    if (!result.success) {
      const firstError =
        (result.error as any).issues?.[0]?.message || (result.error as any).errors?.[0]?.message || 'Input tidak valid';
      setErrorMsg(firstError);
      toast.showToast(firstError, 'error');
      return;
    }

    setLoading(true);

    try {
      if (isRegister()) {
        await authController.register(email(), password(), nama(), role());
        setIsRegister(false);
        const successMsg = 'Registrasi sukses! Silakan login.';
        setErrorMsg(successMsg);
        toast.showToast(successMsg, 'success');
      } else {
        const response = await authController.login(email(), password());
        auth.login(response.token, response.user);
        toast.showToast('Login berhasil! Selamat datang.', 'success');
        if (response.user.role === 'calon_mahasiswa') {
          navigate('/admisi/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      }
    } catch (e: unknown) {
      const errText = (e as Error).message || 'Gagal terhubung ke server';
      setErrorMsg(errText);
      toast.showToast(errText, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-secondary-100 via-secondary-50 to-brand-50 dark:from-secondary-950 dark:via-primary-950 dark:to-secondary-950 overflow-hidden px-4 transition-colors duration-200">
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
            {isRegister() ? 'Buat Akun Baru' : 'Masuk ke SIMAK'}
          </h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">Sistem Informasi Akademik Vokasi</p>
        </div>

        <Show when={errorMsg()}>
          <div
            class={`p-3 rounded-lg text-xs font-semibold text-center ${
              errorMsg().includes('sukses')
                ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 border border-accent-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}
          >
            {errorMsg()}
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

          <Button type="submit" disabled={loading()} class="w-full mt-2 py-3">
            {loading() ? 'Memproses...' : isRegister() ? 'Daftar Sekarang' : 'Masuk'}
          </Button>
        </form>

        <div class="text-center flex flex-col gap-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister());
              setErrorMsg('');
            }}
            disabled={loading()}
            class="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors focus:outline-none"
          >
            {isRegister() ? 'Sudah memiliki akun? Masuk' : 'Belum memiliki akun? Daftar'}
          </button>

          <Show when={!isRegister()}>
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
