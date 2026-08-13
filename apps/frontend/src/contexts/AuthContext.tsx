import { createContext, createEffect, createSignal, JSX, useContext } from 'solid-js';
import { API_URL } from '../utils/api';

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
}

export type UserRole = User['role'];

interface AuthContextType {
  user: () => User | null;
  token: () => string | null;
  isAuthenticated: () => boolean;
  login: (token: string, user: User) => void;
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
  const [token, setToken] = createSignal<string | null>(null);
  const [localTheme, setLocalTheme] = createSignal(localStorage.getItem('theme') || 'light');

  // Initialize from localStorage
  const localToken = localStorage.getItem('token');
  const localUser = localStorage.getItem('user');
  if (localToken && localUser) {
    setToken(localToken);
    try {
      const parsedUser = JSON.parse(localUser);
      setUser(parsedUser);
      if (parsedUser.theme) {
        setLocalTheme(parsedUser.theme);
      }
    } catch (_) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  // Theme is reactively handled by ThemeProvider

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    if (newUser.theme) {
      setLocalTheme(newUser.theme);
      localStorage.setItem('theme', newUser.theme);
    }
  };

  const updateUser = (updatedFields: Partial<User>) => {
    const current = user();
    if (current) {
      const updated = { ...current, ...updatedFields };
      setUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
    }
  };

  const logout = () => {
    const currentToken = token();
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (currentToken) {
      void fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` },
        credentials: 'include',
      }).catch(() => {
        // Logout audit recording is best-effort; ignore failures.
      });
    }
  };

  const setTheme = (newTheme: string) => {
    setLocalTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const theme = () => user()?.theme || localTheme();
  const isAuthenticated = () => !!token();
  const hasRole = (allowedRoles: UserRole[]) => {
    const current = user();
    if (!current) return false;
    const roles = current.roles && current.roles.length > 0 ? current.roles : [current.role];
    return roles.some((r) => allowedRoles.includes(r));
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, updateUser, theme, setTheme, hasRole }}>
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
