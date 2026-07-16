import { type JSX, onCleanup, onMount, Show } from 'solid-js';

interface ModalProps {
  show?: boolean;
  isOpen?: boolean;
  title?: string;
  onClose?: () => void;
  children: JSX.Element;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal(props: ModalProps) {
  const isVisible = () => props.show ?? props.isOpen ?? false;
  const width = () => maxWidthClasses[props.maxWidth || 'md'];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isVisible()) {
      props.onClose?.();
    }
  };

  onMount(() => {
    document.addEventListener('keydown', handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <Show when={isVisible()}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Overlay */}
        <div
          class="absolute inset-0 bg-brand-900/40 backdrop-blur-sm animate-fade-in"
          onClick={() => props.onClose?.()}
        />

        {/* Modal Content */}
        <div
          class={`relative w-full ${width()} bg-white dark:bg-secondary-900 rounded-2xl shadow-2xl border border-secondary-100 dark:border-secondary-700 animate-scale-in`}
          role="dialog"
          aria-modal="true"
          aria-label={props.title || 'Dialog'}
        >
          {/* Header */}
          <Show when={props.title}>
            <div class="flex items-center justify-between px-6 py-4 border-b border-secondary-100 dark:border-secondary-700">
              <h3 class="text-lg font-heading font-semibold text-brand-900 dark:text-white">{props.title}</h3>
              <button
                onClick={() => props.onClose?.()}
                aria-label="Tutup dialog"
                class="p-1.5 rounded-full text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100 dark:hover:text-secondary-300 dark:hover:bg-secondary-800 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </Show>

          {/* Body */}
          <div class="max-h-[70vh] overflow-y-auto p-6">{props.children}</div>
        </div>
      </div>
    </Show>
  );
}
