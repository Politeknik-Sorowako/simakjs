import { createMemo, createSignal, For, Show } from 'solid-js';
import type { KomponenNilai, NilaiMahasiswa, SubKomponenNilai } from '../../controllers/khsController';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

interface SubNilaiPopupProps {
  student: NilaiMahasiswa;
  komponen: KomponenNilai & { id: number };
  subs: SubKomponenNilai[];
  initialValues: Record<number, string>;
  storedValues: Record<number, string>;
  envelope: { min: number; max: number };
  isLocked: boolean;
  onDraftSave: (krsId: number, komponenId: number, values: Record<number, string>) => void;
  onClose: () => void;
}

const parseValue = (raw: string): number | null => {
  const cleaned = raw.replace(',', '.');
  if (cleaned === '' || Number.isNaN(Number(cleaned))) return null;
  return Number(cleaned);
};

export default function SubNilaiPopup(props: SubNilaiPopupProps) {
  const validSubs = createMemo(() =>
    props.subs.filter((s): s is SubKomponenNilai & { id: number } => typeof s.id === 'number'),
  );

  const [values, setValues] = createSignal<Record<number, string>>({ ...props.initialValues });

  const updateValue = (subId: number, raw: string) => {
    const sanitized = raw.replace(/[^0-9.,]/g, '');
    setValues((prev) => ({ ...prev, [subId]: sanitized }));
  };

  const isInvalid = (raw: string | undefined): boolean => {
    const n = parseValue(raw ?? '');
    if (n === null) return false;
    return n < props.envelope.min || n > props.envelope.max;
  };

  const isChanged = (subId: number): boolean => (values()[subId] ?? '') !== (props.storedValues[subId] ?? '');

  const hasInvalid = createMemo(() => validSubs().some((sub) => isInvalid(values()[sub.id])));

  const aggregate = createMemo(() => {
    let total = 0;
    let weight = 0;
    let missing = 0;
    for (const sub of validSubs()) {
      const n = parseValue(values()[sub.id] ?? '');
      if (n === null) {
        missing += 1;
        continue;
      }
      total += n * (Number(sub.bobot) / 100);
      weight += Number(sub.bobot);
    }
    const complete = missing === 0 && weight === 100;
    return {
      score: complete ? parseFloat(total.toFixed(2)) : null,
      complete,
      filled: validSubs().length - missing,
      total: validSubs().length,
    };
  });

  const handleSave = () => {
    if (props.isLocked || hasInvalid()) return;
    props.onDraftSave(props.student.krsId, props.komponen.id, values());
    props.onClose();
  };

  return (
    <Modal show onClose={props.onClose} title={`Input Sub-Komponen — ${props.student.nama}`} maxWidth="md">
      <div class="flex flex-col gap-4">
        <div class="flex flex-col gap-1 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 p-3">
          <span class="text-xs font-bold text-secondary-800 dark:text-white">{props.komponen.nama}</span>
          <span class="text-[11px] text-secondary-500">
            Bobot Komponen {props.komponen.bobot}% • {props.student.nim} — {props.student.nama}
          </span>
        </div>

        <Show
          when={validSubs().length > 0}
          fallback={<p class="text-xs text-secondary-400 italic">Komponen ini belum memiliki sub-komponen.</p>}
        >
          <div class="flex flex-col gap-3">
            <For each={validSubs()}>
              {(sub) => (
                <div class="flex items-center justify-between gap-3">
                  <label
                    for={`sub-nilai-${sub.id}`}
                    class="text-xs font-semibold text-secondary-700 dark:text-secondary-200 flex-1"
                  >
                    {sub.nama} ({sub.bobot}%)
                    <Show when={isChanged(sub.id)}>
                      <span class="ml-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">• berubah</span>
                    </Show>
                  </label>
                  <input
                    id={`sub-nilai-${sub.id}`}
                    type="text"
                    inputmode="decimal"
                    placeholder="0.00"
                    disabled={props.isLocked}
                    value={values()[sub.id] ?? ''}
                    onInput={(e) => updateValue(sub.id, e.currentTarget.value)}
                    class={`border rounded-lg px-2 h-11 w-24 text-center text-sm focus:outline-none focus:ring-2 disabled:bg-secondary-50 disabled:text-secondary-400 text-secondary-900 dark:text-white dark:bg-secondary-900 ${
                      isInvalid(values()[sub.id])
                        ? 'border-rose-400 bg-rose-50 focus:border-rose-500 focus:ring-rose-500/20 dark:bg-rose-950/30'
                        : isChanged(sub.id)
                          ? 'border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-500/20 dark:bg-amber-950/30 dark:border-amber-600'
                          : 'border-secondary-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-secondary-700'
                    }`}
                  />
                </div>
              )}
            </For>
          </div>

          <div class="flex items-center justify-between border-t border-secondary-100 dark:border-secondary-800 pt-3">
            <span class="text-[11px] font-semibold text-secondary-500">
              {aggregate().filled}/{aggregate().total} sub terisi
            </span>
            <span class="text-sm font-bold text-secondary-800 dark:text-white">
              Σ {aggregate().complete ? aggregate().score : '–'}
            </span>
          </div>

          <Show when={hasInvalid()}>
            <p class="text-[11px] font-semibold text-rose-600">
              Nilai harus berada pada rentang {props.envelope.min}–{props.envelope.max}.
            </p>
          </Show>
          <Show when={!aggregate().complete && !hasInvalid()}>
            <p class="text-[11px] text-secondary-400">
              Agregat komponen muncul saat seluruh sub terisi dan total bobotnya 100%.
            </p>
          </Show>
        </Show>

        <div class="flex justify-end gap-2">
          <Button variant="secondary" onClick={props.onClose}>
            {props.isLocked ? 'Tutup' : 'Batal'}
          </Button>
          <Show when={!props.isLocked}>
            <Button variant="primary" disabled={hasInvalid() || validSubs().length === 0} onClick={handleSave}>
              Simpan Draft
            </Button>
          </Show>
        </div>
      </div>
    </Modal>
  );
}
