import { createContext, useContext, createSignal, JSX, createEffect } from 'solid-js';

export interface User {
  id: number;
  email: string;
  nama: string;
  role: 'admin' | 'dosen' | 'mahasiswa' | 'prodi' | 'keuangan' | 'guest';
}

interface AuthContextType {
  user: () => User | null;
  token: () => string | null;
  isAuthenticated: () => boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>();

export function AuthProvider(props: { children: JSX.Element }) {
  const [user, setUser] = createSignal<User | null>(null);
  const [token, setToken] = createSignal<string | null>(null);

  // Initialize from localStorage
  const localToken = localStorage.getItem('token');
  const localUser = localStorage.getItem('user');
  if (localToken && localUser) {
    setToken(localToken);
    try {
      setUser(JSON.parse(localUser));
    } catch (_) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAuthenticated = () => !!token();

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, login, logout }}>
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
