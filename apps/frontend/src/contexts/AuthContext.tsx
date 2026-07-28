import { createContext, createEffect, createSignal, JSX, useContext } from 'solid-js';

export interface User {
  id: number;
  email: string;
  nama: string;
  role: 'admin' | 'dosen' | 'mahasiswa' | 'prodi' | 'keuangan' | 'guest' | 'calon_mahasiswa';
  theme?: string;
  avatar?: string;
}

interface AuthContextType {
  user: () => User | null;
  token: () => string | null;
  isAuthenticated: () => boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  theme: () => string;
  setTheme: (newTheme: string) => void;
}

const AuthContext = createContext<AuthContextType>();

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

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const setTheme = (newTheme: string) => {
    setLocalTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const theme = () => user()?.theme || localTheme();
  const isAuthenticated = () => !!token();

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout, theme, setTheme }}>
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
