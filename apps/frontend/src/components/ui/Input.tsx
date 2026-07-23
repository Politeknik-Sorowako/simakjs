import { createSignal, For, type JSX, Show, splitProps } from 'solid-js';

interface SelectOption {
  value: string | number;
  label: string;
}

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  isSelect?: boolean;
  selectOptions?: SelectOption[];
}

export function Input(props: InputProps) {
  const [local, others] = splitProps(props, ['label', 'error', 'isSelect', 'selectOptions', 'class', 'id']);
  const inputId = () => local.id || `input-${Math.random().toString(36).slice(2, 9)}`;

  const baseClasses = `
    w-full px-4 py-2.5 rounded-xl border bg-white text-sm text-secondary-800
    placeholder:text-secondary-400
    focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-brand-700
    transition-all duration-200
    disabled:bg-secondary-50 disabled:text-secondary-400 disabled:cursor-not-allowed
    dark:bg-secondary-900 dark:border-secondary-700 dark:text-white dark:placeholder:text-secondary-500
    dark:focus:ring-accent-400/20 dark:focus:border-brand-500
    dark:disabled:bg-secondary-800 dark:disabled:text-secondary-600
  `;

  const errorClasses =
    'border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400/20';

  return (
    <div class="flex flex-col gap-1.5">
      <Show when={local.label}>
        <label
          for={inputId()}
          class="text-xs font-semibold uppercase tracking-wider text-secondary-500 dark:text-secondary-400"
        >
          {local.label}
        </label>
      </Show>

      <Show
        when={local.isSelect}
        fallback={
          <input
            {...others}
            id={inputId()}
            class={`${baseClasses} ${local.error ? errorClasses : ''} ${local.class || ''}`}
          />
        }
      >
        <select
          {...(others as unknown as JSX.SelectHTMLAttributes<HTMLSelectElement>)}
          id={inputId()}
          class={`${baseClasses} pr-10 appearance-none bg-no-repeat bg-[right_0.75rem_center] bg-[length:16px_16px] bg-[url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236c757d' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e")] ${local.error ? errorClasses : ''} ${local.class || ''}`}
        >
          <Show when={local.selectOptions}>
            <For each={local.selectOptions}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
          </Show>
        </select>
      </Show>

      <Show when={local.error}>
        <p class="text-xs text-red-500 dark:text-red-400">{local.error}</p>
      </Show>
    </div>
  );
}
