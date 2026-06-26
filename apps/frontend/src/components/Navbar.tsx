import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/Button';

export function Navbar() {
  const auth = useAuth();

  return (
    <header class="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-8 shadow-sm">
      <div class="flex items-center gap-4">
        {/* Dynamic header / breadcrumb context if desired, or left blank */}
        <h2 class="text-lg font-bold text-gray-800">Sistem Informasi Akademik</h2>
      </div>

      <div class="flex items-center gap-4">
        <span class="text-xs bg-gray-100 border border-gray-200 px-3 py-1 rounded-full text-gray-600 font-semibold uppercase tracking-wider">
          {auth.user()?.role}
        </span>
        <Button variant="danger" onClick={auth.logout} class="!py-1.5 !px-3 shadow-none">
          Logout
        </Button>
      </div>
    </header>
  );
}
