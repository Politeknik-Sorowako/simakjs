import { createSignal, For, type JSX, onCleanup, onMount, Show, splitProps } from 'solid-js';
import { Portal } from 'solid-js/web';

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
  disabled?: boolean;
}

interface Coords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight?: number;
}

export function DropdownMenu(props: DropdownMenuProps) {
  const [open, setOpen] = createSignal(false);
  const [coords, setCoords] = createSignal<Coords>({});
  const [local] = splitProps(props, ['trigger', 'triggerClass', 'triggerAriaLabel', 'items', 'position', 'disabled']);
  let triggerRef: HTMLButtonElement | undefined;
  let panelRef: HTMLDivElement | undefined;

  const resolvePosition = () => {
    if (!triggerRef) return;
    const rect = triggerRef.getBoundingClientRect();

    // Tutup jika tombol pemicu sudah tidak terlihat di viewport
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const minDropdownHeight = 240;

    // Buka ke atas jika ruang di bawah sempit (< 240px) dan ruang di atas lebih leluasa
    const openUp = spaceBelow < minDropdownHeight && spaceAbove > spaceBelow;

    const newCoords: Coords = {};
    if (openUp) {
      newCoords.bottom = Math.round(window.innerHeight - rect.top + 6);
      newCoords.maxHeight = Math.max(140, Math.min(spaceAbove - 16, 420));
    } else {
      newCoords.top = Math.round(rect.bottom + 6);
      newCoords.maxHeight = Math.max(140, Math.min(spaceBelow - 16, 420));
    }

    const preferred = local.position === 'left' ? 'left' : 'right';
    const panelMinWidth = 190;
    const margin = 8;

    if (preferred === 'right') {
      const rightOffset = window.innerWidth - rect.right;
      if (rect.right - panelMinWidth < margin) {
        newCoords.left = margin;
      } else {
        newCoords.right = Math.max(margin, Math.round(rightOffset));
      }
    } else {
      if (rect.left + panelMinWidth > window.innerWidth - margin) {
        newCoords.right = margin;
      } else {
        newCoords.left = Math.max(margin, Math.round(rect.left));
      }
    }

    setCoords(newCoords);
  };

  const handleDocumentClick = (e: MouseEvent) => {
    const target = e.target as Node | null;
    if (!target) return;
    if (triggerRef?.contains(target)) return;
    if (panelRef?.contains(target)) return;
    setOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open()) {
      setOpen(false);
      triggerRef?.focus();
    }
  };

  const handleScrollOrResize = () => {
    if (open()) {
      resolvePosition();
    }
  };

  onMount(() => {
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleScrollOrResize);
    window.removeEventListener('scroll', handleScrollOrResize, true);
  });

  return (
    <div data-dropdown class="relative inline-block text-left">
      <button
        ref={triggerRef}
        type="button"
        aria-label={local.triggerAriaLabel || 'Aksi'}
        aria-expanded={open()}
        disabled={local.disabled}
        onClick={(e) => {
          if (local.disabled) return;
          e.stopPropagation();
          const next = !open();
          if (next) resolvePosition();
          setOpen(next);
        }}
        class={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          local.triggerClass ||
          'p-2 rounded-lg bg-secondary-100 hover:bg-secondary-200 text-secondary-700 dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:text-secondary-300'
        }`}
      >
        {local.trigger}
      </button>

      <Show when={open()}>
        <Portal>
          <div
            ref={panelRef}
            role="menu"
            aria-label={local.triggerAriaLabel || 'Aksi'}
            class="fixed z-[9999] min-w-48 max-w-xs rounded-2xl border border-hairline dark:border-secondary-700/80 bg-white/95 dark:bg-secondary-800/95 backdrop-blur-md p-1.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10 overflow-y-auto transition-opacity duration-150 animate-in fade-in"
            style={{
              top: coords().top !== undefined ? `${coords().top}px` : undefined,
              bottom: coords().bottom !== undefined ? `${coords().bottom}px` : undefined,
              left: coords().left !== undefined ? `${coords().left}px` : undefined,
              right: coords().right !== undefined ? `${coords().right}px` : undefined,
              'max-height': coords().maxHeight ? `${coords().maxHeight}px` : 'min(420px, 80vh)',
            }}
          >
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
                      class={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium rounded-xl transition-colors focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                        item.danger
                          ? 'text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20'
                          : 'text-secondary-700 hover:bg-secondary-100 dark:text-secondary-200 dark:hover:bg-secondary-700'
                      }`}
                    >
                      <Show when={item.icon}>
                        <span class="w-4 text-center text-sm leading-none shrink-0" aria-hidden="true">
                          {item.icon}
                        </span>
                      </Show>
                      <span class="truncate">{item.loading ? 'Memproses...' : item.label}</span>
                    </button>
                  }
                >
                  <div class="my-1 border-t border-hairline dark:border-secondary-700/60" />
                </Show>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </div>
  );
}
