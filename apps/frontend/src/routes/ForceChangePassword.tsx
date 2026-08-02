import { useNavigate } from '@solidjs/router';
import { createSignal, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { userController } from '../controllers/userController';

export default function ForceChangePassword() {
  const auth = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = createSignal('');
  const [newPassword, setNewPassword] = createSignal('');
  const [confirmPassword, setConfirmPassword] = createSignal('');
  const [showCurrentPassword, setShowCurrentPassword] = createSignal(false);
  const [showNewPassword, setShowNewPassword] = createSignal(false);
  const [showConfirmPassword, setShowConfirmPassword] = createSignal(false);
  const [loading, setLoading] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    if (!currentPassword()) {
      toast.showToast('Kata sandi saat ini wajib diisi', 'error');
      return;
    }
    if (!newPassword() || newPassword().length < 6) {
      toast.showToast('Kata sandi baru minimal harus 6 karakter', 'error');
      return;
    }
    if (newPassword() === currentPassword()) {
      toast.showToast('Kata sandi baru harus berbeda dari kata sandi saat ini', 'error');
      return;
    }
    if (newPassword() !== confirmPassword()) {
      toast.showToast('Konfirmasi kata sandi tidak cocok', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await userController.updateProfile({
        currentPassword: currentPassword(),
        password: newPassword(),
      });

      if (result.error) {
        toast.showToast(result.error, 'error');
      } else {
        toast.showToast('Kata sandi Anda berhasil diperbarui. Selamat datang!', 'success');
        auth.updateUser({ mustChangePassword: false });
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : 'Gagal memperbarui kata sandi', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    auth.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div class="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div class="max-w-md w-full bg-slate-800/90 backdrop-blur-md rounded-2xl p-8 border border-slate-700/80 shadow-2xl">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 002-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 class="text-2xl font-bold text-white mb-2">Pembaruan Kata Sandi Diperlukan</h1>
          <p class="text-sm text-slate-300">
            Demi keamanan akun Anda, silakan buat kata sandi baru sebelum melanjutkan menggunakan SIMAK Vokasi.
          </p>
        </div>

        <form onSubmit={handleSubmit} class="space-y-5">
          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Kata Sandi Saat Ini
            </label>
            <div class="relative">
              <input
                type={showCurrentPassword() ? 'text' : 'password'}
                value={currentPassword()}
                onInput={(e) => setCurrentPassword(e.currentTarget.value)}
                placeholder="Masukkan kata sandi saat ini"
                required
                class="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword())}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                {showCurrentPassword() ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Kata Sandi Baru
            </label>
            <div class="relative">
              <input
                type={showNewPassword() ? 'text' : 'password'}
                value={newPassword()}
                onInput={(e) => setNewPassword(e.currentTarget.value)}
                placeholder="Minimal 6 karakter"
                required
                class="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword())}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                {showNewPassword() ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Konfirmasi Kata Sandi Baru
            </label>
            <div class="relative">
              <input
                type={showConfirmPassword() ? 'text' : 'password'}
                value={confirmPassword()}
                onInput={(e) => setConfirmPassword(e.currentTarget.value)}
                placeholder="Ulangi kata sandi baru"
                required
                class="w-full px-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword())}
                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
              >
                {showConfirmPassword() ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
          </div>

          <div class="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading()}
              class="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all disabled:opacity-50 text-sm flex items-center justify-center"
            >
              <Show when={loading()} fallback="Simpan Kata Sandi Baru & Lanjutkan">
                <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Menyimpan...
              </Show>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              class="w-full py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white font-medium rounded-xl transition-all text-xs"
            >
              Keluar / Logout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
