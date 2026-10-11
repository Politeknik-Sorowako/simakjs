import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

export interface MultiSearchableOption {
  id: number;
  label: string; // e.g. "TI-3A — Pemrograman Web (Budi, M.Kom)"
  subLabel?: string; // e.g. "Mata Kuliah: Pemrograman Web | Dosen: Budi, M.Kom"
  badgeText?: string; // e.g. "TI-3A"
}

interface MultiSearchableSelectProps {
  options: MultiSearchableOption[];
  selectedIds: number[];
  onChange: (selectedIds: number[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
}

export function MultiSearchableSelect(props: MultiSearchableSelectProps) {
  const [searchTerm, setSearchTerm] = createSignal('');
  const [isOpen, setIsOpen] = createSignal(false);
  let containerRef: HTMLDivElement | undefined;
  let inputRef: HTMLInputElement | undefined;

  // Selected items memo
  const selectedItems = createMemo(() => {
    const idSet = new Set(props.selectedIds);
    return props.options.filter((opt) => idSet.has(opt.id));
  });

  // Filtered available options (exclude already selected, match query)
  const availableFilteredOptions = createMemo(() => {
    const idSet = new Set(props.selectedIds);
    const query = searchTerm().toLowerCase().trim();

    return props.options.filter((opt) => {
      if (idSet.has(opt.id)) return false;
      if (!query) return true;
      const matchLabel = opt.label.toLowerCase().includes(query);
      const matchSub = opt.subLabel ? opt.subLabel.toLowerCase().includes(query) : false;
      const matchBadge = opt.badgeText ? opt.badgeText.toLowerCase().includes(query) : false;
      return matchLabel || matchSub || matchBadge;
    });
  });

  const handleSelect = (id: number) => {
    if (!props.selectedIds.includes(id)) {
      props.onChange([...props.selectedIds, id]);
    }
    setSearchTerm('');
    inputRef?.focus();
  };

  const handleRemove = (id: number) => {
    props.onChange(props.selectedIds.filter((item) => item !== id));
  };

  const handleClearAll = () => {
    props.onChange([]);
    setSearchTerm('');
  };

  // Close dropdown on outside click
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleClickOutside);
  });

  return (
    <div class="relative w-full" ref={containerRef}>
      {/* Search Input Box & Badges */}
      <div
        class={`min-h-[44px] w-full p-1.5 flex flex-wrap items-center gap-1.5 rounded-xl border transition-all ${
          isOpen()
            ? 'border-brand-500 ring-2 ring-brand-100 dark:ring-brand-900/30'
            : 'border-secondary-200 dark:border-secondary-700 hover:border-secondary-300 dark:hover:border-secondary-600'
        } bg-white dark:bg-secondary-900`}
        onClick={() => {
          if (!props.disabled) {
            setIsOpen(true);
            inputRef?.focus();
          }
        }}
      >
        {/* Selected Chips */}
        <For items={selectedItems()}>
          {(item) => (
            <span class="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border border-brand-200 dark:border-brand-800 animate-in fade-in zoom-in-95 duration-100">
              <span class="truncate max-w-[200px]" title={item.label}>
                {item.badgeText || item.label}
              </span>
              <button
                type="button"
                disabled={props.disabled}
                class="hover:bg-brand-200 dark:hover:bg-brand-700/50 p-0.5 rounded text-brand-600 dark:text-brand-400 transition-colors focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item.id);
                }}
                title="Hapus"
              >
                ✕
              </button>
            </span>
          )}
        </For>

        {/* Input */}
        <div class="flex-1 min-w-[140px] flex items-center">
          <input
            ref={inputRef}
            type="text"
            disabled={props.disabled}
            value={searchTerm()}
            onInput={(e) => {
              setSearchTerm(e.currentTarget.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={
              selectedItems().length === 0
                ? props.placeholder || 'Ketik mata kuliah, dosen, atau kelas...'
                : 'Tambah pilihan...'
            }
            class="w-full bg-transparent px-1.5 py-1 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none"
          />
        </div>

        {/* Controls: Clear all & dropdown arrow */}
        <div class="flex items-center gap-1 pr-1 text-secondary-400 shrink-0">
          <Show when={props.selectedIds.length > 0 && !props.disabled}>
            <button
              type="button"
              class="text-xs text-secondary-400 hover:text-red-500 px-1 py-0.5 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleClearAll();
              }}
              title="Hapus semua pilihan"
            >
              Reset ({props.selectedIds.length})
            </button>
          </Show>
          <span class="text-xs transition-transform duration-200" classList={{ 'rotate-180': isOpen() }}>
            ▼
          </span>
        </div>
      </div>

      {/* Dropdown Options */}
      <Show when={isOpen() && !props.disabled}>
        <div class="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 shadow-xl py-1 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <Show
            when={availableFilteredOptions().length > 0}
            fallback={
              <div class="px-4 py-3 text-center text-xs text-secondary-400 italic">
                {searchTerm().trim()
                  ? `Tidak ada pilihan yang cocok dengan "${searchTerm()}"`
                  : props.emptyMessage || 'Semua pilihan sudah dipilih.'}
              </div>
            }
          >
            <div class="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-secondary-400 border-b border-secondary-100 dark:border-secondary-800">
              Saran Pilihan ({availableFilteredOptions().length})
            </div>
            <For items={availableFilteredOptions()}>
              {(opt) => (
                <button
                  type="button"
                  class="w-full text-left px-3 py-2 flex flex-col gap-0.5 hover:bg-brand-50 dark:hover:bg-brand-900/20 text-secondary-800 dark:text-secondary-200 transition-colors focus:bg-brand-50 dark:focus:bg-brand-900/20 focus:outline-none cursor-pointer"
                  onClick={() => handleSelect(opt.id)}
                >
                  <div class="font-medium text-secondary-900 dark:text-white flex items-center justify-between gap-2">
                    <span class="truncate">{opt.label}</span>
                    <Show when={opt.badgeText}>
                      <span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300">
                        {opt.badgeText}
                      </span>
                    </Show>
                  </div>
                  <Show when={opt.subLabel}>
                    <div class="text-xs text-secondary-500 dark:text-secondary-400 truncate">{opt.subLabel}</div>
                  </Show>
                </button>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
