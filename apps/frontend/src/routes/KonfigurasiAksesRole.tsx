import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { rbacController, SYSTEM_ACTIONS } from '../controllers/rbacController';

export default function KonfigurasiAksesRole() {
  const [data, { refetch }] = createResource(() => rbacController.getRoleGroups());

  const roleGroups = () => data()?.data || [];
  const permissions = () => data()?.permissions || [];

  const modules = () => {
    const m = new Set<string>();
    for (const p of permissions()) m.add(p.module);
    return [...m].sort();
  };

  const [editMatrix, setEditMatrix] = createSignal<{
    roleGroupId: number;
    name: string;
    values: Record<string, boolean>;
  } | null>(null);

  const [showCreate, setShowCreate] = createSignal(false);
  const [newName, setNewName] = createSignal('');
  const [newDesc, setNewDesc] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal('');

  const toggleCell = (module: string, action: string) => {
    const cur = editMatrix();
    if (!cur) return;
    const key = `${module}:${action}`;
    setEditMatrix({ ...cur, values: { ...cur.values, [key]: !cur.values[key] } });
  };

  const openMatrix = (group: { id: number; name: string; actionsByModule: Record<string, string[]> }) => {
    const values: Record<string, boolean> = {};
    for (const [module, actions] of Object.entries(group.actionsByModule || {})) {
      for (const action of actions) values[`${module}:${action}`] = true;
    }
    setEditMatrix({ roleGroupId: group.id, name: group.name, values });
  };

  const saveMatrix = async () => {
    const cur = editMatrix();
    if (!cur) return;
    setSaving(true);
    try {
      const permissionIds = permissions()
        .filter((p) => cur.values[`${p.module}:${p.action}`])
        .map((p) => p.id);
      await rbacController.assignPermissions(cur.roleGroupId, permissionIds);
      setNotice('Akses role group berhasil disimpan.');
      setEditMatrix(null);
      refetch();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal menyimpan akses.');
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
              Konfigurasi matriks izin modul & aksi (View, Create, Update, Delete, Export, Approve) untuk setiap role
              group.
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            Tambah Role Group
          </Button>
        </div>

        <Show when={notice()}>
          <div class="mb-4 rounded-xl bg-success-50 border border-success-200 dark:bg-success-900/30 dark:border-success-800 px-4 py-3 text-sm text-success-700 dark:text-success-400">
            {notice()}
          </div>
        </Show>

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
                    {(act) => (
                      <th class="px-2 py-2 text-center text-secondary-600 dark:text-secondary-400 capitalize">{act}</th>
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
                        {(act) => {
                          const key = `${m}:${act}`;
                          return (
                            <td class="px-2 py-2 text-center">
                              <input
                                type="checkbox"
                                checked={editMatrix()?.values[key] || false}
                                onChange={() => toggleCell(m, act)}
                                class="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500/30"
                              />
                            </td>
                          );
                        }}
                      </For>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
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
