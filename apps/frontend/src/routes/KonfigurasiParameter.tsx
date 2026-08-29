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

        <div class="space-y-3">
          <For each={params() || []}>
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
