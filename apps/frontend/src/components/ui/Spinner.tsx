import { JSX, splitProps } from 'solid-js';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  label?: string;
  class?: string;
}

const sizes = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

export function Spinner(props: SpinnerProps) {
  const sizeClass = () => sizes[props.size || 'md'];

  if (props.label) {
    return (
      <div class={`flex flex-col items-center justify-center gap-3 ${props.class || ''}`}>
        <div
          class={`${sizeClass()} border-brand-200 border-t-brand-900 dark:border-secondary-600 dark:border-t-accent-400 rounded-full animate-spin`}
        />
        <span class="text-sm text-secondary-500 dark:text-secondary-400">{props.label}</span>
      </div>
    );
  }

  return (
    <div
      class={`${sizeClass()} border-brand-200 border-t-brand-900 dark:border-secondary-600 dark:border-t-accent-400 rounded-full animate-spin ${props.class || ''}`}
    />
  );
}
