import { createEffect, createSignal, For, Show } from 'solid-js';
import type { SubKomponenNilai } from '../controllers/khsController';

interface SubRow {
  id?: number;
  nama: string;
  bobot: number;
}

interface SubKomponenEditorProps {
  komponenId: number;
  disabled: boolean;
  subs: SubKomponenNilai[];
  onSave: (komponenId: number, list: Array<{ nama: string; bobot: number }>) => Promise<void>;
}

export default function SubKomponenEditor(props: SubKomponenEditorProps) {
  const [rows, setRows] = createSignal<SubRow[]>([]);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    const current = props.subs || [];
    setRows(current.map((s) => ({ id: s.id, nama: s.nama, bobot: Number(s.bobot) })));
  });

  const totalBobot = () => rows().reduce((sum, row) => sum + (Number(row.bobot) || 0), 0);
  const totalValid = () => rows().length === 0 || totalBobot() === 100;

  const updateRow = (index: number, field: 'nama' | 'bobot', value: string) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: field === 'bobot' ? Number(value) : value } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, { nama: '', bobot: 0 }]);
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    const list = rows().map((row) => ({ nama: row.nama.trim(), bobot: Number(row.bobot) || 0 }));

    if (list.some((row) => !row.nama)) {
      setError('Nama sub-komponen tidak boleh kosong.');
      return;
    }
    if (list.length > 0 && totalBobot() !== 100) {
      setError('Total bobot sub-komponen harus tepat 100%.');
      return;
    }

    setSaving(true);
    try {
      await props.onSave(props.komponenId, list);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="mt-2 ml-2 pl-3 border-l-2 border-brand-200 flex flex-col gap-2 dark:border-brand-800">
      <p class="text-[10px] font-bold uppercase tracking-wider text-secondary-400">
        Sub-Komponen (bobot relatif terhadap induk)
      </p>

      <For each={rows()}>
        {(row, idx) => (
          <div class="flex items-center gap-2">
            <input
              type="text"
              placeholder="Nama sub-komponen"
              value={row.nama}
              disabled={props.disabled}
              onInput={(e) => updateRow(idx(), 'nama', e.currentTarget.value)}
              class="border border-secondary-200 rounded-lg px-2 py-1 text-[11px] flex-1 focus:outline-none focus:border-brand-500 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:border-secondary-700 dark:text-white"
            />
            <input
              type="number"
              placeholder="Bobot"
              value={row.bobot}
              disabled={props.disabled}
              onInput={(e) => updateRow(idx(), 'bobot', e.currentTarget.value)}
              class="border border-secondary-200 rounded-lg px-2 py-1 text-[11px] w-14 text-center focus:outline-none focus:border-brand-500 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:border-secondary-700 dark:text-white"
            />
            <span class="text-[11px] text-secondary-400 font-bold">%</span>
            <Show when={!props.disabled}>
              <button
                type="button"
                onClick={() => removeRow(idx())}
                class="text-rose-500 hover:text-rose-700 text-xs p-0.5"
              >
                ❌
              </button>
            </Show>
          </div>
        )}
      </For>

      <div class="flex justify-between items-center">
        <Show when={!props.disabled} fallback={<span class="text-[10px] text-secondary-400">Terkunci.</span>}>
          <button
            type="button"
            onClick={addRow}
            class="text-brand-600 hover:text-brand-700 font-bold text-[11px] flex items-center gap-1"
          >
            ➕ Tambah Sub-Komponen
          </button>
        </Show>
        <span class={`text-[11px] font-bold ${totalValid() ? 'text-secondary-600' : 'text-rose-600'}`}>
          Total: {totalBobot()}%
        </span>
      </div>

      <Show when={error()}>
        <p class="text-[10px] font-semibold text-rose-600">{error()}</p>
      </Show>

      <Show when={!props.disabled}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving() || !totalValid()}
          class="self-start px-3 py-1.5 bg-brand-600 text-white font-bold rounded-lg text-[11px] hover:bg-brand-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed dark:bg-brand-700 dark:hover:bg-brand-600"
        >
          {saving() ? 'Menyimpan...' : 'Simpan Sub-Komponen'}
        </button>
      </Show>
    </div>
  );
}
