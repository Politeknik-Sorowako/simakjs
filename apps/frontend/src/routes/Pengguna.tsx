import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { ExportButtonGroup } from '../components/reports/ExportButton';
import { Button } from '../components/ui/Button';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { UserItem, userController } from '../controllers/userController';
import { usePagination } from '../hooks/usePagination';
import { ExportColumn } from '../utils/export';

export default function Pengguna() {
  const toast = useToast();
  const auth = useAuth();
  const currentUser = () => auth.user();

  const { page, limit, setPage, setLimit, resetPage, search, setSearch } = usePagination();
  const [actionLoading, setActionLoading] = createSignal<number | null>(null);
  const [showImportModal, setShowImportModal] = createSignal(false);

  const exportColumns: ExportColumn[] = [
    { header: 'ID', accessor: (row: UserItem) => row.id },
    { header: 'Nama', accessor: (row: UserItem) => row.nama },
    { header: 'Email', accessor: (row: UserItem) => row.email },
    { header: 'Role', accessor: (row: UserItem) => row.role },
  ];

  const [usersRes, { refetch }] = createResource(
    () => ({ page: page(), limit: limit(), search: search() }),
    async ({ page, limit, search }) => {
      return userController.getAll(page, limit, search);
    },
  );

  const [sortBy, setSortBy] = createSignal('nama');
  const [sortOrder, setSortOrder] = createSignal<'asc' | 'desc'>('asc');
  const toggleSort = (field: string) => {
    if (sortBy() === field) setSortOrder(sortOrder() === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };
  const sortedData = () => {
    const data = usersRes()?.data || [];
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const bVal = (b as unknown as Record<string, unknown>)[sortBy()] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal), 'id');
      return sortOrder() === 'asc' ? cmp : -cmp;
    });
  };

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
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengubah status aktif', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  let debounceTimer: ReturnType<typeof setTimeout>;
  const handleSearchInput = (e: Event) => {
    clearTimeout(debounceTimer);
    const val = (e.currentTarget as HTMLInputElement).value;
    debounceTimer = setTimeout(() => {
      resetPage();
      setSearch(val);
    }, 400);
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-extrabold text-secondary-800 tracking-tight dark:text-white">
              Manajemen Pengguna
            </h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-200">
              Aktivasi akun, pencarian, dan manajemen otorisasi peran (role) pengguna SIMAK.
            </p>
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="w-full md:w-72">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                onInput={handleSearchInput}
                class="w-full rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm text-secondary-900 focus:border-brand-500 focus:outline-none shadow-sm dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              />
            </div>
            <ExportButtonGroup
              onFetchAll={async () => {
                const res = await userController.getAll(1, 10000, search());
                return res.data;
              }}
              columns={exportColumns}
              filename={`Pengguna_${new Date().toISOString().split('T')[0]}`}
              title="Daftar Pengguna"
              subtitle="Data Pengguna SIMAK Vokasi"
            />
            <Button variant="secondary" onClick={() => setShowImportModal(true)}>
              📥 Impor Pengguna
            </Button>
          </div>
        </div>

        <ImportCsvModal
          show={showImportModal()}
          onClose={() => setShowImportModal(false)}
          importUrl="/users/import"
          templateHeaders={['email', 'nama', 'role']}
          title="Pengguna"
          onSuccess={() => refetch()}
        />

        <Show when={usersRes.loading}>
          <div class="flex justify-center py-12 text-secondary-400 dark:text-secondary-200">
            Memuat data pengguna...
          </div>
        </Show>

        <Show when={!usersRes.loading && usersRes()}>
          <div class="bg-white rounded-xl shadow-sm border border-secondary-100 overflow-hidden dark:bg-secondary-900 dark:border-secondary-800">
            <Table
              headers={[
                <SortableHeader field="nama" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Nama
                </SortableHeader>,
                <SortableHeader field="email" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Email
                </SortableHeader>,
                <SortableHeader field="role" sortBy={sortBy()} sortOrder={sortOrder()} onSort={toggleSort}>
                  Role / Peran
                </SortableHeader>,
                'Status',
                'Aksi',
              ]}
            >
              <For each={sortedData()}>
                {(user) => (
                  <tr class="hover:bg-secondary-50/50 transition-colors dark:hover:bg-secondary-800/50">
                    <td class="whitespace-nowrap px-6 py-4 font-semibold text-secondary-800 dark:text-white">
                      {user.nama}
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-secondary-500 dark:text-secondary-200">{user.email}</td>
                    <td class="whitespace-nowrap px-6 py-4 text-secondary-600 dark:text-secondary-200">
                      <select
                        class="rounded-md border border-secondary-300 bg-white px-2 py-1 text-xs font-medium text-secondary-700 focus:border-brand-500 focus:outline-none shadow-sm dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
                        value={user.role}
                        onChange={async (e) => {
                          const newRole = e.currentTarget.value;
                          try {
                            await userController.updateRole(user.id, newRole);
                            toast.showToast('Peran pengguna berhasil diperbarui', 'success');
                            refetch();
                          } catch (err: unknown) {
                            toast.showToast((err as Error).message || 'Gagal memperbarui peran', 'error');
                            e.currentTarget.value = user.role;
                          }
                        }}
                        disabled={user.id === currentUser()?.id}
                      >
                        <option value="mahasiswa">Mahasiswa</option>
                        <option value="dosen">Dosen</option>
                        <option value="admin">Admin</option>
                        <option value="prodi">Prodi</option>
                        <option value="keuangan">Keuangan</option>
                        <option value="calon_mahasiswa">Calon Mahasiswa</option>
                        <option value="guest">Guest</option>
                      </select>
                    </td>
                    <td class="whitespace-nowrap px-6 py-4">
                      <Show
                        when={user.isActive}
                        fallback={
                          <span class="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10 dark:bg-red-900/30 dark:text-red-400">
                            Belum Aktif
                          </span>
                        }
                      >
                        <span class="inline-flex items-center rounded-md bg-accent-50 px-2 py-1 text-xs font-medium text-accent-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-accent-900/30 dark:text-accent-400">
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
                      <Button
                        variant="secondary"
                        disabled={user.id === currentUser()?.id}
                        onClick={async () => {
                          const newPw = prompt('Masukkan password baru (min 6 karakter):');
                          if (!newPw || newPw.length < 6) return;
                          try {
                            const res = await userController.resetPassword(user.id, newPw);
                            toast.showToast(res.message, 'success');
                          } catch (err: unknown) {
                            toast.showToast((err as Error).message, 'error');
                          }
                        }}
                      >
                        Reset Password
                      </Button>
                    </td>
                  </tr>
                )}
              </For>
            </Table>

            <Pagination
              currentPage={page()}
              totalPages={usersRes()?.meta?.totalPages || 1}
              total={usersRes()?.meta?.total || 0}
              limit={limit()}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
