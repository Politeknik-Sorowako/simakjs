import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { authController } from '../controllers/authController';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { z } from 'zod';

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
  const [errorMsg, setErrorMsg] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  // If already logged in, redirect
  if (auth.isAuthenticated()) {
    navigate('/dashboard', { replace: true });
  }

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
      const firstError = result.error.errors[0]?.message || 'Input tidak valid';
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
        navigate('/dashboard', { replace: true });
      }
    } catch (e: any) {
      const errText = e.message || 'Gagal terhubung ke server';
      setErrorMsg(errText);
      toast.showToast(errText, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div class="relative min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 overflow-hidden px-4">
      {/* Decorative Blur Orbs */}
      <div class="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px] pointer-events-none" />
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-[128px] pointer-events-none" />

      {/* Login Card */}
      <div class="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl flex flex-col gap-6 relative z-10 text-white">
        <div class="text-center flex flex-col gap-1">
          <h2 class="text-2xl font-bold tracking-tight text-white">
            {isRegister() ? 'Buat Akun Baru' : 'Masuk ke SIMAK'}
          </h2>
          <p class="text-sm text-gray-400">Sistem Informasi Akademik Vokasi</p>
        </div>

        <Show when={errorMsg()}>
          <div class={`p-3 rounded-lg text-xs font-semibold text-center ${
            errorMsg().includes('sukses') ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
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
            class="!bg-slate-950/40 !border-white/10 !text-white focus:!ring-blue-500/30"
          />

          <Show when={isRegister()}>
            <Input
              type="text"
              label="Nama Lengkap"
              required
              value={nama()}
              onInput={(e) => setNama(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-slate-950/40 !border-white/10 !text-white focus:!ring-blue-500/30"
            />
          </Show>

          <Input
            type="password"
            label="Password"
            required
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            disabled={loading()}
            class="!bg-slate-950/40 !border-white/10 !text-white focus:!ring-blue-500/30"
          />



          <Button type="submit" disabled={loading()} class="w-full mt-2 py-3">
            {loading() ? 'Memproses...' : isRegister() ? 'Daftar Sekarang' : 'Masuk'}
          </Button>
        </form>

        <div class="text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister());
              setErrorMsg('');
            }}
            disabled={loading()}
            class="text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors focus:outline-none"
          >
            {isRegister() ? 'Sudah memiliki akun? Masuk' : 'Belum memiliki akun? Daftar'}
          </button>
        </div>
      </div>
    </div>
  );
}
