import { createEffect, createSignal, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';
import { userController } from '../controllers/userController';

export default function Profil() {
  const auth = useAuth();
  const toast = useToast();
  const user = () => auth.user();

  const [nama, setNama] = createSignal(user()?.nama || '');
  const [avatar, setAvatar] = createSignal(user()?.avatar || '');
  const [password, setPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [currentPassword, setCurrentPassword] = createSignal('');
  const [showPassword, setShowPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  const [showCurrentPassword, setShowCurrentPassword] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  // 2FA State Signals
  const [twoFactorEnabled, setTwoFactorEnabled] = createSignal(user()?.twoFactorEnabled || false);
  const [showSetupModal, setShowSetupModal] = createSignal(false);
  const [setupLoading, setSetupLoading] = createSignal(false);
  const [qrCodeUrl, setQrCodeUrl] = createSignal('');
  const [setupSecret, setSetupSecret] = createSignal('');
  const [verifyCode, setVerifyCode] = createSignal('');
  const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);
  const [showRecoveryModal, setShowRecoveryModal] = createSignal(false);

  // Synchronize 2FA state reactively when user signal updates
  createEffect(() => {
    const currentUser = user();
    if (currentUser) {
      setTwoFactorEnabled(!!currentUser.twoFactorEnabled);
    }
  });

  // Disable 2FA Signals
  const [showDisableModal, setShowDisableModal] = createSignal(false);
  const [disablePassword, setDisablePassword] = createSignal('');
  const [disableCode, setDisableCode] = createSignal('');
  const [disableLoading, setDisableLoading] = createSignal(false);

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
      if (!currentPassword()) {
        toast.showToast('Kata sandi saat ini wajib diisi', 'error');
        return;
      }
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
      const res = await userController.updateProfile(
        nama(),
        password() || undefined,
        currentPassword() || undefined,
        undefined,
        avatar() || undefined,
      );
      toast.showToast(res.message, 'success');

      auth.login(localStorage.getItem('token') || '', {
        ...user()!,
        nama: res.user.nama as string,
        avatar: res.user.avatar as string | undefined,
        twoFactorEnabled: (res.user.twoFactorEnabled as boolean) ?? user()?.twoFactorEnabled ?? false,
      });

      setPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStart2FASetup = async () => {
    setSetupLoading(true);
    try {
      const data = await authController.twoFactorSetup();
      setSetupSecret(data.secret);
      setQrCodeUrl(data.qrCodeUrl);
      setShowSetupModal(true);
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memulai setup 2FA', 'error');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirmEnable2FA = async (e: Event) => {
    e.preventDefault();
    if (!verifyCode() || verifyCode().length !== 6) {
      toast.showToast('Masukkan kode 6-digit TOTP yang valid', 'error');
      return;
    }

    setSetupLoading(true);
    try {
      const res = await authController.twoFactorEnable(setupSecret(), verifyCode().trim());
      toast.showToast(res.message, 'success');
      setTwoFactorEnabled(true);
      auth.updateUser({ twoFactorEnabled: true });

      setRecoveryCodes(res.recoveryCodes || []);
      setShowSetupModal(false);
      setShowRecoveryModal(true);
      setVerifyCode('');
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal mengaktifkan 2FA', 'error');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleDisable2FA = async (e: Event) => {
    e.preventDefault();
    if (!disablePassword() || !disableCode()) {
      toast.showToast('Password dan kode 6-digit wajib diisi', 'error');
      return;
    }

    setDisableLoading(true);
    try {
      const res = await authController.twoFactorDisable(disablePassword(), disableCode().trim());
      toast.showToast(res.message, 'success');
      setTwoFactorEnabled(false);
      auth.updateUser({ twoFactorEnabled: false });

      setShowDisableModal(false);
      setDisablePassword('');
      setDisableCode('');
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal menonaktifkan 2FA', 'error');
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6 max-w-xl text-secondary-800 dark:text-white transition-colors duration-200">
        <div class="flex flex-col gap-1">
          <h1 class="text-2xl font-extrabold tracking-tight">Profil Saya</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Perbarui informasi profil, keamanan, dan foto Anda.
          </p>
        </div>

        {/* Profile Card */}
        <div class="bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 p-6 transition-colors duration-200">
          <form onSubmit={handleUpdateProfile} class="flex flex-col gap-5">
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
                type={showCurrentPassword() ? 'text' : 'password'}
                label="Kata Sandi Saat Ini"
                value={currentPassword()}
                onInput={(e) => setCurrentPassword(e.currentTarget.value)}
                disabled={loading()}
                class="!bg-white dark:!bg-secondary-950 !border-secondary-200 dark:!border-secondary-800 dark:!text-white focus:!ring-primary-500/30 !pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword())}
                class="absolute right-3 top-[38px] text-secondary-400 dark:text-secondary-500 hover:text-secondary-600 dark:hover:text-secondary-300 transition-colors focus:outline-none"
                tabindex={-1}
              >
                {showCurrentPassword() ? (
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 008.354-5.646z"
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

        {/* 2FA Security Card */}
        <div class="bg-white dark:bg-secondary-900 rounded-xl shadow-sm border border-secondary-100 dark:border-secondary-800 p-6 transition-colors duration-200">
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-bold text-secondary-800 dark:text-white">Autentikasi Dua Faktor (2FA)</h2>
                <p class="text-xs text-secondary-500 dark:text-secondary-300">
                  Amankan akun Anda dengan Google Authenticator atau Authy.
                </p>
              </div>
              <span
                class={`px-3 py-1 rounded-full text-xs font-bold ${
                  twoFactorEnabled()
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                    : 'bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-400'
                }`}
              >
                {twoFactorEnabled() ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </div>

            <Show
              when={twoFactorEnabled()}
              fallback={
                <div class="flex flex-col gap-3 p-4 rounded-xl bg-slate-50 dark:bg-secondary-950/40 border border-secondary-200 dark:border-secondary-800/40">
                  <p class="text-xs text-secondary-600 dark:text-secondary-300">
                    2FA memberikan lapisan keamanan ganda saat Anda login dengan meminta kode 6-digit tambahan dari
                    smartphone Anda.
                  </p>
                  <div>
                    <Button onClick={handleStart2FASetup} loading={setupLoading()} class="text-xs px-4 py-2">
                      Aktifkan 2FA Sekarang
                    </Button>
                  </div>
                </div>
              }
            >
              <div class="flex flex-col gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40">
                <p class="text-xs text-emerald-800 dark:text-emerald-200">
                  Akun Anda telah dilindungi dengan 2FA. Setiap login akan memerlukan kode dari aplikasi authenticator
                  Anda.
                </p>
                <div>
                  <Button
                    variant="secondary"
                    onClick={() => setShowDisableModal(true)}
                    class="!bg-rose-100 dark:!bg-rose-950/60 !text-rose-700 dark:!text-rose-300 hover:!bg-rose-200 border !border-rose-300 dark:!border-rose-800 text-xs px-4 py-2"
                  >
                    Nonaktifkan 2FA
                  </Button>
                </div>
              </div>
            </Show>
          </div>
        </div>

        {/* 2FA Setup Modal */}
        <Show when={showSetupModal()}>
          <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-secondary-900 rounded-2xl max-w-md w-full p-6 border border-secondary-200 dark:border-secondary-800 shadow-2xl flex flex-col gap-4">
              <h3 class="text-lg font-bold text-secondary-800 dark:text-white">Setup Autentikasi 2FA</h3>
              <p class="text-xs text-secondary-600 dark:text-secondary-300">
                1. Pindai QR Code ini menggunakan <strong>Google Authenticator</strong> atau <strong>Authy</strong> di
                HP Anda.
              </p>

              <div class="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-secondary-200">
                <Show when={qrCodeUrl()}>
                  <img src={qrCodeUrl()} alt="2FA QR Code" class="w-48 h-48 object-contain" />
                </Show>
                <div class="mt-2 text-[11px] font-mono bg-slate-100 p-2 rounded text-slate-800 text-center w-full break-all">
                  Key: <strong>{setupSecret()}</strong>
                </div>
              </div>

              <form onSubmit={handleConfirmEnable2FA} class="flex flex-col gap-4 mt-2">
                <Input
                  type="text"
                  label="2. Masukkan Kode 6-Digit Konfirmasi"
                  placeholder="123456"
                  required
                  value={verifyCode()}
                  onInput={(e) => setVerifyCode(e.currentTarget.value)}
                  class="!bg-secondary-50 dark:!bg-secondary-950 text-center font-mono text-lg tracking-widest"
                />

                <div class="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setShowSetupModal(false)}>
                    Batal
                  </Button>
                  <Button type="submit" loading={setupLoading()}>
                    Aktifkan 2FA
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Show>

        {/* Backup Recovery Codes Display Modal */}
        <Show when={showRecoveryModal()}>
          <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-secondary-900 rounded-2xl max-w-md w-full p-6 border border-secondary-200 dark:border-secondary-800 shadow-2xl flex flex-col gap-4">
              <h3 class="text-lg font-bold text-emerald-600 dark:text-emerald-400">2FA Berhasil Diaktifkan!</h3>
              <p class="text-xs text-secondary-600 dark:text-secondary-300">
                Simpan <strong>Kode Pemulihan Backup</strong> di bawah ini di tempat yang aman. Anda dapat
                menggunakannya untuk login jika kehilangan akses ke smartphone Anda. Setiap kode hanya berlaku 1 kali.
              </p>

              <div class="grid grid-cols-2 gap-2 p-4 bg-slate-100 dark:bg-secondary-950 rounded-xl font-mono text-xs text-slate-800 dark:text-slate-200">
                {recoveryCodes().map((code) => (
                  <div class="p-1.5 bg-white dark:bg-secondary-900 rounded text-center border border-slate-200 dark:border-slate-800 font-bold">
                    {code}
                  </div>
                ))}
              </div>

              <div class="flex justify-end">
                <Button
                  onClick={() => {
                    setShowRecoveryModal(false);
                    setRecoveryCodes([]);
                  }}
                >
                  Saya Sudah Menyimpan Kode Ini
                </Button>
              </div>
            </div>
          </div>
        </Show>

        {/* Disable 2FA Modal */}
        <Show when={showDisableModal()}>
          <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-secondary-900 rounded-2xl max-w-md w-full p-6 border border-secondary-200 dark:border-secondary-800 shadow-2xl flex flex-col gap-4">
              <h3 class="text-lg font-bold text-rose-600 dark:text-rose-400">Konfirmasi Nonaktifkan 2FA</h3>
              <p class="text-xs text-secondary-600 dark:text-secondary-300">
                Masukkan kata sandi dan kode 6-digit authenticator Anda saat ini untuk menonaktifkan 2FA.
              </p>

              <form onSubmit={handleDisable2FA} class="flex flex-col gap-4">
                <Input
                  type="password"
                  label="Kata Sandi Saat Ini"
                  required
                  value={disablePassword()}
                  onInput={(e) => setDisablePassword(e.currentTarget.value)}
                />

                <Input
                  type="text"
                  label="Kode 6-Digit Authenticator"
                  placeholder="123456"
                  required
                  value={disableCode()}
                  onInput={(e) => setDisableCode(e.currentTarget.value)}
                  class="font-mono text-center tracking-widest text-lg"
                />

                <div class="flex justify-end gap-2 mt-2">
                  <Button type="button" variant="secondary" onClick={() => setShowDisableModal(false)}>
                    Batal
                  </Button>
                  <Button type="submit" loading={disableLoading()} class="!bg-rose-600 hover:!bg-rose-700 !text-white">
                    Nonaktifkan 2FA
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
