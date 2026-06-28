import { createSignal, Show } from 'solid-js';
import { useNavigate, A } from '@solidjs/router';
import { authController } from '../controllers/authController';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { z } from 'zod';

const emailSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid' }),
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const toast = useToast();

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
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 overflow-hidden px-4">
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none" />

      <div class="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col gap-6 relative z-10 text-white">
        <div class="text-center flex flex-col gap-1">
          <h2 class="text-2xl font-bold tracking-tight text-white">Lupa Kata Sandi</h2>
          <p class="text-sm text-gray-400">Masukkan email Anda untuk menerima token reset password.</p>
        </div>

        <Show when={errorMsg()}>
          <div class="p-3 rounded-lg text-xs font-semibold text-center bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {errorMsg()}
          </div>
        </Show>

        <Show when={successMsg()}>
          <div class="p-3 rounded-lg text-xs font-semibold text-center bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex flex-col gap-2">
            <div>{successMsg()}</div>
            <Show when={resetToken()}>
              <div class="text-left mt-2 p-2 bg-slate-950/60 rounded border border-white/5 font-mono text-[10px] break-all select-all">
                Token reset: <span class="text-blue-400 font-bold">{resetToken()}</span>
              </div>
              <A 
                href={`/reset-password?token=${resetToken()}`} 
                class="text-xs text-blue-400 hover:underline font-bold mt-1 self-center"
              >
                Klik di sini untuk langsung Mereset Password
              </A>
            </Show>
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
            class="!bg-slate-950/40 !border-white/10 !text-white focus:!ring-blue-500/30"
          />

          <Button type="submit" disabled={loading() || successMsg().length > 0} class="w-full mt-2 py-3">
            {loading() ? 'Memproses...' : 'Kirim Token Reset'}
          </Button>
        </form>

        <div class="text-center">
          <A
            href="/login"
            class="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors focus:outline-none"
          >
            Kembali ke Halaman Masuk
          </A>
        </div>
      </div>
    </div>
  );
}
