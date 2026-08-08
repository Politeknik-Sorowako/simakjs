import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { type Prodi, prodiController } from '../controllers/prodiController';
import { prodiScopeController } from '../controllers/prodiScopeController';
import { userController } from '../controllers/userController';

interface ScopeRow {
  id: number;
  email: string;
  nama: string;
  role: string;
  isActive: boolean;
  isGlobalScope: boolean;
}

export default function KonfigurasiScopeProdi() {
  const [users] = createResource(() => userController.getAll(1, 10000, ''));
  const [prodis] = createResource(() => prodiController.getAll().then((r) => r.data || []));

  const rows = (): ScopeRow[] =>
    (users()?.data || []).map((u) => ({
      id: u.id,
      email: u.email,
      nama: u.nama,
      role: u.role,
      isActive: u.isActive,
      isGlobalScope: !!u.isGlobalScope,
    }));

  const [editUser, setEditUser] = createSignal<(ScopeRow & { currentScopes: number[] }) | null>(null);
  const [selected, setSelected] = createSignal<Set<number>>(new Set());
  const [isGlobal, setIsGlobal] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [notice, setNotice] = createSignal('');

  const openModal = async (u: ScopeRow) => {
    const scopes = await prodiScopeController.getUserScopes(u.id);
    const current = new Set(scopes.map((s) => s.programStudiId));
    setEditUser({ ...u, currentScopes: scopes.map((s) => s.programStudiId) });
    setSelected(current);
    setIsGlobal(u.isGlobalScope);
    setNotice('');
  };

  const toggleProdi = (id: number) => {
    const next = new Set(selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const save = async () => {
    const u = editUser();
    if (!u) return;
    setSaving(true);
    try {
      if (isGlobal() !== u.isGlobalScope) {
        await prodiScopeController.toggleGlobal(u.id, isGlobal());
      }
      await prodiScopeController.setUserScopes(u.id, [...selected()]);
      setNotice(`Scope Prodi untuk ${u.nama} berhasil diperbarui.`);
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal memperbarui scope.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout>
      <div class="max-w-5xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-secondary-100">Scope Program Studi</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-400">
            Tentukan program studi (multi-prodi) yang dapat diakses oleh setiap pengguna. Opsi global berlaku untuk
            Super Admin / BAAK agar melihat seluruh data.
          </p>
        </div>

        <Show when={notice()}>
          <div class="mb-4 rounded-xl bg-success-50 border border-success-200 dark:bg-success-900/30 dark:border-success-800 px-4 py-3 text-sm text-success-700 dark:text-success-400">
            {notice()}
          </div>
        </Show>

        <Card padding="none">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-secondary-200 dark:border-secondary-700 text-left">
                <th class="px-4 py-3 text-secondary-600 dark:text-secondary-400">Nama</th>
                <th class="px-4 py-3 text-secondary-600 dark:text-secondary-400">Role</th>
                <th class="px-4 py-3 text-secondary-600 dark:text-secondary-400">Akses Global</th>
                <th class="px-4 py-3 text-secondary-600 dark:text-secondary-400">Aksi</th>
              </tr>
            </thead>
            <tbody>
              <For each={rows()}>
                {(u) => (
                  <tr class="border-b border-secondary-100 dark:border-secondary-800">
                    <td class="px-4 py-3 text-secondary-800 dark:text-secondary-100">
                      <div class="font-medium">{u.nama}</div>
                      <div class="text-xs text-secondary-400">{u.email}</div>
                    </td>
                    <td class="px-4 py-3 capitalize text-secondary-600 dark:text-secondary-400">{u.role}</td>
                    <td class="px-4 py-3">
                      <Show when={u.isGlobalScope} fallback={<span class="text-secondary-400">Terbatas</span>}>
                        <span class="text-success-600 font-medium">Global</span>
                      </Show>
                    </td>
                    <td class="px-4 py-3">
                      <Button size="sm" variant="secondary" onClick={() => openModal(u)}>
                        Atur Scope
                      </Button>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Card>

        <Modal
          show={!!editUser()}
          onClose={() => setEditUser(null)}
          title={`Scope Prodi — ${editUser()?.nama || ''}`}
          maxWidth="lg"
        >
          <div class="space-y-4">
            <label class="flex items-center gap-2 text-sm text-secondary-700 dark:text-secondary-200">
              <input
                type="checkbox"
                checked={isGlobal()}
                onChange={(e) => setIsGlobal(e.currentTarget.checked)}
                class="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500/30"
              />
              Akses global (semua program studi) — Super Admin / BAAK
            </label>

            <Show when={!isGlobal()}>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
                <For each={prodis() || []}>
                  {(p) => (
                    <label class="flex items-center gap-2 rounded-lg border border-secondary-200 dark:border-secondary-700 px-3 py-2 text-sm text-secondary-700 dark:text-secondary-200">
                      <input
                        type="checkbox"
                        checked={(selected() as Set<number>).has(p.id)}
                        onChange={() => toggleProdi(p.id)}
                        class="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500/30"
                      />
                      <span>
                        {p.nama} <span class="text-xs text-secondary-400">({p.kode})</span>
                      </span>
                    </label>
                  )}
                </For>
              </div>
            </Show>

            <div class="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditUser(null)}>
                Batal
              </Button>
              <Button loading={saving()} onClick={save}>
                Simpan
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </MainLayout>
  );
}
