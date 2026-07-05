import { useNavigate } from '@solidjs/router';
import { createEffect, JSX, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles?: ('admin' | 'dosen' | 'mahasiswa' | 'prodi' | 'keuangan' | 'guest')[];
}

export function ProtectedRoute(props: ProtectedRouteProps) {
  const auth = useAuth();
  const navigate = useNavigate();

  createEffect(() => {
    if (!auth.isAuthenticated()) {
      navigate('/login', { replace: true });
    }
  });

  const hasAccess = () => {
    if (!auth.isAuthenticated()) return false;
    const userRole = auth.user()?.role;
    if (!props.allowedRoles) return true;
    return props.allowedRoles.includes(userRole as any);
  };

  return (
    <Show
      when={hasAccess()}
      fallback={
        <div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-white rounded-2xl border border-brand-gray-100 shadow-md">
          <svg class="w-16 h-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <h2 class="text-xl font-bold text-brand-gray-800 mb-2">Akses Ditolak</h2>
          <p class="text-brand-gray-500 mb-4">Anda tidak memiliki hak untuk mengakses halaman ini.</p>
          <button
            onClick={() => navigate('/dashboard')}
            class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-semibold transition-colors"
          >
            Kembali ke Dashboard
          </button>
        </div>
      }
    >
      {props.children}
    </Show>
  );
}
