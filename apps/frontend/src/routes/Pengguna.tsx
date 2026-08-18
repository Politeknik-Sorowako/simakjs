import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { ExportButtonGroup } from '../components/reports/ExportButton';
import { Button } from '../components/ui/Button';
import { DropdownMenu } from '../components/ui/DropdownMenu';
import { ImportCsvModal } from '../components/ui/ImportCsvModal';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SortableHeader } from '../components/ui/SortableHeader';
import { Table } from '../components/ui/Table';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { authController } from '../controllers/authController';
import { prodiController } from '../controllers/prodiController';
import { rbacController, UserRoleType } from '../controllers/rbacController';
import { UserItem, userController } from '../controllers/userController';
import { usePagination } from '../hooks/usePagination';
import { ExportColumn } from '../utils/export';

const fallbackRoleOptions: { value: string; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'kaprodi', label: 'Kaprodi' },
  { value: 'prodi', label: 'Admin Prodi' },
  { value: 'dosen', label: 'Dosen' },
  { value: 'plp', label: 'PLP / Teknisi Lab' },
  { value: 'instruktur', label: 'Instruktur' },
  { value: 'keuangan', label: 'Keuangan' },
  { value: 'mahasiswa', label: 'Mahasiswa' },
  { value: 'calon_mahasiswa', label: 'Calon Mahasiswa' },
  { value: 'guest', label: 'Guest' },
];

