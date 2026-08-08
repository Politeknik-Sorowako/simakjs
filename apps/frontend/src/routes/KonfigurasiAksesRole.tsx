import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LEVEL_LABELS, LevelState, rbacController, SYSTEM_ACTIONS } from '../controllers/rbacController';

export default function KonfigurasiAksesRole() {
  const [data, { refetch }] = createResource(() => rbacController.getRoleGroups());
  const [roleTypes, { refetch: refetchRoleTypes }] = createResource(() => rbacController.getRoleTypes());

  const roleGroups = () => data()?.data || [];
  const permissions = () => data()?.permissions || [];

  const modules = () => {
    const m = new Set<string>();
    for (const p of permissions()) m.add(p.module);
    return [...m].sort();
  };

  const [tab, setTab] = createSignal<'matrix' | 'role-types'>('matrix');

  const [editMatrix, setEditMatrix] = createSignal<{
    roleGroupId: number;
    name: string;
    values: Record<string, LevelState>;
  } | null>(null);

  const [showCreate, setShowCreate] = createSignal(false);
  const [newName, setNewName] = createSignal('');
  const [newDesc, setNewDesc] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal('');

  const toggleCell = (module: string, level: keyof LevelState) => {
    const cur = editMatrix();
    if (!cur) return;
    const current: LevelState = cur.values[module] || { view: false, edit: false, manage: false };
    setEditMatrix({
      ...cur,
      values: { ...cur.values, [module]: { ...current, [level]: !current[level] } },
    });
  };

  const openMatrix = async (group: { id: number; name: string; isActive: boolean }) => {
    setNotice('');
    setSaving(true);
    try {
      const res = await rbacController.getMatrixByLevel(group.id);
      setEditMatrix({ roleGroupId: group.id, name: group.name, values: res.byModule || {} });
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal memuat matriks.');
    } finally {
      setSaving(false);
    }
  };

  const saveMatrix = async () => {
    const cur = editMatrix();
    if (!cur) return;
    setSaving(true);
    try {
      const res = await rbacController.assignPermissionsByLevel(cur.roleGroupId, cur.values);
      setNotice(`Akses role group berhasil disimpan (${res.permissionCount} izin).`);
      setEditMatrix(null);
      refetch();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal menyimpan akses.');
    } finally {
      setSaving(false);
    }
  };

  const toggleRoleType = async (rt: { id: number; isActive: boolean; isSystem: boolean }) => {
    if (rt.isSystem) {
      setNotice('Role sistem tidak dapat dinonaktifkan.');
      return;
    }
    setSaving(true);
    try {
      await rbacController.toggleRoleType(rt.id, !rt.isActive);
      refetchRoleTypes();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal mengubah status role.');
    } finally {
      setSaving(false);
    }
  };

  const createGroup = async () => {
    if (!newName().trim()) return;
    setSaving(true);
    try {
      await rbacController.createRoleGroup({ name: newName(), description: newDesc() || undefined });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      setNotice('Role group baru berhasil dibuat.');
      refetch();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal membuat role group.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div class="max-w-6xl mx-auto">
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold text-secondary-800 dark:text-secondary-100">
              Pemberian Akses per Role Group
            </h1>
            <p class="text-sm text-secondary-500 dark:text-secondary-400">
              Konfigurasi matriks akses modul dengan level sederhana (Lihat, Edit, Kelola) dan kelola jenis peran
              pengguna.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              class={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab() === 'matrix'
                  ? 'bg-brand-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
              }`}
              onClick={() => setTab('matrix')}
            >
              Matriks Akses
            </button>
            <button
              class={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                tab() === 'role-types'
                  ? 'bg-brand-600 text-white'
                  : 'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-200'
              }`}
              onClick={() => setTab('role-types')}
            >
              Jenis Peran Pengguna
            </button>
          </div>
        </div>

        <Show when={notice()}>
          <div class="mb-4 rounded-xl bg-success-50 border border-success-200 dark:bg-success-900/30 dark:border-success-800 px-4 py-3 text-sm text-success-700 dark:text-success-400">
            {notice()}
          </div>
        </Show>

        <Show when={tab() === 'role-types'}>
          <Card>
            <div class="mb-4">
              <h2 class="text-base font-semibold text-secondary-800 dark:text-secondary-100">Jenis Peran Pengguna</h2>
              <p class="text-xs text-secondary-500 dark:text-secondary-400">
                Mengaktifkan/menonaktifkan pilihan peran yang tersedia di halaman Manajemen Pengguna. Super Admin tidak
                ditampilkan karena memiliki akses tanpa batas.
              </p>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-secondary-200 dark:border-secondary-700">
                    <th class="text-left py-2 pr-4 text-secondary-600 dark:text-secondary-400">Peran</th>
                    <th class="text-left py-2 pr-4 text-secondary-600 dark:text-secondary-400">Nilai</th>
                    <th class="text-left py-2 pr-4 text-secondary-600 dark:text-secondary-400">Deskripsi</th>
                    <th class="text-center py-2 text-secondary-600 dark:text-secondary-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={roleTypes()?.data || []}>
                    {(rt) => (
                      <tr class="border-b border-secondary-100 dark:border-secondary-800">
                        <td class="py-2 pr-4 font-medium text-secondary-800 dark:text-secondary-200">{rt.name}</td>
                        <td class="py-2 pr-4 font-mono text-xs text-secondary-500 dark:text-secondary-400">
                          {rt.roleValue}
                        </td>
                        <td class="py-2 pr-4 text-secondary-500 dark:text-secondary-300">{rt.description || '—'}</td>
                        <td class="py-2 text-center">
                          <button
                            type="button"
                            disabled={saving() || rt.isSystem}
                            onClick={() => toggleRoleType(rt)}
                            class={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                              rt.isActive ? 'bg-emerald-500' : 'bg-secondary-300 dark:bg-secondary-600'
                            }`}
                          >
                            <span
                              class={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                rt.isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Card>
        </Show>

        <Show when={tab() === 'matrix'}>
          <div class="mb-4 flex justify-end">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Tambah Role Group
            </Button>
          </div>
          <div class="space-y-4">
            <For each={roleGroups()}>
              {(g) => (
                <Card>
                  <div class="flex items-center justify-between">
                    <div>
                      <h2 class="text-base font-semibold text-secondary-800 dark:text-secondary-100">{g.name}</h2>
                      <p class="text-xs text-secondary-500 dark:text-secondary-400">{g.description || '—'}</p>
                    </div>
                    <Button size="sm" variant="secondary" disabled={!g.isActive} onClick={() => openMatrix(g)}>
                      Atur Akses
                    </Button>
                  </div>
                </Card>
              )}
            </For>
          </div>
        </Show>

        <Modal show={showCreate()} onClose={() => setShowCreate(false)} title="Tambah Role Group">
          <div class="space-y-3">
            <Input label="Nama Role Group" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)} />
            <Input label="Deskripsi" value={newDesc()} onInput={(e) => setNewDesc(e.currentTarget.value)} />
            <div class="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCreate(false)}>
                Batal
              </Button>
              <Button loading={saving()} onClick={createGroup}>
                Simpan
              </Button>
            </div>
          </div>
        </Modal>

        <Modal
          show={!!editMatrix()}
          onClose={() => setEditMatrix(null)}
          title={`Matriks Akses — ${editMatrix()?.name || ''}`}
          maxWidth="xl"
        >
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-secondary-200 dark:border-secondary-700">
                  <th class="text-left py-2 pr-4 text-secondary-600 dark:text-secondary-400">Modul</th>
                  <For each={SYSTEM_ACTIONS}>
                    {(level) => (
                      <th class="px-2 py-2 text-center text-secondary-600 dark:text-secondary-400">
                        {LEVEL_LABELS[level]}
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={modules()}>
                  {(m) => (
                    <tr class="border-b border-secondary-100 dark:border-secondary-800">
                      <td class="py-2 pr-4 text-secondary-700 dark:text-secondary-300 capitalize">{m}</td>
                      <For each={SYSTEM_ACTIONS}>
                        {(level) => (
                          <td class="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={editMatrix()?.values[m]?.[level] || false}
                              onChange={() => toggleCell(m, level)}
                              class="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500/30"
                            />
                          </td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <p class="mt-3 text-xs text-secondary-500 dark:text-secondary-400">
            Lihat = akses baca. Edit = buat & ubah data. Kelola = hapus, ekspor & setujui.
          </p>
          <div class="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditMatrix(null)}>
              Batal
            </Button>
            <Button loading={saving()} onClick={saveMatrix}>
              Simpan Akses
            </Button>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
