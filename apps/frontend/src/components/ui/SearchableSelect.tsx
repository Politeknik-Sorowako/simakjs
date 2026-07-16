import { createEffect, createSignal, For, onCleanup, onMount, Show } from 'solid-js';

interface SelectOption {
  value: string | number;
  label: string;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value?: string | number;
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
    w-full px-4 py-2.5 pr-10 rounded-xl border bg-white text-sm text-secondary-800
    placeholder:text-secondary-400
    focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-brand-700
    transition-all duration-200
    dark:bg-secondary-900 dark:border-secondary-700 dark:text-white dark:placeholder:text-secondary-500
    dark:focus:ring-accent-400/20 dark:focus:border-brand-500
  `;

  return (
    <div ref={containerRef} class="relative flex flex-col gap-1.5">
      <Show when={props.label}>
        <label class="text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400">
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
          class={`${baseInputClasses} ${props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400' : ''}`}
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
        <div class="absolute z-50 w-full mt-1 bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-xl shadow-lg max-h-60 overflow-y-auto animate-slide-down">
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
                      ? 'bg-accent-50 text-brand-900 font-semibold dark:bg-accent-900/30 dark:text-accent-400'
                      : i() === highlightIndex()
                        ? 'bg-brand-50 dark:bg-secondary-700'
                        : 'text-secondary-700 hover:bg-brand-50/50 dark:text-secondary-300 dark:hover:bg-secondary-700/50'
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
        <p class="text-xs text-red-500 dark:text-red-400">{props.error}</p>
      </Show>
    </div>
  );
}