export default function Pengguna() {
  const toast = useToast();
  const auth = useAuth();
  const currentUser = () => auth.user();

  const hasScopeRoles = (role: string, roles?: string[]) => {
    const list = roles && roles.length > 0 ? roles : [role];
    return list.some((r) => r === 'admin' || r === 'prodi' || r === 'super_admin');
  };

  const { page, limit, setPage, setLimit, resetPage, search, setSearch } = usePagination();
  const [actionLoading, setActionLoading] = createSignal<number | null>(null);
  const [clearingEmail, setClearingEmail] = createSignal<string | null>(null);
  const [showImportModal, setShowImportModal] = createSignal(false);

  // New User Form Modal State
  const [showAddModal, setShowAddModal] = createSignal(false);
  const [newEmail, setNewEmail] = createSignal('');
  const [newNama, setNewNama] = createSignal('');
  const [newPassword, setNewPassword] = createSignal('');
  const [newRole, setNewRole] = createSignal('mahasiswa');
  const [newProdiIds, setNewProdiIds] = createSignal<number[]>([]);

  // Roles Modal State
  const [showRolesModal, setShowRolesModal] = createSignal(false);
  const [targetRolesUser, setTargetRolesUser] = createSignal<UserItem | null>(null);
  const [selectedRoles, setSelectedRoles] = createSignal<string[]>([]);

  // Scope Prodi Modal State
  const [showScopeModal, setShowScopeModal] = createSignal(false);
  const [targetScopeUser, setTargetScopeUser] = createSignal<UserItem | null>(null);
  const [selectedProdiIds, setSelectedProdiIds] = createSignal<number[]>([]);

  // Fetch Program Studi list
  const [prodis] = createResource(async () => {
    try {
      const res = await prodiController.getAll(undefined, 1, 100);
      return res.data;
    } catch {
      return [];
    }
  });

  // Fetch configurable role types (SuperAdmin excluded from config)
  const [roleTypes] = createResource(async () => {
    try {
      const res = await rbacController.getRoleTypes();
      return res.data;
    } catch {
      return null;
    }
  });

  const roleOptions = (): { value: string; label: string }[] => {
    const configured = roleTypes();
    if (configured && configured.length > 0) {
      return configured
        .filter((r: UserRoleType) => r.isActive && r.roleValue !== 'super_admin')
        .map((r: UserRoleType) => ({ value: r.roleValue, label: r.name }));
    }
    return fallbackRoleOptions;
  };

  const exportColumns: ExportColumn[] = [
    { header: 'ID', accessor: 'id' },
    { header: 'Nama', accessor: 'nama' },
    { header: 'Email', accessor: 'email' },
    { header: 'Role', accessor: 'role' },
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

  const handleCreateUser = async (e: Event) => {
    e.preventDefault();
    try {
      await userController.createUser({
        email: newEmail(),
        nama: newNama(),
        password: newPassword(),
        role: newRole(),
        roles: [newRole()],
        prodiIds: newProdiIds(),
      });
      toast.showToast('Pengguna baru berhasil ditambahkan', 'success');
      setShowAddModal(false);
      setNewEmail('');
      setNewNama('');
      setNewPassword('');
      setNewRole('mahasiswa');
      setNewProdiIds([]);
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal menambahkan pengguna', 'error');
    }
  };

  const handleSaveScope = async () => {
    const user = targetScopeUser();
    if (!user) return;
    try {
      await userController.updateProdiScope(user.id, selectedProdiIds());
      toast.showToast('Cakupan program studi berhasil diperbarui', 'success');
      setShowScopeModal(false);
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui cakupan prodi', 'error');
    }
  };

  const handleSaveRoles = async () => {
    const user = targetRolesUser();
    if (!user) return;
    setActionLoading(user.id);
    try {
      const res = await userController.updateRoles(user.id, selectedRoles());
      toast.showToast(res.message, 'success');
      setShowRolesModal(false);
      refetch();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal memperbarui peran', 'error');
    } finally {
      setActionLoading(null);
    }
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

  const handleForcePasswordChange = async (user: UserItem) => {
    const targetState = !user.mustChangePassword;
    setActionLoading(user.id);
    try {
      const res = await userController.forcePasswordChange(user.id, targetState);
      toast.showToast(res.message, 'success');
      refetch();
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal mengubah status wajib ganti password', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearRateLimit = async (email: string) => {
    if (!window.confirm(`Bersihkan rate limit login untuk ${email}?`)) return;
    setClearingEmail(email);
    try {
      const res = await authController.clearRateLimit(email);
      toast.showToast(res.message, 'success');
    } catch (e: unknown) {
      toast.showToast((e as Error).message || 'Gagal membersihkan rate limit', 'error');
    } finally {
      setClearingEmail(null);
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
              Aktivasi akun, pencarian, manajemen cakupan prodi, dan otorisasi peran (role) pengguna SIMAK.
            </p>
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto flex-wrap">
            <div class="w-full md:w-64">
              <input
                type="text"
                placeholder="Cari nama atau email..."
                onInput={handleSearchInput}
                class="w-full rounded-lg border border-secondary-300 bg-white px-4 py-2 text-sm text-secondary-900 focus:border-brand-500 focus:outline-none shadow-sm dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              />
            </div>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              + Tambah Pengguna
            </Button>
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
                'Scope Prodi',
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
                      <div class="flex items-center gap-1.5 flex-wrap max-w-[240px]">
                        <For each={user.roles || [user.role]}>
                          {(r) => (
                            <span class="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-700/10 dark:bg-brand-900/30 dark:text-brand-300">
                              {r === 'super_admin'
                                ? 'Super Admin'
                                : r === 'prodi'
                                  ? 'Admin Prodi'
                                  : r.charAt(0).toUpperCase() + r.slice(1).replace('_', ' ')}
                            </span>
                          )}
                        </For>
                        <Button
                          variant="secondary"
                          class="!py-0.5 !px-1.5 !text-[10px]"
                          disabled={user.id === currentUser()?.id}
                          onClick={() => {
                            setTargetRolesUser(user);
                            setSelectedRoles(user.roles || [user.role]);
                            setShowRolesModal(true);
                          }}
                        >
                          ✎ Edit
                        </Button>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-xs">
                      <Show
                        when={hasScopeRoles(user.role, user.roles)}
                        fallback={<span class="text-secondary-400 font-mono">-</span>}
                      >
                        <div class="flex items-center gap-1 flex-wrap max-w-xs">
                          <Show
                            when={(user.prodiIds || []).length > 0}
                            fallback={<span class="text-secondary-400 italic">Semua / Belum diatur</span>}
                          >
                            <For each={user.prodiIds || []}>
                              {(pId) => {
                                const pr = (prodis() || []).find((p) => p.id === pId);
                                return (
                                  <span class="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-700/10 dark:bg-brand-900/30 dark:text-brand-300">
                                    {pr?.kode || pId}
                                  </span>
                                );
                              }}
                            </For>
                          </Show>
                          <Button
                            variant="secondary"
                            class="!py-0.5 !px-1.5 !text-[10px]"
                            onClick={() => {
                              setTargetScopeUser(user);
                              setSelectedProdiIds(user.prodiIds || []);
                              setShowScopeModal(true);
                            }}
                          >
                            ⚙️ Edit Scope
                          </Button>
                        </div>
                      </Show>
                    </td>
                    <td class="whitespace-nowrap px-6 py-4">
                      <div class="flex items-center gap-1.5 flex-wrap">
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
                        <Show when={user.mustChangePassword}>
                          <span class="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-400">
                            Wajib Ganti PW
                          </span>
                        </Show>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-6 py-4 text-sm font-medium">
                      <DropdownMenu
                        triggerAriaLabel={`Aksi untuk ${user.nama}`}
                        trigger={
                          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="2"
                              d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                            />
                          </svg>
                        }
                        position="right"
                        items={[
                          {
                            label: user.isActive ? 'Nonaktifkan' : 'Aktifkan',
                            icon: '⏻',
                            danger: user.isActive,
                            disabled: actionLoading() === user.id || user.id === currentUser()?.id,
                            loading: actionLoading() === user.id,
                            onClick: () => handleToggleActive(user),
                          },
                          {
                            label: user.mustChangePassword ? 'Batalkan Wajib PW' : 'Wajibkan Ganti PW',
                            icon: '🔑',
                            disabled: actionLoading() === user.id || user.id === currentUser()?.id,
                            loading: actionLoading() === user.id,
                            onClick: () => handleForcePasswordChange(user),
                          },
                          {
                            separator: true,
                            label: '',
                          },
                          {
                            label: 'Reset Password',
                            icon: '🔄',
                            disabled: user.id === currentUser()?.id,
                            onClick: async () => {
                              const newPw = prompt('Masukkan password baru (min 6 karakter):');
                              if (!newPw || newPw.length < 6) return;
                              try {
                                const res = await userController.resetPassword(user.id, newPw);
                                toast.showToast(res.message, 'success');
                                refetch();
                              } catch (err: unknown) {
                                toast.showToast((err as Error).message, 'error');
                              }
                            },
                          },
                          {
                            label: 'Bersihkan Rate Limit',
                            icon: '🧹',
                            disabled: clearingEmail() === user.email,
                            loading: clearingEmail() === user.email,
                            onClick: () => handleClearRateLimit(user.email),
                          },
                        ]}
                      />
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

      {/* Modal Tambah Pengguna Baru */}
      <Modal title="Tambah Pengguna Baru" show={showAddModal()} onClose={() => setShowAddModal(false)}>
        <form onSubmit={handleCreateUser} class="flex flex-col gap-4">
          <Input
            label="Nama Lengkap"
            placeholder="Masukkan nama pengguna"
            value={newNama()}
            onInput={(e) => setNewNama(e.currentTarget.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="nama@domain.ac.id"
            value={newEmail()}
            onInput={(e) => setNewEmail(e.currentTarget.value)}
            required
          />
          <Input
            label="Password awal"
            type="password"
            placeholder="Min 6 karakter"
            value={newPassword()}
            onInput={(e) => setNewPassword(e.currentTarget.value)}
            required
          />
          <div>
            <label class="block text-xs font-semibold text-secondary-600 mb-1 dark:text-secondary-200">
              Role / Peran
            </label>
            <select
              class="w-full rounded-lg border border-secondary-300 bg-white px-3 py-2 text-sm text-secondary-900 focus:border-brand-500 focus:outline-none dark:border-secondary-700 dark:bg-secondary-900 dark:text-white"
              value={newRole()}
              onChange={(e) => setNewRole(e.currentTarget.value)}
            >
              <Show when={auth.hasRole(['super_admin'])}>
                <option value="super_admin">Super Admin</option>
              </Show>
              <For each={roleOptions()}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
            </select>
          </div>

          <Show when={newRole() === 'admin' || newRole() === 'prodi'}>
            <div>
              <label class="block text-xs font-semibold text-secondary-600 mb-1 dark:text-secondary-200">
                Cakupan Multi-Prodi
              </label>
              <div class="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border p-2 rounded-lg dark:border-secondary-700">
                <For each={prodis() || []}>
                  {(pr) => (
                    <label class="flex items-center gap-2 text-xs text-secondary-700 dark:text-secondary-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProdiIds().includes(pr.id)}
                        onChange={(e) => {
                          if (e.currentTarget.checked) {
                            setNewProdiIds([...newProdiIds(), pr.id]);
                          } else {
                            setNewProdiIds(newProdiIds().filter((id) => id !== pr.id));
                          }
                        }}
                      />
                      <span>
                        [{pr.kode}] {pr.nama}
                      </span>
                    </label>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <div class="flex justify-end gap-3 mt-4">
            <Button variant="secondary" onClick={() => setShowAddModal(false)} type="button">
              Batal
            </Button>
            <Button variant="primary" type="submit">
              Simpan Pengguna
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Scope Prodi */}
      <Modal
        title={`Atur Scope Multi-Prodi — ${targetScopeUser()?.nama || ''}`}
        show={showScopeModal()}
        onClose={() => setShowScopeModal(false)}
      >
        <div class="flex flex-col gap-4">
          <p class="text-xs text-secondary-500 dark:text-secondary-200">
            Pilih satu atau beberapa program studi yang masuk ke dalam cakupan akses pengguna ini:
          </p>
          <div class="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto border p-3 rounded-lg dark:border-secondary-700">
            <For each={prodis() || []}>
              {(pr) => (
                <label class="flex items-center gap-3 text-sm text-secondary-800 dark:text-secondary-200 cursor-pointer p-1.5 hover:bg-secondary-50 rounded dark:hover:bg-secondary-800">
                  <input
                    type="checkbox"
                    checked={selectedProdiIds().includes(pr.id)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setSelectedProdiIds([...selectedProdiIds(), pr.id]);
                      } else {
                        setSelectedProdiIds(selectedProdiIds().filter((id) => id !== pr.id));
                      }
                    }}
                    class="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <div>
                    <span class="font-bold">[{pr.kode}]</span> {pr.nama} ({pr.jenjang})
                  </div>
                </label>
              )}
            </For>
          </div>
          <div class="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setShowScopeModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveScope}>
              Simpan Scope
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Atur Multi Peran */}
      <Modal
        title={`Atur Peran — ${targetRolesUser()?.nama || ''}`}
        show={showRolesModal()}
        onClose={() => setShowRolesModal(false)}
      >
        <div class="flex flex-col gap-3">
          <p class="text-xs text-secondary-500 dark:text-secondary-200">
            Pilih satu atau beberapa peran. Role Mahasiswa/Guest/Calon Mahasiswa tidak dapat dikombinasikan dengan role
            lain.
          </p>
          <div class="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto border p-3 rounded-lg dark:border-secondary-700">
            <For each={roleOptions()}>
              {(r) => (
                <label class="flex items-center gap-2.5 text-sm text-secondary-800 dark:text-secondary-200 cursor-pointer p-1.5 hover:bg-secondary-50 rounded dark:hover:bg-secondary-800">
                  <input
                    type="checkbox"
                    checked={selectedRoles().includes(r.value)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setSelectedRoles([...selectedRoles(), r.value]);
                      } else {
                        setSelectedRoles(selectedRoles().filter((x) => x !== r.value));
                      }
                    }}
                    class="rounded text-brand-600 focus:ring-brand-500 h-4 w-4"
                  />
                  <span>{r.label}</span>
                </label>
              )}
            </For>
          </div>
          <div class="flex justify-end gap-3 mt-2">
            <Button variant="secondary" onClick={() => setShowRolesModal(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleSaveRoles} disabled={selectedRoles().length === 0}>
              Simpan Peran
            </Button>
          </div>
        </div>
      </Modal>
    </MainLayout>
  );
}
