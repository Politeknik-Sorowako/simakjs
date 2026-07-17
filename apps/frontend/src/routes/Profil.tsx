import { createSignal, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userController } from '../controllers/userController';

export default function Profil() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  const [nama, setNama] = createSignal(user()?.nama || '');
  const [avatar, setAvatar] = createSignal(user()?.avatar || '');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
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
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6 max-w-xl text-secondary-800 dark:text-white transition-colors duration-200">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-extrabold tracking-tight">Profil Saya</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">Perbarui informasi profil dan foto Anda.</p>
        </div>

        <div class="bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 p-6 transition-colors duration-200">
          <form onSubmit={handleUpdateProfile} class="flex flex-col gap-5">
            {/* Profile Picture Upload Section */}
            <div class="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-secondary-50 dark:bg-secondary-950/40 border border-secondary-100 dark:border-secondary-800/40">
              <div class="relative group">
                <Show
                  when={avatar()}
                  fallback={
                    <div class="h-20 w-20 rounded-full bg-brand-600 border-2 border-brand-500 flex items-center justify-center font-bold text-white text-3xl uppercase shadow-lg">
                      {nama()?.[0] || user()?.email?.[0] || 'U'}
                    </div>
                  }
                >
                  <img
                    src={avatar()}
                    alt="Foto Profil"
                    class="h-20 w-20 rounded-full object-cover border-2 border-brand-500 shadow-lg"
                  />
                </Show>
              </div>
              <div class="flex-1 flex flex-col gap-1.5 items-center sm:items-start">
                <span class="text-xs font-bold text-secondary-500 dark:text-secondary-200">Foto Profil</span>
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
                    class="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-750 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                  >
                    Pilih Foto
                  </label>
                  <Show when={avatar()}>
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      class="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-750 text-white rounded text-xs font-bold transition-colors"
                    >
                      Hapus
                    </button>
                  </Show>
                </div>
                <span class="text-[10px] text-secondary-400 dark:text-secondary-200">
                  Format JPG, PNG. Maksimal 2MB.
                </span>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-secondary-400 dark:text-secondary-200 uppercase tracking-wider mb-1">
                Email
              </label>
              <div class="w-full rounded-lg border border-secondary-200 dark:border-secondary-800 bg-secondary-50 dark:bg-secondary-950 px-4 py-2.5 text-sm text-secondary-500 dark:text-secondary-200 select-none">
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
              class="!bg-white dark:!bg-secondary-950 !border-secondary-200 dark:!border-secondary-800 dark:!text-white focus:!ring-primary-500/30"
            />

            <hr class="border-secondary-100 dark:border-secondary-800 my-2" />

            <div class="flex flex-col gap-1">
              <h3 class="text-sm font-bold text-secondary-700 dark:text-secondary-200">Ubah Kata Sandi (Opsional)</h3>
              <p class="text-xs text-secondary-400 dark:text-secondary-200">
                Kosongkan kolom di bawah jika Anda tidak ingin mengubah kata sandi.
              </p>
            </div>

            <div class="relative">
              <Input
                type={showPassword() ? 'text' : 'password'}
                label="Kata Sandi Baru"
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
                disabled={loading()}
                class="!bg-white dark:!bg-secondary-950 !border-secondary-200 dark:!border-secondary-800 dark:!text-white focus:!ring-primary-500/30 !pr-12"
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

            <div class="relative">
              <Input
                type={showConfirmPassword() ? 'text' : 'password'}
                label="Konfirmasi Kata Sandi Baru"
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                disabled={loading()}
                class="!bg-white dark:!bg-secondary-950 !border-secondary-200 dark:!border-secondary-800 dark:!text-white focus:!ring-primary-500/30 !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword())}
                class="absolute right-3 top-[38px] text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors focus:outline-none"
                tabindex={-1}
              >
                {showConfirmPassword() ? (
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
