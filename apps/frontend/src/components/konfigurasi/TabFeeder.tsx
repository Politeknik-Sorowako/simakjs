import { createEffect, createResource, createSignal, Show } from 'solid-js';
import { useToast } from '../../contexts/ToastContext';
import { type FeederTestResult, systemController } from '../../controllers/systemController';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface FeederForm {
  url: string;
  username: string;
  password: string;
  timeoutMs: string;
  pageSize: string;
  autoApproveKrs: boolean;
  writeGuard: boolean;
}

/**
 * Tab"Feeder PDDIKTI" — konfigurasi Web Service Neo Feeder (`live2.php`):
 * alamat, kredensial, timeout, dan page size. Password bersifat write-only
 * (tidak pernah dikembalikan server) dan hanya diperbarui bila diisi.
 */
export default function TabFeeder() {
  const toast = useToast();
  const [params, { refetch }] = createResource(() => systemController.getParameters());

  const [form, setForm] = createSignal<FeederForm | null>(null);
  const [saving, setSaving] = createSignal(false);
  const [testing, setTesting] = createSignal(false);
  const [showPassword, setShowPassword] = createSignal(false);
  const [testResult, setTestResult] = createSignal<FeederTestResult | null>(null);
  const [notice, setNotice] = createSignal('');
  const [saveError, setSaveError] = createSignal('');

  const findParam = (key: string) => params()?.find((p) => p.key === key) ?? null;
  const serverValue = (key: string, fallback = '') => String(findParam(key)?.value ?? fallback);
  const serverBool = (key: string, fallback: boolean) => {
    const raw = serverValue(key, fallback ? 'true' : 'false')
      .trim()
      .toLowerCase();
    return fallback ? raw !== 'false' && raw !== '0' : raw === 'true' || raw === '1';
  };
  const passwordFilled = () => Boolean(findParam('FEEDER_PASSWORD')?.hasValue);

  createEffect(() => {
    const list = params();
    if (list && form() === null) {
      setForm({
        url: serverValue('FEEDER_URL'),
        username: serverValue('FEEDER_USERNAME'),
        password: '',
        timeoutMs: serverValue('FEEDER_TIMEOUT_MS', '20000'),
        pageSize: serverValue('FEEDER_PAGE_SIZE', '200'),
        autoApproveKrs: serverBool('FEEDER_AUTO_APPROVE_KRS', false),
        writeGuard: serverBool('FEEDER_WRITE_GUARD', true),
      });
    }
  });

  const patch = (p: Partial<FeederForm>) => setForm((prev) => ({ ...(prev as FeederForm), ...p }));

  const dirty = () => {
    const f = form();
    if (!f) return false;
    return (
      f.url !== serverValue('FEEDER_URL') ||
      f.username !== serverValue('FEEDER_USERNAME') ||
      f.timeoutMs !== serverValue('FEEDER_TIMEOUT_MS', '20000') ||
      f.pageSize !== serverValue('FEEDER_PAGE_SIZE', '200') ||
      f.autoApproveKrs !== serverBool('FEEDER_AUTO_APPROVE_KRS', false) ||
      f.writeGuard !== serverBool('FEEDER_WRITE_GUARD', true) ||
      f.password.length > 0
    );
  };

  const handleSave = async () => {
    const f = form();
    if (!f) return;
    if (!f.url.trim() || !f.username.trim()) {
      setSaveError('Alamat dan username Feeder wajib diisi.');
      return;
    }
    setSaving(true);
    setNotice('');
    setSaveError('');
    try {
      const jobs: Promise<unknown>[] = [];
      if (f.url.trim() !== serverValue('FEEDER_URL')) {
        jobs.push(systemController.updateParameter('FEEDER_URL', f.url.trim()));
      }
      if (f.username.trim() !== serverValue('FEEDER_USERNAME')) {
        jobs.push(systemController.updateParameter('FEEDER_USERNAME', f.username.trim()));
      }
      if (f.password.length > 0) {
        jobs.push(systemController.updateParameter('FEEDER_PASSWORD', f.password));
      }
      if (f.timeoutMs !== serverValue('FEEDER_TIMEOUT_MS', '20000')) {
        jobs.push(systemController.updateParameter('FEEDER_TIMEOUT_MS', f.timeoutMs));
      }
      if (f.pageSize !== serverValue('FEEDER_PAGE_SIZE', '200')) {
        jobs.push(systemController.updateParameter('FEEDER_PAGE_SIZE', f.pageSize));
      }
      if (f.autoApproveKrs !== serverBool('FEEDER_AUTO_APPROVE_KRS', false)) {
        jobs.push(systemController.updateParameter('FEEDER_AUTO_APPROVE_KRS', f.autoApproveKrs ? 'true' : 'false'));
      }
      if (f.writeGuard !== serverBool('FEEDER_WRITE_GUARD', true)) {
        jobs.push(systemController.updateParameter('FEEDER_WRITE_GUARD', f.writeGuard ? 'true' : 'false'));
      }
      if (jobs.length === 0) {
        setNotice('Tidak ada perubahan untuk disimpan.');
        return;
      }
      const results = await Promise.allSettled(jobs);
      const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (rejected.length > 0) {
        const reason = rejected[0].reason;
        const detail = reason instanceof Error ? reason.message : 'Gagal menyimpan konfigurasi Feeder.';
        // Request lain yang berhasil tetap tersimpan; beri tahu bila hanya sebagian yang gagal.
        throw new Error(rejected.length === jobs.length ? detail : `${detail} (sebagian perubahan sudah tersimpan)`);
      }
      // Bangun ulang form dari hasil refetch (bukan pola setForm(null) + effect)
      // agar form tidak sempat ter-reset dari data stale pra-simpan.
      const fresh = await refetch();
      if (fresh) {
        const val = (key: string, fallback = '') => String(fresh.find((p) => p.key === key)?.value ?? fallback);
        const boolVal = (key: string, fallback: boolean) => {
          const raw = val(key, fallback ? 'true' : 'false')
            .trim()
            .toLowerCase();
          return fallback ? raw !== 'false' && raw !== '0' : raw === 'true' || raw === '1';
        };
        setForm({
          url: val('FEEDER_URL'),
          username: val('FEEDER_USERNAME'),
          password: '',
          timeoutMs: val('FEEDER_TIMEOUT_MS', '20000'),
          pageSize: val('FEEDER_PAGE_SIZE', '200'),
          autoApproveKrs: boolVal('FEEDER_AUTO_APPROVE_KRS', false),
          writeGuard: boolVal('FEEDER_WRITE_GUARD', true),
        });
      } else {
        setForm(null);
      }
      setTestResult(null);
      setNotice('Konfigurasi Feeder berhasil disimpan.');
      toast.showToast('Konfigurasi Feeder diperbarui', 'success');
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Gagal menyimpan konfigurasi Feeder.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const f = form();
    if (!f) return;
    setTesting(true);
    setTestResult(null);
    setNotice('');
    try {
      const res = await systemController.testFeederConnection({
        url: f.url.trim() || undefined,
        username: f.username.trim() || undefined,
        password: f.password.length > 0 ? f.password : undefined,
      });
      setTestResult(res);
    } catch (e: unknown) {
      setTestResult({
        ok: false,
        url: f.url,
        username: f.username,
        latencyMs: 0,
        error: e instanceof Error ? e.message : 'Gagal menguji koneksi Feeder',
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div class="flex flex-col gap-6">
      <p class="text-sm text-secondary-500 dark:text-secondary-400">
        Konfigurasi integrasi Web Service Neo Feeder PDDIKTI. Password hanya tersimpan di server dan tidak pernah
        ditampilkan kembali.
      </p>

      <Show when={notice()}>
        <div class="rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 dark:border-success-800 dark:bg-success-900/30 dark:text-success-400">
          {notice()}
        </div>
      </Show>

      <Show when={saveError()}>
        <div class="rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-900/30 dark:text-danger-400">
          {saveError()}
        </div>
      </Show>

      <Card>
        <Show when={form()} fallback={<p class="text-sm text-secondary-400">Memuat konfigurasi Feeder...</p>}>
          {(f) => (
            <div class="flex flex-col gap-4">
              <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Alamat Web Service (live2.php)
                <Input
                  type="url"
                  value={f().url}
                  onInput={(e) => patch({ url: e.currentTarget.value })}
                  placeholder="https://feeder.politekniksorowako.ac.id/ws/live2.php"
                  maxLength={500}
                />
              </label>

              <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                Username
                <Input
                  type="text"
                  value={f().username}
                  onInput={(e) => patch({ username: e.currentTarget.value })}
                  placeholder="nama@politekniksorowako.ac.id"
                  maxLength={200}
                  autocomplete="off"
                />
              </label>

              <div class="flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-secondary-700 dark:text-secondary-200">Password</span>
                  <Badge variant={passwordFilled() ? 'success' : 'warning'}>
                    {passwordFilled() ? 'Terisi' : 'Belum diisi'}
                  </Badge>
                </div>
                <div class="flex items-center gap-2">
                  <Input
                    type={showPassword() ? 'text' : 'password'}
                    value={f().password}
                    onInput={(e) => patch({ password: e.currentTarget.value })}
                    placeholder={passwordFilled() ? 'Kosongkan bila tidak mengubah' : 'Masukkan password Feeder'}
                    maxLength={200}
                    autocomplete="new-password"
                  />
                  <Button variant="secondary" size="sm" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword() ? 'Sembunyikan' : 'Lihat'}
                  </Button>
                </div>
                <p class="text-xs text-secondary-400">
                  Password tidak dapat dilihat kembali. Isi hanya jika ingin mengganti.
                </p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                  Timeout (ms)
                  <Input
                    type="number"
                    min={5000}
                    max={60000}
                    step={1000}
                    value={f().timeoutMs}
                    onInput={(e) => patch({ timeoutMs: e.currentTarget.value })}
                  />
                </label>
                <label class="flex flex-col gap-1.5 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                  Page Size
                  <Input
                    type="number"
                    min={50}
                    max={500}
                    step={50}
                    value={f().pageSize}
                    onInput={(e) => patch({ pageSize: e.currentTarget.value })}
                  />
                </label>
              </div>

              <div class="rounded-xl border border-secondary-200 bg-secondary-50/60 p-4 dark:border-secondary-800 dark:bg-secondary-900/40">
                <div class="flex items-start justify-between gap-3">
                  <label class="flex items-start gap-2.5 text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                    <input
                      type="checkbox"
                      checked={f().writeGuard}
                      onChange={(e) => patch({ writeGuard: e.currentTarget.checked })}
                      class="mt-0.5 h-4 w-4 rounded border-secondary-300 text-action focus:ring-action-focus"
                    />
                    <span>
                      Aktifkan Write Guard — Mode Baca Saja ke Feeder
                      <span class="mt-0.5 block text-xs font-normal text-secondary-500 dark:text-secondary-400">
                        Saat aktif (disarankan), aplikasi memblokir seluruh perintah ubah data (Insert/Update/Delete) ke
                        Neo Feeder PDDIKTI dan hanya mengizinkan penarikan data (Get*).
                      </span>
                    </span>
                  </label>
                  <Badge variant={f().writeGuard ? 'success' : 'warning'}>
                    {f().writeGuard ? 'Guard ON (Baca Saja)' : 'Guard OFF'}
                  </Badge>
                </div>
              </div>

              <label class="flex items-center gap-2 text-sm font-semibold text-secondary-700 dark:text-secondary-200">
                <input
                  type="checkbox"
                  checked={f().autoApproveKrs}
                  onChange={(e) => patch({ autoApproveKrs: e.currentTarget.checked })}
                  class="h-4 w-4 rounded border-secondary-300 text-action focus:ring-action-focus"
                />
                Setujui otomatis KRS tertunda sebelum sinkronisasi
              </label>

              <div class="flex flex-wrap justify-end gap-2">
                <Button variant="secondary" loading={testing()} onClick={handleTest}>
                  Uji Koneksi
                </Button>
                <Button variant="primary" loading={saving()} disabled={!dirty()} onClick={handleSave}>
                  Simpan Konfigurasi
                </Button>
              </div>
            </div>
          )}
        </Show>
      </Card>

      <Show when={testResult()}>
        {(res) => (
          <Card>
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                    Hasil Uji Koneksi
                  </span>
                  <Badge variant={res().ok ? 'success' : 'danger'}>{res().ok ? 'Terhubung' : 'Gagal'}</Badge>
                </div>
                <Show when={res().ok}>
                  <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                    {res().profilNama || 'Profil PT diterima'}
                    {res().profilKode ? ` (${res().profilKode})` : ''} — {res().latencyMs} ms
                  </p>
                </Show>
                <Show when={!res().ok}>
                  <p class="mt-1 text-xs text-danger-600 dark:text-danger-400">{res().error}</p>
                </Show>
              </div>
            </div>
          </Card>
        )}
      </Show>
    </div>
  );
}
