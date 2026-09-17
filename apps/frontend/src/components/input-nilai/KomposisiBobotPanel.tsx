import { Index, Show } from 'solid-js';
import type { SubKomponenNilai } from '../../controllers/khsController';
import SubKomponenEditor from '../SubKomponenEditor';

interface EditableComponent {
  id?: number;
  name: string;
  bobot: number;
}

interface KomposisiBobotPanelProps {
  editableComponents: EditableComponent[];
  komponenIdAt: (idx: number) => number | undefined;
  expandedKomponenId: number | null;
  expandedSubs: SubKomponenNilai[];
  isLocked: boolean;
  rencanaEvalsCount: number;
  totalBobot: number;
  onToggleExpand: (id: number) => void;
  onUpdateField: (index: number, field: 'name' | 'bobot', value: string | number) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  onSave: () => void;
  onImportFromRps: () => void;
  onSaveSub: (komponenId: number, list: Array<{ id?: number; nama: string; bobot: number }>) => Promise<void>;
}

export default function KomposisiBobotPanel(props: KomposisiBobotPanelProps) {
  return (
    <div class="flex flex-col gap-3">
      {/* We use Index instead of For to preserve focus when elements update */}
      <Index each={props.editableComponents}>
        {(comp, idx) => {
          const komponenId = () => props.komponenIdAt(idx);
          const isExpanded = () => komponenId() !== undefined && props.expandedKomponenId === komponenId();
          return (
            <div class="flex flex-col gap-1 border-b pb-2">
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Nama Komponen"
                  value={comp().name}
                  disabled={props.isLocked}
                  onInput={(e) => props.onUpdateField(idx, 'name', e.currentTarget.value)}
                  class="border border-secondary-200 rounded-lg px-2.5 py-1.5 text-xs flex-1 focus:outline-none disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:border-secondary-700 dark:text-white"
                />
                <input
                  type="number"
                  placeholder="Bobot"
                  value={comp().bobot}
                  disabled={props.isLocked}
                  onInput={(e) => props.onUpdateField(idx, 'bobot', e.currentTarget.value)}
                  class="border border-secondary-200 rounded-lg px-2.5 py-1.5 text-xs w-16 focus:outline-none disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 text-center dark:border-secondary-700 dark:text-white"
                />
                <span class="text-xs text-secondary-400 font-bold">%</span>
                <Show when={komponenId() !== undefined}>
                  <button
                    type="button"
                    title="Breakdown sub-komponen"
                    onClick={() => props.onToggleExpand(komponenId() as number)}
                    class={`text-xs p-1 rounded ${isExpanded() ? 'text-brand-700' : 'text-secondary-400 hover:text-brand-600'}`}
                  >
                    [S]
                  </button>
                </Show>
                <Show when={!props.isLocked}>
                  <button onClick={() => props.onRemove(idx)} class="text-rose-500 hover:text-rose-700 text-xs p-1">
                    ×
                  </button>
                </Show>
              </div>
              <Show when={isExpanded()}>
                <SubKomponenEditor
                  komponenId={komponenId() as number}
                  disabled={props.isLocked}
                  subs={props.expandedSubs}
                  onSave={props.onSaveSub}
                />
              </Show>
            </div>
          );
        }}
      </Index>

      <div class="flex justify-between items-center mt-2">
        <Show
          when={!props.isLocked}
          fallback={<span class="text-xs text-secondary-400 font-medium">Pengaturan komponen dinonaktifkan.</span>}
        >
          <div class="flex flex-col gap-2 align-start">
            <button
              onClick={props.onAdd}
              class="text-brand-600 hover:text-brand-700 font-bold text-xs flex items-center gap-1 text-left"
            >
              + Tambah Komponen
            </button>
            <Show when={props.rencanaEvalsCount > 0}>
              <button
                onClick={props.onImportFromRps}
                class="text-accent-600 hover:text-accent-700 font-bold text-xs flex items-center gap-1 text-left"
              >
                Ambil Komposisi dari RPS
              </button>
            </Show>
          </div>
        </Show>
        <span class="text-xs font-bold text-secondary-600">Total: {props.totalBobot}%</span>
      </div>

      <Show when={!props.isLocked}>
        <button
          onClick={props.onSave}
          class="mt-4 px-4 py-2 bg-brand-600 text-white font-bold rounded-xl text-xs hover:bg-brand-700 active:scale-95 transition-all shadow-sm shadow-accent-100 dark:bg-brand-700 dark:hover:bg-brand-600"
        >
          Simpan Bobot Komponen
        </button>
      </Show>
    </div>
  );
}
