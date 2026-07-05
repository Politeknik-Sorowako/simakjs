import { createSignal, Show } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { authController } from '../controllers/authController';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { z } from 'zod';
import logoImg from '../assets/logo.png';

const emailSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();
  const auth = useAuth();

  const [email, setEmail] = createSignal('');
  const [errorMsg, setErrorMsg] = createSignal('');
  const [successMsg, setSuccessMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [resetToken, setResetToken] = createSignal('');

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setResetToken('');

    const result = emailSchema.safeParse({ email: email() });
    if (!result.success) {
      const firstError = result.error.errors[0]?.message || 'Input tidak valid';
      setErrorMsg(firstError);
      toast.showToast(firstError, 'error');
      return;
    }

    setLoading(true);

    try {
      const res = await authController.forgotPassword(email());
      const msg = 'Token reset password berhasil dibuat!';
      setSuccessMsg(msg);
      toast.showToast(msg, 'success');
      if (res.token) {
        setResetToken(res.token);
      }
    } catch (e: any) {
      const errText = e.message || 'Gagal membuat token reset';
      setErrorMsg(errText);
      toast.showToast(errText, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-brand-50 via-white to-brand-50 dark:from-brand-950 dark:via-brand-950 dark:to-brand-950 overflow-hidden px-4 transition-colors duration-200">
      {/* Floating Theme Toggle in Top Right */}
      <div class="absolute top-4 right-4 z-50">
        <button
          onClick={() => {
            const nextTheme = auth.theme() === 'light' ? 'dark' : 'light';
            auth.setTheme(nextTheme);
          }}
          class="p-2.5 rounded-xl bg-brand-100/80 dark:bg-white/10 backdrop-blur-md border border-brand-gray-250/50 dark:border-white/20 text-brand-gray-700 dark:text-white hover:bg-brand-200/80 dark:hover:bg-white/20 transition-all focus:outline-none shadow-md dark:shadow-lg"
          title="Beralih Mode Gelap/Terang"
        >
          {auth.theme() === 'light' ? (
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          ) : (
            <svg class="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          )}
        </button>
      </div>

      <div class="absolute -top-40 -left-40 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-500/10 dark:bg-brand-500/20 rounded-full blur-[128px] pointer-events-none" />

      <div class="w-full max-w-md bg-white dark:bg-slate-900/60 dark:backdrop-blur-xl border border-brand-gray-200/80 dark:border-white/10 p-8 rounded-2xl shadow-xl dark:shadow-2xl flex flex-col gap-6 relative z-10 text-slate-800 dark:text-white transition-all duration-200">
        <div class="text-center flex flex-col items-center gap-2">
          <img src={logoImg} alt="Logo" class="w-16 h-16 object-contain mb-2" />
          <h2 class="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Lupa Kata Sandi</h2>
          <p class="text-sm text-brand-gray-500 dark:text-brand-gray-400">Masukkan email Anda untuk menerima token reset password.</p>
        </div>

        <Show when={errorMsg()}>
          <div class="p-3 rounded-lg text-xs font-semibold text-center bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
            {errorMsg()}
          </div>
        </Show>

        <Show when={successMsg()}>
          <div class="p-4 rounded-xl text-sm text-center bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 flex flex-col gap-2">
            <span class="font-bold">Email Terkirim!</span>
            <p class="text-xs text-brand-gray-500 dark:text-brand-gray-300">
              Tautan dan token untuk mengatur ulang kata sandi telah berhasil dikirim ke email Anda. Silakan periksa kotak masuk atau spam email Anda.
            </p>
          </div>
        </Show>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <Input
            type="email"
            label="Email"
            required
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            disabled={loading() || successMsg().length > 0}
            class="!bg-slate-50 dark:!bg-slate-950/40 !border-brand-gray-250 dark:!border-white/10 !text-slate-800 dark:!text-white focus:!ring-brand-500/30"
          />

          <Button type="submit" disabled={loading() || successMsg().length > 0} class="w-full mt-2 py-3">
            {loading() ? 'Memproses...' : 'Kirim Token Reset'}
          </Button>
        </form>

        <div class="text-center">
          <A
            href="/login"
            class="text-xs text-brand-800 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-300 font-semibold transition-colors focus:outline-none"
          >
            Kembali ke Halaman Masuk
          </A>
        </div>
      </div>
    </div>
  );
}
