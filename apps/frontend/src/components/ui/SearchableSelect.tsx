import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string | number | null;
  onChange?: (value: string | number) => void;
  error?: string;
}

export function SearchableSelect(props: SearchableSelectProps) {
  const [search, setSearch] = createSignal('');
  const [isOpen, setIsOpen] = createSignal(false);
  const [highlightIndex, setHighlightIndex] = createSignal(-1);
  let containerRef!: HTMLDivElement;
  let inputRef!: HTMLInputElement;

  const filtered = () => {
    const q = search().toLowerCase();
    return props.options.filter((opt) => opt.label.toLowerCase().includes(q));
  };

  const selectedLabel = () => props.options.find((o) => o.value === props.value)?.label || '';

  const handleSelect = (value: string | number) => {
    props.onChange?.(value);
    setSearch('');
    setIsOpen(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered().length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex() >= 0) {
      e.preventDefault();
      handleSelect(filtered()[highlightIndex()].value);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (!containerRef.contains(e.target as Node)) {
      setIsOpen(false);
      setSearch('');
      setHighlightIndex(-1);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  createEffect(() => {
    if (!isOpen()) setHighlightIndex(-1);
  });

  const baseInputClasses = `
    w-full px-4 py-2.5 pr-10 rounded-xl border border-secondary-200 bg-white text-sm text-secondary-800
    placeholder:text-secondary-400
    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-600
    transition-all duration-200
    dark:bg-secondary-900 dark:border-secondary-700 dark:text-secondary-100 dark:placeholder:text-secondary-500
    dark:focus:ring-primary-500/30 dark:focus:border-primary-500
  `;

  return (
    <div ref={containerRef} class="relative flex flex-col gap-1.5">
      <Show when={props.label}>
        <label class="text-xs font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
          {props.label}
        </label>
      </Show>

      <div class="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen() ? search() : selectedLabel()}
          placeholder={props.placeholder || 'Pilih...'}
          readonly={!isOpen()}
          onfocus={() => setIsOpen(true)}
          onInput={(e) => setSearch(e.currentTarget.value)}
          onkeydown={handleKeyDown}
          class={`${baseInputClasses} ${props.error ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20 dark:border-danger-400' : ''}`}
        />

        {/* Clear button */}
        <Show when={props.value && isOpen()}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              props.onChange?.('');
              setSearch('');
              inputRef.focus();
            }}
            class="absolute right-8 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-700"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </Show>

        {/* Chevron */}
        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg
            class={`w-4 h-4 text-secondary-400 transition-transform duration-200 ${isOpen() ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      <Show when={isOpen()}>
        <div class="absolute z-50 w-full mt-1 bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-slide-down">
          <Show
            when={filtered().length > 0}
            fallback={
              <div class="px-4 py-3 text-sm text-secondary-500 dark:text-secondary-400 text-center">
                Tidak ada hasil ditemukan.
              </div>
            }
          >
            <For each={filtered()}>
              {(opt, i) => (
                <button
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  class={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    opt.value === props.value
                      ? 'bg-primary-50 text-primary-700 font-semibold dark:bg-primary-900/40 dark:text-primary-400'
                      : i() === highlightIndex()
                        ? 'bg-secondary-100 dark:bg-secondary-800'
                        : 'text-secondary-700 hover:bg-secondary-50 dark:text-secondary-300 dark:hover:bg-secondary-800/60'
                  }`}
                >
                  {opt.label}
                </button>
              )}
            </For>
          </Show>
        </div>
      </Show>

      <Show when={props.error}>
        <p class="text-xs text-danger-600 dark:text-danger-400">{props.error}</p>
      </Show>
    </div>
  );
}
