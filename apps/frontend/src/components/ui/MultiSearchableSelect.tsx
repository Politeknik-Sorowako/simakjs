import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

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
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
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

  // Reset highlighted index when options or search term change
  createEffect(() => {
    searchTerm();
    availableFilteredOptions();
    setHighlightedIndex(-1);
  });

  const handleSelect = (id: number) => {
    if (!props.selectedIds.includes(id)) {
      props.onChange([...props.selectedIds, id]);
    }
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef?.focus();
  };

  const handleSelectAllFiltered = () => {
    const newIds = availableFilteredOptions().map((opt) => opt.id);
    const uniqueIds = Array.from(new Set([...props.selectedIds, ...newIds]));
    props.onChange(uniqueIds);
    setSearchTerm('');
    setHighlightedIndex(-1);
    inputRef?.focus();
  };

  const handleRemove = (id: number) => {
    props.onChange(props.selectedIds.filter((item) => item !== id));
  };

  const handleClearAll = () => {
    props.onChange([]);
    setSearchTerm('');
    setHighlightedIndex(-1);
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (props.disabled) return;
    const options = availableFilteredOptions();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen()) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (options.length > 0) {
        setHighlightedIndex((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen()) {
        setIsOpen(true);
        setHighlightedIndex(options.length - 1);
      } else if (options.length > 0) {
        setHighlightedIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen() && options.length > 0) {
        const indexToSelect = highlightedIndex() >= 0 ? highlightedIndex() : 0;
        if (options[indexToSelect]) {
          handleSelect(options[indexToSelect].id);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === 'Backspace' && searchTerm() === '' && props.selectedIds.length > 0) {
      // Remove the last selected chip when input is empty
      const lastId = props.selectedIds[props.selectedIds.length - 1];
      handleRemove(lastId);
    }
  };

  // Close dropdown on outside click
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
      setHighlightedIndex(-1);
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
        <For each={selectedItems()}>
          {(item) => (
            <span class="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300 border border-brand-200 dark:border-brand-800 animate-in fade-in zoom-in-95 duration-100 shadow-2xs">
              <span class="truncate max-w-[220px]" title={item.label}>
                {item.badgeText || item.label}
              </span>
              <button
                type="button"
                disabled={props.disabled}
                class="hover:bg-brand-200 dark:hover:bg-brand-700/50 p-0.5 rounded text-brand-600 dark:text-brand-400 transition-colors focus:outline-none cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item.id);
                }}
                title="Hapus pilihan ini"
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
            onKeyDown={handleKeyDown}
            placeholder={
              selectedItems().length === 0
                ? props.placeholder || 'Ketik mata kuliah, dosen, atau kelas...'
                : 'Tambah pilihan...'
            }
            class="w-full bg-transparent px-1.5 py-1 text-sm text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none"
          />
        </div>

        {/* Controls: Clear all & dropdown arrow */}
        <div class="flex items-center gap-1.5 pr-1 text-secondary-400 shrink-0">
          <Show when={props.selectedIds.length > 0 && !props.disabled}>
            <button
              type="button"
              class="text-xs font-medium text-secondary-400 hover:text-red-500 px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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
        <div class="absolute z-[60] mt-1.5 w-full max-h-64 overflow-y-auto rounded-2xl bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 shadow-2xl py-1 text-sm animate-in fade-in slide-in-from-top-2 duration-150">
          <Show
            when={availableFilteredOptions().length > 0}
            fallback={
              <div class="px-4 py-4 text-center text-xs text-secondary-400 italic">
                {searchTerm().trim()
                  ? `Tidak ada pilihan yang cocok dengan "${searchTerm()}"`
                  : props.emptyMessage || 'Semua pilihan sudah dipilih.'}
              </div>
            }
          >
            {/* Header info & Bulk action */}
            <div class="px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-secondary-500 dark:text-secondary-400 border-b border-secondary-100 dark:border-secondary-800 bg-secondary-50/50 dark:bg-secondary-800/40">
              <span class="uppercase tracking-wider">Saran Pilihan ({availableFilteredOptions().length})</span>
              <Show when={availableFilteredOptions().length > 1}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectAllFiltered();
                  }}
                  class="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  + Pilih Semua ({availableFilteredOptions().length})
                </button>
              </Show>
            </div>

            {/* List Options */}
            <For each={availableFilteredOptions()}>
              {(opt, index) => {
                const isHighlighted = () => index() === highlightedIndex();

                return (
                  <button
                    type="button"
                    class={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 border-b border-secondary-50 dark:border-secondary-800/50 last:border-b-0 transition-colors cursor-pointer ${
                      isHighlighted()
                        ? 'bg-brand-50/80 dark:bg-brand-900/30'
                        : 'hover:bg-secondary-50 dark:hover:bg-secondary-800/60'
                    }`}
                    onMouseEnter={() => setHighlightedIndex(index())}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt.id);
                    }}
                    onClick={() => handleSelect(opt.id)}
                  >
                    <div class="flex-1 min-w-0">
                      <div class="font-medium text-secondary-900 dark:text-white flex items-center gap-2">
                        <span class="truncate">{opt.label}</span>
                        <Show when={opt.badgeText}>
                          <span class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-secondary-100 dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300">
                            {opt.badgeText}
                          </span>
                        </Show>
                      </div>
                      <Show when={opt.subLabel}>
                        <div class="text-xs text-secondary-500 dark:text-secondary-400 truncate mt-0.5">
                          {opt.subLabel}
                        </div>
                      </Show>
                    </div>

                    <span class="shrink-0 text-xs font-semibold px-2 py-1 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300 border border-brand-200/60 dark:border-brand-700/60 transition-all opacity-80 group-hover:opacity-100">
                      + Tambah
                    </span>
                  </button>
                );
              }}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
