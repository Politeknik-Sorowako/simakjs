import { createContext, createEffect, createSignal, JSX, onCleanup, onMount, useContext } from 'solid-js';
import { API_URL } from '../utils/api';
import { useToast } from './ToastContext';

interface MeResponse {
  user: User | null;
  exp: number | null;
}

async function fetchMe(): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${API_URL}/auth/me`, { method: 'GET', credentials: 'include' });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: User | null; exp?: number | null };
    return { user: data.user ?? null, exp: typeof data.exp === 'number' ? data.exp : null };
  } catch {
    return null;
  }
}

export interface User {
  id: number;
  email: string;
  nama: string;
  role:
    | 'super_admin'
    | 'admin'
    | 'kaprodi'
    | 'dosen'
    | 'mahasiswa'
    | 'prodi'
    | 'keuangan'
    | 'guest'
    | 'calon_mahasiswa'
    | 'plp'
    | 'instruktur';
  roles?: User['role'][];
  mustChangePassword?: boolean;
  theme?: string;
  avatar?: string;
  twoFactorEnabled?: boolean;
}

export type UserRole = User['role'];

interface AuthContextType {
  user: () => User | null;
  isAuthenticated: () => boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  theme: () => string;
  setTheme: (newTheme: string) => void;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType>();

export const SINGLE_ROLE_ONLY: UserRole[] = ['super_admin', 'mahasiswa', 'guest', 'calon_mahasiswa'];
export const MULTI_ROLE_ALLOWED: UserRole[] = ['admin', 'kaprodi', 'prodi', 'dosen', 'keuangan', 'plp', 'instruktur'];
export const ALL_ROLES: UserRole[] = [...SINGLE_ROLE_ONLY, ...MULTI_ROLE_ALLOWED];

export function AuthProvider(props: { children: JSX.Element }) {
  const [user, setUser] = createSignal<User | null>(null);
  const [sessionExp, setSessionExp] = createSignal<number | null>(null);
  const [bootstrapped, setBootstrapped] = createSignal(false);
  const [localTheme, setLocalTheme] = createSignal(localStorage.getItem('theme') || 'light');
  const toast = useToast();

  const login = (newUser: User) => {
    setUser(newUser);
    if (newUser.theme) {
      setLocalTheme(newUser.theme);
      localStorage.setItem('theme', newUser.theme);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    const current = user();
    if (current) {
      setUser({ ...current, ...updatedFields });
    }
  };

  const logout = () => {
    setUser(null);
    setSessionExp(null);
    void fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => {
      // Logout audit recording is best-effort; ignore failures.
    });
  };

  // --- Sesi idle timeout (sliding): logout otomatis saat token kedaluwarsa. ---
  const IDLE_WARN_MS = 5 * 60 * 1000;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let warnTimer: ReturnType<typeof setTimeout> | undefined;

  const clearSessionTimers = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (warnTimer) clearTimeout(warnTimer);
    idleTimer = undefined;
    warnTimer = undefined;
  };

  const scheduleSessionTimeout = () => {
    clearSessionTimers();
    const exp = sessionExp();
    if (exp === null) return;
    const remainingMs = exp * 1000 - Date.now();
    if (remainingMs <= 0) {
      logout();
      window.location.href = '/login';
      return;
    }
    const warnMs = remainingMs - IDLE_WARN_MS;
    if (warnMs > 0) {
      warnTimer = setTimeout(() => {
        toast.showToast('Sesi Anda akan berakhir dalam 5 menit. Lanjutkan aktivitas untuk tetap masuk.', 'info');
      }, warnMs);
    }
    idleTimer = setTimeout(() => {
      logout();
      window.location.href = '/login';
    }, remainingMs);
  };

  const onTokenRefresh = (e: Event) => {
    const detail = (e as CustomEvent<{ exp?: number }>).detail;
    if (typeof detail?.exp === 'number' && Number.isFinite(detail.exp)) {
      setSessionExp(detail.exp);
    }
  };

  const resetIdle = () => scheduleSessionTimeout();

  onMount(async () => {
    const me = await fetchMe();
    if (me && me.user) {
      setUser(me.user);
      setSessionExp(me.exp);
      if (me.user.theme) setLocalTheme(me.user.theme);
    }
    setBootstrapped(true);

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    for (const ev of events) window.addEventListener(ev, resetIdle);
    window.addEventListener('simak:token-refresh', onTokenRefresh);
    if (sessionExp() !== null) scheduleSessionTimeout();
  });

  onCleanup(() => {
    clearSessionTimers();
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    for (const ev of events) window.removeEventListener(ev, resetIdle);
    window.removeEventListener('simak:token-refresh', onTokenRefresh);
  });

  createEffect(() => {
    void sessionExp();
    void bootstrapped();
    scheduleSessionTimeout();
  });

  const setTheme = (newTheme: string) => {
    setLocalTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const theme = () => user()?.theme || localTheme();
  const isAuthenticated = () => bootstrapped() && !!user();
  const hasRole = (allowedRoles: UserRole[]) => {
    const current = user();
    if (!current) return false;
    const roles = current.roles && current.roles.length > 0 ? current.roles : [current.role];
    return roles.some((r) => allowedRoles.includes(r));
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, updateUser, theme, setTheme, hasRole }}>
      {props.children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
