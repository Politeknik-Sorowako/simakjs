import { useNavigate, useSearchParams } from '@solidjs/router';
import { createEffect, createSignal, Show } from 'solid-js';
import logoImg from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';

export default function GoogleCallback() {
  const auth = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const [errorMsg, setErrorMsg] = createSignal('');
  const [loading, setLoading] = createSignal(true);

  createEffect(async () => {
    const code = searchParams.code;
    const error = searchParams.error;

    if (error) {
      setErrorMsg(`Autentikasi Google dibatalkan atau ditolak: ${error}`);
      toast.showToast(`Autentikasi Google gagal: ${error}`, 'error');
      setLoading(false);
      return;
    }

    if (!code) {
      setErrorMsg('Kode otorisasi Google tidak ditemukan pada URL');
      toast.showToast('Kode otorisasi tidak valid', 'error');
      setLoading(false);
      return;
    }

    try {
      const response = await authController.handleGoogleCallback(code);
      auth.login(response.token, response.user);
      toast.showToast('Login Google Workspace berhasil!', 'success');

      if (response.user.role === 'calon_mahasiswa') {
        navigate('/admisi/dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses autentikasi Google SSO';
      setErrorMsg(msg);
      toast.showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-secondary-100 via-secondary-50 to-brand-50 dark:from-secondary-950 dark:via-primary-950 dark:to-secondary-950 px-4">
      <div class="w-full max-w-md bg-white dark:bg-secondary-900/60 dark:backdrop-blur-xl border border-secondary-200/80 dark:border-white/10 p-8 rounded-2xl shadow-xl flex flex-col items-center gap-6 text-center text-secondary-800 dark:text-white">
        <img src={logoImg} alt="Logo" class="w-16 h-16 object-contain" />

        <Show
          when={!loading()}
          fallback={
            <div class="flex flex-col items-center gap-4 py-4">
              <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <h3 class="text-lg font-bold">Memverifikasi Akun Google...</h3>
                <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-1">
                  Mohon tunggu sebentar, sedang menukar sesi login Google Workspace.
                </p>
              </div>
            </div>
          }
        >
          <Show when={errorMsg()}>
            <div class="flex flex-col gap-4 w-full">
              <div class="p-4 rounded-xl text-sm font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {errorMsg()}
              </div>

              <button
                type="button"
                onClick={() => navigate('/login', { replace: true })}
                class="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all focus:outline-none shadow-md"
              >
                Kembali ke Halaman Login
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
