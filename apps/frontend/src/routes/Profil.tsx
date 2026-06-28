import { createSignal, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { userController } from '../controllers/userController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../contexts/ToastContext';

export default function Profil() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  const [nama, setNama] = createSignal(user()?.nama || '');
  const [theme, setTheme] = createSignal(user()?.theme || 'light');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleUpdateProfile = async (e: Event) => {
    e.preventDefault();

    if (nama().trim().length < 3) {
      toast.showToast('Nama minimal harus 3 karakter', 'error');
      return;
    }

    if (password()) {
      if (password().length < 6) {
        toast.showToast('Password minimal harus 6 karakter', 'error');
        return;
      }
      if (password() !== confirmPassword()) {
        toast.showToast('Konfirmasi password tidak cocok', 'error');
        return;
      }
    }

    setLoading(true);
    try {
      const res = await userController.updateProfile(nama(), password() || undefined, theme());
      toast.showToast(res.message, 'success');
      
      // Update local auth context user
      auth.login(localStorage.getItem('token') || '', {
        ...user()!,
        nama: res.user.nama,
        theme: res.user.theme,
      });

      // Clear password fields
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6 max-w-xl text-gray-800 dark:text-white transition-colors duration-200">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-extrabold tracking-tight">Profil Saya</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Perbarui informasi profil dan preferensi tampilan Anda.</p>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-200">
          <form onSubmit={handleUpdateProfile} class="flex flex-col gap-5">
            <div>
              <label class="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Email</label>
              <div class="w-full rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 select-none">
                {user()?.email}
              </div>
            </div>

            <Input
              type="text"
              label="Nama Lengkap"
              required
              value={nama()}
              onInput={(e) => setNama(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-white dark:!bg-slate-950 !border-gray-200 dark:!border-slate-850 dark:!text-white focus:!ring-blue-500/30"
            />

            <div class="flex flex-col gap-2">
              <label class="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tema Tampilan (Mode)</label>
              <div class="flex gap-6 mt-1">
                <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="theme"
                    value="light"
                    checked={theme() === 'light'}
                    onChange={() => setTheme('light')}
                    class="text-blue-600 focus:ring-blue-500 dark:bg-slate-950 dark:border-slate-800"
                  />
                  ☀ Mode Terang (Light)
                </label>
                <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <input
                    type="radio"
                    name="theme"
                    value="dark"
                    checked={theme() === 'dark'}
                    onChange={() => setTheme('dark')}
                    class="text-blue-600 focus:ring-blue-500 dark:bg-slate-950 dark:border-slate-800"
                  />
                  🌙 Mode Gelap (Dark)
                </label>
              </div>
            </div>

            <hr class="border-gray-100 dark:border-slate-800 my-2" />

            <div class="flex flex-col gap-1">
              <h3 class="text-sm font-bold text-gray-700 dark:text-gray-300">Ubah Kata Sandi (Opsional)</h3>
              <p class="text-xs text-gray-400 dark:text-gray-500">Kosongkan kolom di bawah jika Anda tidak ingin mengubah kata sandi.</p>
            </div>

            <Input
              type="password"
              label="Kata Sandi Baru"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-white dark:!bg-slate-950 !border-gray-200 dark:!border-slate-850 dark:!text-white focus:!ring-blue-500/30"
            />

            <Input
              type="password"
              label="Konfirmasi Kata Sandi Baru"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-white dark:!bg-slate-950 !border-gray-200 dark:!border-slate-850 dark:!text-white focus:!ring-blue-500/30"
            />

            <div class="flex justify-end mt-2">
              <Button type="submit" disabled={loading()} class="px-6 py-2.5">
                {loading() ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
