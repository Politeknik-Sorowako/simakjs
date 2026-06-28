import { createSignal } from 'solid-js';
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
      const res = await userController.updateProfile(nama(), password() || undefined);
      toast.showToast(res.message, 'success');
      
      // Update local auth context user
      auth.login(localStorage.getItem('token') || '', {
        ...user()!,
        nama: res.user.nama,
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
      <div class="flex flex-col gap-6 max-w-xl">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-extrabold text-gray-800 tracking-tight">Profil Saya</h1>
          <p class="text-sm text-gray-500">Perbarui informasi profil dan kata sandi Anda.</p>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleUpdateProfile} class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</label>
              <div class="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 select-none">
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
            />

            <hr class="border-gray-100 my-2" />

            <div class="flex flex-col gap-1">
              <h3 class="text-sm font-bold text-gray-700">Ubah Kata Sandi (Opsional)</h3>
              <p class="text-xs text-gray-400">Kosongkan kolom di bawah jika Anda tidak ingin mengubah kata sandi.</p>
            </div>

            <Input
              type="password"
              label="Kata Sandi Baru"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              disabled={loading()}
            />

            <Input
              type="password"
              label="Konfirmasi Kata Sandi Baru"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              disabled={loading()}
            />

            <div class="flex justify-end mt-2">
              <Button type="submit" disabled={loading()}>
                {loading() ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}
