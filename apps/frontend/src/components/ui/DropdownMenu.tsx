import { createSignal, For, type JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';

export type DropdownMenuItem =
  | {
      separator: true;
      label?: string;
      icon?: string;
      onClick?: () => void;
      disabled?: boolean;
      danger?: boolean;
      loading?: boolean;
    }
  | {
      separator?: false;
      label: string;
      icon?: string;
      onClick?: () => void;
      disabled?: boolean;
      danger?: boolean;
      loading?: boolean;
    };

interface DropdownMenuProps {
  trigger: JSX.Element;
  triggerClass?: string;
  triggerAriaLabel?: string;
  items: DropdownMenuItem[];
  position?: 'left' | 'right';
}

export function DropdownMenu(props: DropdownMenuProps) {
  const [open, setOpen] = createSignal(false);
  const [resolvedPos, setResolvedPos] = createSignal<'left' | 'right'>(props.position === 'left' ? 'left' : 'right');
  const [local] = splitProps(props, ['trigger', 'triggerClass', 'triggerAriaLabel', 'items', 'position']);
  let triggerRef: HTMLButtonElement | undefined;

  const resolvePosition = () => {
    if (!triggerRef) return;
    const rect = triggerRef.getBoundingClientRect();
    const preferred: 'left' | 'right' = local.position === 'left' ? 'left' : 'right';
    const panelWidth = 176;
    const gap = 8;
    const fitsRight = rect.left + panelWidth + gap <= window.innerWidth;
    const fitsLeft = rect.left - panelWidth - gap >= 0;
    if (preferred === 'left' ? fitsRight : fitsLeft) {
      setResolvedPos(preferred);
    } else if (fitsRight) {
      setResolvedPos('left');
    } else if (fitsLeft) {
      setResolvedPos('right');
    } else {
      setResolvedPos(preferred);
    }
  };

  const panelClass = () =>
    `absolute mt-1 min-w-44 rounded-lg border border-secondary-200/80 bg-white py-1 shadow-xl dark:border-secondary-700 dark:bg-secondary-800 ${
      resolvedPos() === 'left' ? 'left-0' : 'right-0'
    }`;

  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as Node | null;
    if (target && !(target as Element).closest?.('[data-dropdown]')) {
      setOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleDocumentClick);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleDocumentClick);
  });

  return (
    <div data-dropdown class="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-label={local.triggerAriaLabel || 'Aksi'}
        aria-expanded={open()}
        onClick={(e) => {
          e.stopPropagation();
          const next = !open();
          if (next) resolvePosition();
          setOpen(next);
        }}
        class={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 active:scale-[0.98] ${
          local.triggerClass ||
          'p-2 rounded-lg bg-secondary-100 hover:bg-secondary-200 text-secondary-700 dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:text-secondary-300'
        }`}
      >
        {local.trigger}
      </button>
      <Show when={open()}>
        <div class={panelClass()} role="menu" aria-label={local.triggerAriaLabel || 'Aksi'}>
          <For each={local.items}>
            {(item) => (
              <Show
                when={item.separator}
                fallback={
                  <button
                    type="button"
                    role="menuitem"
                    disabled={item.disabled || item.loading}
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpen(false);
                      item.onClick?.();
                    }}
                    class={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                      item.danger
                        ? 'text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20'
                        : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-200 dark:hover:bg-secondary-700'
                    }`}
                  >
                    <Show when={item.icon}>
                      <span class="w-4 text-center text-base leading-none" aria-hidden="true">
                        {item.icon}
                      </span>
                    </Show>
                    <span>{item.loading ? 'Memproses...' : item.label}</span>
                  </button>
                }
              >
                <div class="my-1 border-t border-secondary-200/80 dark:border-secondary-700" />
              </Show>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
