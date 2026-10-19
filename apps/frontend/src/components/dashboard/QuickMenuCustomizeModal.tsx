import { createEffect, createSignal, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import type { QuickMenuItem } from '../../config/quickMenu';

interface QuickMenuCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMenuIds: string[];
  availableMenus: QuickMenuItem[];
  onSave: (newIds: string[]) => Promise<void>;
  onResetDefault: () => void;
}

export function QuickMenuCustomizeModal(props: QuickMenuCustomizeModalProps) {
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);
  const [isSaving, setIsSaving] = createSignal(false);
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

  createEffect(() => {
    if (props.isOpen) {
      setSelectedIds([...props.selectedMenuIds]);
      setErrorMessage(null);
    }
  });

  const toggleItem = (id: string) => {
    const current = selectedIds();
    if (current.includes(id)) {
      setSelectedIds(current.filter((item) => item !== id));
      setErrorMessage(null);
    } else {
      if (current.length >= 6) {
        setErrorMessage('Maksimal 6 menu cepat untuk menjaga estetika tata letak dasbor.');
        return;
      }
      setSelectedIds([...current, id]);
      setErrorMessage(null);
    }
  };

  const handleSave = async () => {
    if (selectedIds().length === 0) {
      setErrorMessage('Pilih minimal 1 menu pintasan.');
      return;
    }
    setIsSaving(true);
    try {
      await props.onSave(selectedIds());
      props.onClose();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal menyimpan menu cepat');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    props.onResetDefault();
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div class="border-b border-secondary-200 dark:border-secondary-800 px-6 py-5 flex items-center justify-between shrink-0 bg-secondary-50/70 dark:bg-secondary-850">
              <div>
                <h3 class="text-lg font-bold text-secondary-900 dark:text-white">Atur Menu Cepat</h3>
                <p class="text-xs text-secondary-500 dark:text-secondary-400 mt-0.5">
                  Pilih menu yang paling sering Anda gunakan (maksimal 6 menu).
                </p>
              </div>
              <button
                type="button"
                onClick={props.onClose}
                class="p-2 text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200 rounded-full hover:bg-secondary-200/50 dark:hover:bg-secondary-800 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Subheader Counter & Feedback */}
            <div class="px-6 py-3 bg-secondary-100/60 dark:bg-secondary-800/40 border-b border-secondary-200/80 dark:border-secondary-800 flex items-center justify-between">
              <span class="text-xs font-semibold text-secondary-700 dark:text-secondary-300">
                Terpilih: <strong class="text-[#0066cc] dark:text-[#2997ff]">{selectedIds().length}</strong> dari 6
              </span>
              <button
                type="button"
                onClick={handleReset}
                class="text-xs font-medium text-[#0066cc] dark:text-[#2997ff] hover:underline cursor-pointer"
              >
                Kembalikan ke Default
              </button>
            </div>

            <Show when={errorMessage()}>
              <div class="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {errorMessage()}
              </div>
            </Show>

            {/* Catalog Grid */}
            <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-3 overscroll-contain scrollbar-thin">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <For each={props.availableMenus}>
                  {(menu) => {
                    const isChecked = () => selectedIds().includes(menu.id);
                    const isMaxReached = () => selectedIds().length >= 6 && !isChecked();

                    return (
                      <div
                        onClick={() => !isMaxReached() && toggleItem(menu.id)}
                        class={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all cursor-pointer select-none ${
                          isChecked()
                            ? 'border-[#0066cc] bg-[#0066cc]/5 dark:border-[#2997ff] dark:bg-[#2997ff]/10'
                            : isMaxReached()
                              ? 'opacity-40 border-secondary-200 dark:border-secondary-800 cursor-not-allowed'
                              : 'border-secondary-200 dark:border-secondary-800 hover:border-secondary-300 dark:hover:border-secondary-700 bg-white dark:bg-secondary-850'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked()}
                          disabled={isMaxReached()}
                          onChange={() => toggleItem(menu.id)}
                          class="rounded border-secondary-300 text-[#0066cc] focus:ring-[#0066cc] h-4 w-4"
                        />
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center bg-secondary-100 dark:bg-secondary-800 text-secondary-700 dark:text-secondary-200 shrink-0">
                          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d={menu.svgPath} />
                          </svg>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-semibold text-secondary-900 dark:text-white truncate">{menu.title}</p>
                          <p class="text-[11px] text-secondary-500 dark:text-secondary-400 truncate">
                            {menu.description}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>

            {/* Footer */}
            <div class="border-t border-secondary-200 dark:border-secondary-800 px-6 py-4 flex items-center justify-end gap-2.5 shrink-0 bg-secondary-50/70 dark:bg-secondary-850">
              <button
                type="button"
                onClick={props.onClose}
                class="px-4 py-2 rounded-full text-xs font-semibold text-secondary-600 dark:text-secondary-400 hover:bg-secondary-200/60 dark:hover:bg-secondary-800 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSaving()}
                onClick={handleSave}
                class="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#0066cc] hover:bg-[#0071e3] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSaving() ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
