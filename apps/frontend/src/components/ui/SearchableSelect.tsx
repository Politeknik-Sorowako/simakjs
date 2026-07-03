import { createSignal, createEffect, onCleanup, Show, For } from 'solid-js';

interface Option {
  label: string;
  value: string | number;
}

interface SearchableSelectProps {
  label?: string;
  placeholder?: string;
  options: Option[];
  value: string | number | null;
  onChange: (value: string | number | null) => void;
  error?: string;
}

export function SearchableSelect(props: SearchableSelectProps) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [search, setSearch] = createSignal('');
  let containerRef: HTMLDivElement | undefined;

  // Dapatkan opsi terpilih saat ini
  const selectedOption = () => props.options.find(opt => opt.value === props.value);

  // Set pencarian awal ke label terpilih
  createEffect(() => {
    const selected = selectedOption();
    if (selected && !isOpen()) {
      setSearch(selected.label);
    } else if (!selected && !isOpen()) {
      setSearch('');
    }
  });

  // Filter opsi berdasarkan input pencarian
  const filteredOptions = () => {
    const term = search().toLowerCase();
    if (!term || selectedOption()?.label.toLowerCase() === term) {
      return props.options;
    }
    return props.options.filter(opt =>
      opt.label.toLowerCase().includes(term)
    );
  };

  // Close dropdown when clicking outside
  const handleClickOutside = (e: MouseEvent) => {
    if (containerRef && !containerRef.contains(e.target as Node)) {
      setIsOpen(false);
      // Restore search input to selected option label
      const selected = selectedOption();
      setSearch(selected ? selected.label : '');
    }
  };

  document.addEventListener('click', handleClickOutside);
  onCleanup(() => document.removeEventListener('click', handleClickOutside));

  const handleSelect = (opt: Option) => {
    props.onChange(opt.value);
    setSearch(opt.label);
    setIsOpen(false);
  };

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation();
    props.onChange(null);
    setSearch('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} class="flex flex-col gap-1.5 w-full relative">
      {props.label && (
        <label class="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {props.label}
        </label>
      )}
      <div class="relative">
        <input
          type="text"
          placeholder={props.placeholder || 'Pilih opsi...'}
          value={search()}
          onInput={(e) => {
            setSearch(e.currentTarget.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          class={`w-full px-4 py-2.5 pr-10 rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm shadow-sm text-slate-900 ${
            props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : 'border-gray-200'
          }`}
        />
        <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <Show when={props.value !== null && props.value !== ''}>
            <button
              type="button"
              onClick={handleClear}
              class="text-gray-400 hover:text-gray-600 focus:outline-none text-xs p-1"
            >
              ✕
            </button>
          </Show>
          <span class="text-gray-400 pointer-events-none text-xs">▼</span>
        </div>
      </div>

      <Show when={isOpen()}>
        <div class="absolute z-50 left-0 right-0 mt-1 top-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <For each={filteredOptions()}>
            {(opt) => (
              <button
                type="button"
                onClick={() => handleSelect(opt)}
                class={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${
                  opt.value === props.value ? 'bg-blue-50/50 font-semibold text-blue-600' : 'text-slate-700'
                }`}
              >
                {opt.label}
              </button>
            )}
          </For>
          <Show when={filteredOptions().length === 0}>
            <div class="px-4 py-3 text-sm text-gray-400 text-center">
              Tidak ada hasil ditemukan.
            </div>
          </Show>
        </div>
      </Show>

      {props.error && (
        <span class="text-xs text-red-500 font-medium">{props.error}</span>
      )}
    </div>
  );
}
