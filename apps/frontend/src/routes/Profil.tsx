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
  const [avatar, setAvatar] = createSignal(user()?.avatar || '');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [loading, setLoading] = createSignal(false);

  const handleFileChange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.showToast('Ukuran file maksimal 2MB', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      const res = await userController.updateProfile(nama(), password() || undefined, undefined, avatar() || undefined);
      toast.showToast(res.message, 'success');
      
      // Update local auth context user
      auth.login(localStorage.getItem('token') || '', {
        ...user()!,
        nama: res.user.nama,
        avatar: res.user.avatar,
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
      <div class="flex flex-col gap-6 max-w-xl text-brand-gray-800 dark:text-white transition-colors duration-200">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-extrabold tracking-tight">Profil Saya</h1>
          <p class="text-sm text-brand-gray-500 dark:text-brand-gray-400">Perbarui informasi profil dan foto Anda.</p>
        </div>

        <div class="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-brand-gray-100 dark:border-slate-800 p-6 transition-colors duration-200">
          <form onSubmit={handleUpdateProfile} class="flex flex-col gap-5">
            {/* Profile Picture Upload Section */}
            <div class="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40">
              <div class="relative group">
                <Show 
                  when={avatar()} 
                  fallback={
                    <div class="h-20 w-20 rounded-full bg-brand-800 border-2 border-brand-700 flex items-center justify-center font-bold text-white text-3xl uppercase shadow-lg">
                      {nama()?.[0] || user()?.email?.[0] || 'U'}
                    </div>
                  }
                >
                  <img src={avatar()} alt="Foto Profil" class="h-20 w-20 rounded-full object-cover border-2 border-brand-700 shadow-lg" />
                </Show>
              </div>
              <div class="flex-1 flex flex-col gap-1.5 items-center sm:items-start">
                <span class="text-xs font-bold text-brand-gray-500 dark:text-brand-gray-400">Foto Profil</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  class="hidden" 
                  id="avatar-upload-input"
                />
                <div class="flex gap-2">
                  <label 
                    for="avatar-upload-input"
                    class="px-3.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Pilih Foto
                  </label>
                  <Show when={avatar()}>
                    <button 
                      type="button" 
                      onClick={() => setAvatar('')}
                      class="px-3.5 py-1.5 bg-rose hover:bg-rose text-white rounded text-xs font-bold transition-colors"
                    >
                      Hapus
                    </button>
                  </Show>
                </div>
                <span class="text-[10px] text-brand-gray-450 dark:text-brand-gray-500">Format JPG, PNG. Maksimal 2MB.</span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-brand-gray-400 dark:text-brand-gray-500 uppercase tracking-wider mb-1">Email</label>
              <div class="w-full rounded-lg border border-brand-gray-200 dark:border-slate-800 bg-brand-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-brand-gray-500 dark:text-brand-gray-400 select-none">
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
              class="!bg-white dark:!bg-slate-950 !border-brand-gray-200 dark:!border-slate-855 dark:!text-white focus:!ring-brand-700/30"
            />

            <hr class="border-brand-gray-100 dark:border-slate-800 my-2" />

            <div class="flex flex-col gap-1">
              <h3 class="text-sm font-bold text-brand-gray-700 dark:text-gray-300">Ubah Kata Sandi (Opsional)</h3>
              <p class="text-xs text-brand-gray-400 dark:text-gray-550">Kosongkan kolom di bawah jika Anda tidak ingin mengubah kata sandi.</p>
            </div>

            <Input
              type="password"
              label="Kata Sandi Baru"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-white dark:!bg-slate-950 !border-brand-gray-200 dark:!border-slate-855 dark:!text-white focus:!ring-brand-700/30"
            />

            <Input
              type="password"
              label="Konfirmasi Kata Sandi Baru"
              value={confirmPassword()}
              onInput={(e) => setConfirmPassword(e.currentTarget.value)}
              disabled={loading()}
              class="!bg-white dark:!bg-slate-950 !border-brand-gray-200 dark:!border-slate-855 dark:!text-white focus:!ring-brand-700/30"
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
