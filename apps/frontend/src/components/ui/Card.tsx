import { type JSX, splitProps } from 'solid-js';

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const variants = {
  default: 'bg-white border border-hairline dark:bg-secondary-900 dark:border-secondary-800',
  bordered: 'bg-white border-2 border-hairline dark:bg-secondary-900 dark:border-secondary-700',
  elevated: 'bg-white border border-hairline dark:bg-secondary-900 dark:border-secondary-800',
  ghost: 'bg-secondary-50/70 dark:bg-secondary-800/40 border border-transparent',
};

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ['variant', 'padding', 'hover', 'class', 'children']);
  const variant = () => variants[local.variant || 'default'];
  const pad = () => paddings[local.padding || 'md'];
  const hoverClass = () => (local.hover ? 'hover:border-action/40 dark:hover:border-action-ondark/40' : '');

  return (
    <div
      {...others}
      class={`rounded-card transition-colors duration-200 ${variant()} ${pad()} ${hoverClass()} ${local.class || ''}`}
    >
      {local.children}
    </div>
  );
}
