import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

export interface SelectOption {
  label: string;
  value: string | number;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value?: string | number | null;
  onChange: (value: string | number) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  class?: string;
  onSearch?: (query: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export function SearchableSelect(props: SearchableSelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [searchText, setSearchText] = createSignal('');
  const [highlightIndex, setHighlightIndex] = createSignal(0);
  let containerRef: HTMLDivElement | undefined;
  let searchInputRef: HTMLInputElement | undefined;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const selectedOption = () => props.options.find((o) => String(o.value) === String(props.value));

  const filteredOptions = () => {
    const query = searchText().toLowerCase().trim();
    const list = query ? props.options.filter((o) => o.label.toLowerCase().includes(query)) : props.options;
    return list.slice(0, 50); // Performance optimization: cap rendering at 50 options
  };

  const handleSearchInput = (value: string) => {
    setSearchText(value);
    setHighlightIndex(0);
    if (props.onSearch) {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => props.onSearch?.(value), 300);
    }
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleClickOutside);
    onCleanup(() => document.removeEventListener('click', handleClickOutside));
  });

  const handleKeyDown = (e: KeyboardEvent) => {
    const options = filteredOptions();
    if (!isOpen()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
        setHighlightIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[highlightIndex()]) {
        props.onChange(options[highlightIndex()].value);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const toggleDropdown = () => {
    if (!props.disabled) {
      const nextOpen = !isOpen();
      setIsOpen(nextOpen);
      if (nextOpen) {
        setSearchText('');
        setHighlightIndex(0);
        setTimeout(() => searchInputRef?.focus(), 50);
      }
    }
  };

  return (
    <div class={`flex flex-col gap-1.5 w-full ${props.class || ''}`} ref={containerRef} onKeyDown={handleKeyDown}>
      <Show when={props.label}>
        <label class="block text-xs font-semibold uppercase tracking-wider text-secondary-600 dark:text-secondary-200">
          {props.label}
          {props.required ? ' *' : ''}
        </label>
      </Show>

      <div class="relative w-full">
        {/* Trigger Button */}
        <button
          type="button"
          role="combobox"
          aria-expanded={isOpen()}
          aria-haspopup="listbox"
          disabled={props.disabled}
          onClick={toggleDropdown}
          class={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-sm transition-colors text-left focus:outline-none focus:ring-2 focus:ring-brand-500 ${
            props.disabled
              ? 'bg-secondary-100 dark:bg-secondary-800 text-secondary-400 cursor-not-allowed border-secondary-200 dark:border-secondary-700'
              : 'bg-white dark:bg-secondary-900 text-secondary-900 dark:text-white border-secondary-300 dark:border-secondary-700 hover:border-secondary-400 dark:hover:border-secondary-600'
          }`}
        >
          <span class={`truncate ${!selectedOption() ? 'text-secondary-400 dark:text-secondary-500' : ''}`}>
            {selectedOption()?.label || props.placeholder || '-- Pilih Pilihan --'}
          </span>
          <svg
            class={`w-4 h-4 transition-transform text-secondary-400 shrink-0 ${isOpen() ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Popover */}
        <Show when={isOpen()}>
          <div class="absolute z-50 mt-1.5 w-full rounded-2xl bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 shadow-xl overflow-hidden p-2 flex flex-col gap-2">
            {/* Search Input Box inside dropdown */}
            <div class="relative">
              <input
                ref={searchInputRef}
                type="text"
                autofocus
                placeholder="Ketik untuk mencari..."
                value={searchText()}
                onInput={(e) => handleSearchInput(e.currentTarget.value)}
                class="w-full rounded-lg border border-secondary-200 bg-secondary-50 px-3 py-1.5 text-xs text-secondary-900 focus:border-brand-500 focus:outline-none dark:border-secondary-700 dark:bg-secondary-800 dark:text-white"
              />
              <Show when={searchText()}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('');
                    setHighlightIndex(0);
                  }}
                  class="absolute right-2 top-1.5 text-xs text-secondary-400 hover:text-secondary-600"
                >
                  ✕
                </button>
              </Show>
            </div>

            {/* Options List */}
            <div class="max-h-56 overflow-y-auto flex flex-col gap-0.5" role="listbox">
              <Show when={props.isLoading}>
                <p class="text-xs text-secondary-400 text-center py-2">Memuat...</p>
              </Show>
              <For
                each={filteredOptions()}
                fallback={
                  <p class="text-xs text-secondary-400 text-center py-3">
                    {props.isLoading ? 'Memuat...' : 'Tidak ada pilihan yang cocok.'}
                  </p>
                }
              >
                {(opt, idx) => {
                  const isSelected = () => String(opt.value) === String(props.value);
                  const isHighlighted = () => idx() === highlightIndex();
                  return (
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected()}
                      onClick={() => {
                        props.onChange(opt.value);
                        setIsOpen(false);
                      }}
                      class={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex justify-between items-center ${
                        isHighlighted()
                          ? 'bg-brand-100 dark:bg-brand-800/40 text-brand-900 dark:text-brand-100 font-semibold'
                          : ''
                      } ${
                        isSelected()
                          ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 font-bold'
                          : 'text-secondary-700 dark:text-secondary-200 hover:bg-secondary-100 dark:hover:bg-secondary-800'
                      }`}
                    >
                      <span class="truncate">{opt.label}</span>
                      <Show when={isSelected()}>
                        <span class="text-brand-600 font-bold">✓</span>
                      </Show>
                    </button>
                  );
                }}
              </For>
              <Show when={props.hasMore && props.onLoadMore && !props.isLoading}>
                <button
                  type="button"
                  onClick={() => props.onLoadMore?.()}
                  class="w-full text-xs text-center py-2 mt-1 text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-semibold hover:bg-secondary-100 dark:hover:bg-secondary-800 rounded-lg transition-colors"
                >
                  Muat lebih banyak...
                </button>
              </Show>
              <Show when={props.isLoading && props.options.length > 0}>
                <p class="text-xs text-secondary-400 text-center py-1">Memuat...</p>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
