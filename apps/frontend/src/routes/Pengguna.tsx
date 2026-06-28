import { createResource, For, Show, createSignal } from 'solid-js';
import { userController, UserItem } from '../controllers/userController';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Table } from '../components/ui/Table';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

export default function Pengguna() {
  const toast = useToast();
  const auth = useAuth();
  const currentUser = () => auth.user();

  const [usersRes, { refetch }] = createResource(userController.getAll);
  const [actionLoading, setActionLoading] = createSignal<number | null>(null);

  const handleToggleActive = async (user: UserItem) => {
    if (user.id === currentUser()?.id) {
      toast.showToast('Anda tidak dapat menonaktifkan akun sendiri', 'error');
      return;
    }

    setActionLoading(user.id);
    try {
      const res = await userController.toggleActive(user.id);
      toast.showToast(res.message, 'success');
      refetch();
    } catch (e: any) {
      toast.showToast(e.message || 'Gagal mengubah status aktif', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex items-center justify-between">
          <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-extrabold text-gray-800 tracking-tight">Manajemen Pengguna</h1>
            <p class="text-sm text-gray-500">Aktivasi akun dan manajemen otorisasi pengguna SIMAK.</p>
          </div>
        </div>

        <Show when={usersRes.loading}>
          <div class="flex justify-center py-12 text-gray-400">Memuat data pengguna...</div>
        </Show>

        <Show when={!usersRes.loading && usersRes()}>
          <Table headers={['Nama', 'Email', 'Role', 'Status', 'Aksi']}>
            <For each={usersRes()?.data}>
              {(user) => (
                <tr class="hover:bg-gray-50/50 transition-colors">
                  <td class="whitespace-nowrap px-6 py-4 font-semibold text-gray-800">
                    {user.nama}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-gray-500">
                    {user.email}
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-gray-600">
                    <span class="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 uppercase">
                      {user.role}
                    </span>
                  </td>
                  <td class="whitespace-nowrap px-6 py-4">
                    <Show
                      when={user.isActive}
                      fallback={
                        <span class="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">
                          Belum Aktif
                        </span>
                      }
                    >
                      <span class="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                        Aktif
                      </span>
                    </Show>
                  </td>
                  <td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    <Button
                      variant={user.isActive ? 'danger' : 'success'}
                      disabled={actionLoading() === user.id || user.id === currentUser()?.id}
                      onClick={() => handleToggleActive(user)}
                    >
                      {actionLoading() === user.id ? 'Memproses...' : user.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                  </td>
                </tr>
              )}
            </For>
          </Table>
        </Show>
      </div>
    </MainLayout>
  );
}
