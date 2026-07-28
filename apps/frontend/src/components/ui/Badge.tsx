import { type JSX, splitProps } from 'solid-js';

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';
  size?: 'sm' | 'md';
}

const variants = {
  default:
    'bg-secondary-100 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-300 border border-secondary-200 dark:border-secondary-700',
  success:
    'bg-success-50 text-success-700 border border-success-200 dark:bg-success-900/30 dark:text-success-400 dark:border-success-800',
  warning:
    'bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-900/30 dark:text-warning-400 dark:border-warning-800',
  danger:
    'bg-danger-50 text-danger-700 border border-danger-200 dark:bg-danger-900/30 dark:text-danger-400 dark:border-danger-800',
  info: 'bg-info-50 text-info-700 border border-info-200 dark:bg-info-900/30 dark:text-info-400 dark:border-info-800',
  accent:
    'bg-accent-50 text-accent-700 border border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge(props: BadgeProps) {
  const [local, others] = splitProps(props, ['variant', 'size', 'class', 'children']);
  const variantClass = () => variants[local.variant || 'default'];
  const sizeClass = () => sizes[local.size || 'md'];

  return (
    <span
      {...others}
      class={`inline-flex items-center font-semibold rounded-full ${variantClass()} ${sizeClass()} ${local.class || ''}`}
    >
      {local.children}
    </span>
  );
}
