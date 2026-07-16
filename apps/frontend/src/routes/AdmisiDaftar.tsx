import { A, useNavigate } from '@solidjs/router';
import { createSignal } from 'solid-js';
import logoImg from '../assets/logo.png';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiDaftar() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [nama, setNama] = createSignal('');
  const [loading, setLoading] = createSignal(false);
  const [success, setSuccess] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    try {
      await admisiController.register(email(), password(), nama());
      setSuccess(true);
      toast.showToast('Akun berhasil dibuat! Silakan cek email untuk verifikasi.', 'success');
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal mendaftar', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success()) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-secondary-100 via-secondary-50 to-brand-50 dark:from-secondary-950 dark:via-primary-950 dark:to-secondary-950 p-4">
        <div class="max-w-md w-full bg-white dark:bg-secondary-900/60 backdrop-blur-xl border border-secondary-200/80 dark:border-white/10 p-8 rounded-2xl shadow-xl text-center">
          <div class="text-5xl mb-4">📧</div>
          <h2 class="text-xl font-bold mb-2">Cek Email Anda</h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-300 mb-6">
            Kami telah mengirim email verifikasi ke <strong>{email()}</strong>. Silakan klik link di email untuk
            mengaktifkan akun.
          </p>
          <Button onClick={() => navigate('/login')}>Ke Halaman Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-secondary-100 via-secondary-50 to-brand-50 dark:from-secondary-950 dark:via-primary-950 dark:to-secondary-950 p-4">
      <div class="max-w-md w-full bg-white dark:bg-secondary-900/60 backdrop-blur-xl border border-secondary-200/80 dark:border-white/10 p-8 rounded-2xl shadow-xl">
        <div class="text-center mb-6">
          <img src={logoImg} alt="Logo" class="w-16 h-16 object-contain mx-auto mb-2" />
          <h2 class="text-2xl font-bold">Daftar Akun PMB</h2>
          <p class="text-sm text-secondary-500 dark:text-secondary-300">
            Penerimaan Mahasiswa Baru Politeknik Sorowako
          </p>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <Input
            label="Nama Lengkap"
            required
            value={nama()}
            onInput={(e) => setNama(e.currentTarget.value)}
            disabled={loading()}
          />
          <Input
            label="Email"
            type="email"
            required
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
            disabled={loading()}
          />
          <Input
            label="Password"
            type="password"
            required
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
            disabled={loading()}
          />

          <Button type="submit" disabled={loading()} class="w-full mt-2">
            {loading() ? 'Memproses...' : 'Daftar Sekarang'}
          </Button>
        </form>

        <p class="text-center text-xs text-secondary-500 mt-4">
          Sudah punya akun?{' '}
          <A href="/login" class="text-brand-600 hover:text-brand-700 font-semibold">
            Masuk
          </A>
        </p>
      </div>
    </div>
  );
}
