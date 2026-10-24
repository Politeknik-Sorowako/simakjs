import { For, type JSX, Show } from 'solid-js';

export interface TabItem<T extends string = string> {
  key: T;
  label: string | JSX.Element;
  count?: number | string;
  icon?: JSX.Element;
  title?: string;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  tabs: Array<TabItem<T>>;
  active: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  containerClass?: string;
  'aria-label'?: string;
  ariaLabel?: string;
}

const sizeClasses = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-1.5 text-xs font-semibold',
  lg: 'px-5 py-2 text-sm font-semibold',
};

/**
 * Capsule / Segmented Pill Tabs sesuai Apple Design System (DESIGN.md).
 * Track berbentuk kapsul (rounded-full) dengan pill aktif putih bershadow halus (shadow-sm)
 * dan micro-interaction active:scale-95.
 */
export function Tabs<T extends string = string>(props: TabsProps<T>) {
  const sizeClass = () => sizeClasses[props.size || 'md'];

  return (
    <div
      role="tablist"
      aria-label={props['aria-label'] || props.ariaLabel || 'Navigasi Tab'}
      class={`inline-flex max-w-full items-center overflow-x-auto rounded-full border border-secondary-200 bg-secondary-100/60 p-1 dark:border-secondary-700 dark:bg-secondary-900 ${
        props.containerClass || ''
      }`}
    >
      <For each={props.tabs}>
        {(tab) => {
          const isActive = () => props.active === tab.key;

          return (
            <button
              type="button"
              role="tab"
              aria-selected={isActive()}
              tabIndex={isActive() ? 0 : -1}
              disabled={tab.disabled}
              title={tab.title}
              onClick={() => {
                if (!tab.disabled && !isActive()) {
                  props.onChange(tab.key);
                }
              }}
              class={`inline-flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-all duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${sizeClass()} ${
                isActive()
                  ? 'bg-white text-action shadow-sm dark:bg-secondary-800 dark:text-brand-400'
                  : 'text-secondary-500 hover:text-secondary-700 dark:text-secondary-400 dark:hover:text-secondary-200'
              } ${props.class || ''}`}
            >
              <Show when={tab.icon}>
                <span class="inline-flex shrink-0 items-center">{tab.icon}</span>
              </Show>
              <span>{tab.label}</span>
              <Show when={tab.count !== undefined && tab.count !== null}>
                <span
                  class={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                    isActive()
                      ? 'bg-action-50 text-action dark:bg-action-ondark/20 dark:text-action-ondark'
                      : 'bg-secondary-200/80 text-secondary-600 dark:bg-secondary-700 dark:text-secondary-300'
                  }`}
                >
                  {tab.count}
                </span>
              </Show>
            </button>
          );
        }}
      </For>
    </div>
  );
}
