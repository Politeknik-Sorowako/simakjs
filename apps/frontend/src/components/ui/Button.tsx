import { type JSX, splitProps } from 'solid-js';

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variantClasses = {
  primary:
    'bg-gradient-to-r from-brand-800 to-brand-900 hover:from-brand-700 hover:to-brand-800 text-white shadow-md shadow-brand-900/20 focus:ring-brand-500/30',
  secondary:
    'bg-secondary-100 hover:bg-secondary-200 text-secondary-800 border border-secondary-200 focus:ring-secondary-400/30 dark:bg-secondary-800 dark:hover:bg-secondary-700 dark:text-white dark:border-secondary-700',
  danger:
    'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-md shadow-red-500/20 focus:ring-red-500/30',
  success:
    'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md shadow-emerald-500/20 focus:ring-emerald-500/30',
  warning:
    'bg-gradient-to-r from-accent-400 to-accent-500 hover:from-accent-500 hover:to-accent-600 text-brand-900 font-semibold shadow-md shadow-accent-400/20 focus:ring-accent-400/30',
  ghost:
    'bg-transparent hover:bg-secondary-100 text-secondary-700 dark:hover:bg-secondary-800 dark:text-secondary-300 focus:ring-secondary-400/30',
  accent:
    'bg-accent-400 hover:bg-accent-500 text-brand-900 font-semibold shadow-md shadow-accent-400/20 focus:ring-accent-400/30',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
};

export function Button(props: ButtonProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'loading', 'class', 'disabled', 'children']);
  const variantClass = () => variantClasses[local.variant || 'primary'];
  const sizeClass = () => sizeClasses[local.size || 'md'];

  return (
    <button
      {...others}
      disabled={local.disabled || local.loading}
      class={`inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-secondary-900 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variantClass()} ${sizeClass()} ${local.class || ''}`}
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
