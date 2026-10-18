import { type JSX, splitProps } from 'solid-js';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

/**
 * Token interaktif mengikuti DESIGN.md: satu aksen Action Blue (#0066cc) untuk
 * seluruh elemen"klik me", bentuk kapsul penuh (pill) sebagai penanda aksi, dan
 * TIDAK ada shadow pada chrome — elevasi datang dari perbedaan permukaan
 * (putih ↔ parchment), bukan bayangan. `active:scale-95` adalah micro-interaction
 * sistem secara global.
 */
const variantClasses = {
  // Aksi utama — Action Blue pill
  primary:
    'bg-action text-white hover:bg-action-dark focus:ring-action-focus focus:ring-offset-0 dark:bg-action dark:hover:bg-action-dark',
  // Aksi sekunder — ghost pill, teks Action Blue
  secondary:
    'bg-transparent text-action border border-action hover:bg-action-50 focus:ring-action-focus focus:ring-offset-0 dark:text-action-ondark-ondark dark:border-action-ondark dark:hover:bg-action-ondark/10',
  // Status tetap memakai hue status (bukan aksen) agar meaning-nya jelas
  danger:
    'bg-danger-600 hover:bg-danger-700 text-white focus:ring-danger-500/30 focus:ring-offset-0 dark:bg-danger-600 dark:hover:bg-danger-500',
  success:
    'bg-success-600 hover:bg-success-700 text-white focus:ring-success-500/30 focus:ring-offset-0 dark:bg-success-600 dark:hover:bg-success-500',
  warning:
    'bg-warning-500 hover:bg-warning-600 text-ink font-semibold focus:ring-warning-400/30 focus:ring-offset-0 dark:bg-warning-500 dark:hover:bg-warning-400',
  ghost:
    'bg-transparent hover:bg-secondary-100/80 text-secondary-700 focus:ring-secondary-400/30 focus:ring-offset-0 dark:hover:bg-secondary-800/80 dark:text-secondary-300',
  // Di semenajui dengan aksi utama (aksen tunggal — DESIGN.md)
  accent:
    'bg-action text-white hover:bg-action-dark focus:ring-action-focus focus:ring-offset-0 dark:bg-action dark:hover:bg-action-dark',
};

const sizeClasses = {
  // Pill penuh = penanda"ini aksi" (DESIGN.md rounded.pill)
  sm: 'px-3 py-1.5 text-caption rounded-full',
  md: 'px-4 py-2.5 text-table rounded-full',
  lg: 'px-6 py-3 text-base rounded-full',
};

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'loading', 'class', 'disabled', 'children']);
  const variantClass = () => variantClasses[local.variant || 'primary'];
  const sizeClass = () => sizeClasses[local.size || 'md'];

  return (
    <button
      {...others}
      disabled={local.disabled || local.loading}
      class={`inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 focus:outline-none focus:ring-2 dark:focus:ring-offset-secondary-900 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variantClass()} ${sizeClass()} ${local.class || ''}`}
    >
      {local.loading && (
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {local.children}
    </button>
  );
}
