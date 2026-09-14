import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { type SystemParameter, systemController } from '../controllers/systemController';

const TYPE_LABEL: Record<string, string> = {
  number: 'Angka',
  boolean: 'Ya/Tidak',
  string: 'Teks',
};

const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'Asia/Makassar', label: 'Asia/Makassar (WITA - UTC+8) [Default]' },
  { value: 'Asia/Jakarta', label: 'Asia/Jakarta (WIB - UTC+7)' },
  { value: 'Asia/Jayapura', label: 'Asia/Jayapura (WIT - UTC+9)' },
  { value: 'UTC', label: 'UTC (Universal Coordinated Time)' },
];

interface ToggleCardProps {
  title: string;
  parameterKey: string;
  description: string;
  enabled: boolean;
  saving: boolean;
  onToggle: (value: string) => void;
  onSave: () => void;
}

function ToggleCard(props: ToggleCardProps) {
  return (
    <Card>
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-secondary-800 dark:text-secondary-100">{props.title}</span>
            <Badge variant={props.enabled ? 'success' : 'warning'}>{props.enabled ? 'Aktif' : 'Nonaktif'}</Badge>
          </div>
          <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">{props.description}</p>
          <p class="mt-0.5 text-xs text-secondary-400 font-mono">{props.parameterKey}</p>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <select
            value={props.enabled ? 'true' : 'false'}
            onChange={(e) => props.onToggle(e.currentTarget.value)}
            class="rounded-xl border border-secondary-200 bg-white px-3 py-2.5 text-sm text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
          >
            <option value="true">Ya — Blokir</option>
            <option value="false">Tidak — Izinkan</option>
          </select>
          <Button size="sm" loading={props.saving} onClick={props.onSave}>
            Simpan
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default function KonfigurasiParameter() {
  const [params, { refetch }] = createResource(() => systemController.getParameters());
  const [edits, setEdits] = createSignal<Record<string, string>>({});
  const [savingKey, setSavingKey] = createSignal<string | null>(null);
  const [notice, setNotice] = createSignal('');

  const valueFor = (p: SystemParameter) => {
    if (p.paramType === 'boolean') {
      return (edits()[p.key] ?? p.value) === 'true' ? 'true' : 'false';
    }
    return edits()[p.key] ?? p.value;
  };

  const setField = (key: string, value: string) => setEdits((prev) => ({ ...prev, [key]: value }));

  const save = async (p: SystemParameter) => {
    setSavingKey(p.key);
    try {
      await systemController.updateParameter(p.key, valueFor(p));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[p.key];
        return next;
      });
      setNotice(`Parameter ${p.key} berhasil diperbarui.`);
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : `Gagal memperbarui ${p.key}.`);
    } finally {
      setSavingKey(null);
    }
  };

  const hasChanges = (p: SystemParameter) =>
    p.paramType !== 'boolean' && edits()[p.key] !== undefined && edits()[p.key] !== p.value;

  // Dedicated, admin-friendly control for the KRS self-service toggle.
  const krsParam = () => params()?.find((p) => p.key === 'KRS_MANDIRI_ENABLED') ?? null;
  const krsMandiriEnabled = () => (edits().KRS_MANDIRI_ENABLED ?? krsParam()?.value ?? 'true') === 'true';
  const saveKrsMandiri = async () => {
    setSavingKey('KRS_MANDIRI_ENABLED');
    try {
      await systemController.updateParameter('KRS_MANDIRI_ENABLED', krsMandiriEnabled() ? 'true' : 'false');
      setEdits((prev) => {
        const next = { ...prev };
        delete next.KRS_MANDIRI_ENABLED;
        return next;
      });
      setNotice('Pengaturan KRS mandiri berhasil diperbarui.');
      refetch();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : 'Gagal memperbarui pengaturan KRS mandiri.');
    } finally {
      setSavingKey(null);
    }
  };

  // Toggle blocking KHS & KRS karena tunggakan (pola sama dengan KRS mandiri).
  const boolValue = (key: string, fallback: string) =>
    (edits()[key] ?? String(params()?.find((p) => p.key === key)?.value ?? fallback)) === 'true';

  const khsBlockEnabled = () => boolValue('BLOCK_KHS_JIKA_TANGGUNGAN', 'true');
  const krsBlockEnabled = () => boolValue('BLOCK_KRS_JIKA_TANGGUNGAN', 'false');

  const saveBoolParam = async (key: string, label: string, enabled: () => boolean) => {
    setSavingKey(key);
    try {
      await systemController.updateParameter(key, enabled() ? 'true' : 'false');
      setEdits((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setNotice(`${label} berhasil diperbarui.`);
      refetch();
    } catch (e: unknown) {
      setNotice(e instanceof Error ? e.message : `Gagal memperbarui ${label}.`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <MainLayout>
      <div class="max-w-3xl mx-auto">
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-secondary-100">Parameter Kompensasi & Akademik</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-400">
            Aturan dinamis sistem Vokasi. Nilai diinjeksikan ke layanan kompensasi secara langsung, tanpa hardcode.
          </p>
        </div>

        <Show when={notice()}>
          <div class="mb-4 rounded-xl bg-success-50 border border-success-200 dark:bg-success-900/30 dark:border-success-800 px-4 py-3 text-sm text-success-700 dark:text-success-400">
            {notice()}
          </div>
        </Show>

        {/* Kontrol KRS Mandiri */}
        <div class="mb-6">
          <Card>
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                    Kontrol KRS Mandiri
                  </span>
                  <Badge variant={krsMandiriEnabled() ? 'success' : 'warning'}>
                    {krsMandiriEnabled() ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>
                <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">
                  Jika nonaktif, mahasiswa tidak dapat melakukan pengisian KRS mandiri (tombol Kontrak KRS
                  disembunyikan). Staff (admin/dosen/prodi) tidak terpengaruh.
                </p>
                <p class="mt-0.5 text-xs text-secondary-400 font-mono">KRS_MANDIRI_ENABLED</p>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <select
                  value={krsMandiriEnabled() ? 'true' : 'false'}
                  onChange={(e) => setField('KRS_MANDIRI_ENABLED', e.currentTarget.value)}
                  class="rounded-xl border border-secondary-200 bg-white px-3 py-2.5 text-sm text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                >
                  <option value="true">Ya — Izinkan</option>
                  <option value="false">Tidak — Nonaktifkan</option>
                </select>
                <Button size="sm" loading={savingKey() === 'KRS_MANDIRI_ENABLED'} onClick={saveKrsMandiri}>
                  Simpan
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Kontrol Blocking KHS & KRS karena tunggakan */}
        <div class="mb-6 space-y-3">
          <ToggleCard
            title="Pemblokiran KHS karena Tunggakan"
            parameterKey="BLOCK_KHS_JIKA_TANGGUNGAN"
            description="Jika aktif, mahasiswa tidak dapat melihat KHS saat masih memiliki tunggakan SPP/kompensasi. Staff tidak terpengaruh."
            enabled={khsBlockEnabled()}
            saving={savingKey() === 'BLOCK_KHS_JIKA_TANGGUNGAN'}
            onToggle={(val) => setField('BLOCK_KHS_JIKA_TANGGUNGAN', val)}
            onSave={() => saveBoolParam('BLOCK_KHS_JIKA_TANGGUNGAN', 'Pemblokiran KHS', khsBlockEnabled)}
          />
          <ToggleCard
            title="Pemblokiran KRS karena Tunggakan"
            parameterKey="BLOCK_KRS_JIKA_TANGGUNGAN"
            description="Jika aktif, mahasiswa tidak dapat melakukan pengisian KRS mandiri saat masih memiliki tunggakan SPP/kompensasi. Staff tidak terpengaruh."
            enabled={krsBlockEnabled()}
            saving={savingKey() === 'BLOCK_KRS_JIKA_TANGGUNGAN'}
            onToggle={(val) => setField('BLOCK_KRS_JIKA_TANGGUNGAN', val)}
            onSave={() => saveBoolParam('BLOCK_KRS_JIKA_TANGGUNGAN', 'Pemblokiran KRS', krsBlockEnabled)}
          />
        </div>

        <div class="space-y-3">
          <For
            each={(params() || []).filter(
              (p) =>
                p.key !== 'KRS_MANDIRI_ENABLED' &&
                p.key !== 'BLOCK_KHS_JIKA_TANGGUNGAN' &&
                p.key !== 'BLOCK_KRS_JIKA_TANGGUNGAN',
            )}
          >
            {(p) => (
              <Card>
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <span class="font-mono text-sm font-semibold text-secondary-800 dark:text-secondary-100">
                        {p.key}
                      </span>
                      <Badge variant="info">{TYPE_LABEL[p.paramType] || p.paramType}</Badge>
                    </div>
                    <p class="mt-1 text-xs text-secondary-500 dark:text-secondary-400">{p.description}</p>
                    <p class="mt-0.5 text-xs text-secondary-400">Default: {p.defaultValue || '—'}</p>
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <Show
                      when={p.paramType === 'boolean'}
                      fallback={
                        <Show
                          when={p.key === 'TIMEZONE'}
                          fallback={
                            <Input
                              type="number"
                              value={valueFor(p)}
                              onInput={(e) => setField(p.key, e.currentTarget.value)}
                              class="w-28"
                            />
                          }
                        >
                          <select
                            value={valueFor(p)}
                            onChange={(e) => setField(p.key, e.currentTarget.value)}
                            class="rounded-xl border border-secondary-200 bg-white px-3 py-2.5 text-sm text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                          >
                            <For each={TIMEZONE_OPTIONS}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
                          </select>
                        </Show>
                      }
                    >
                      <select
                        value={valueFor(p)}
                        onChange={(e) => setField(p.key, e.currentTarget.value)}
                        class="rounded-xl border border-secondary-200 bg-white px-3 py-2.5 text-sm text-secondary-800 dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100"
                      >
                        <option value="true">Ya</option>
                        <option value="false">Tidak</option>
                      </select>
                    </Show>
                    <Button
                      size="sm"
                      loading={savingKey() === p.key}
                      disabled={p.paramType !== 'boolean' && !hasChanges(p)}
                      onClick={() => save(p)}
                    >
                      Simpan
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </For>
        </div>
      </div>
    </MainLayout>
  );
}
