import { type JSX } from 'solid-js';

type ColorVariant = 'green' | 'amber' | 'blue' | 'indigo' | 'red' | 'gray';

interface IconActionButtonProps {
  label: string;
  onClick?: (e: MouseEvent) => void;
  disabled?: boolean;
  variant?: ColorVariant;
  title?: string;
  icon: JSX.Element;
}

const variantClasses: Record<ColorVariant, string> = {
  green: 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-500',
  amber: 'bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500',
  blue: 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500',
  indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500',
  red: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-500',
  gray: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200',
};

export function IconActionButton(props: IconActionButtonProps) {
  const variantClass = () => variantClasses[props.variant || 'gray'];

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title || props.label}
      aria-label={props.label}
      class={`group relative inline-flex items-center justify-center gap-2 h-11 min-w-11 px-2 sm:px-3 rounded-full font-medium text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${variantClass()}`}
    >
      <span class="shrink-0">{props.icon}</span>
      <span class="hidden sm:inline">{props.label}</span>

      <span class="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-medium px-2 py-1 opacity-0 transition-opacity duration-150 delay-150 group-hover:opacity-100 group-hover:delay-0 group-focus-visible:opacity-100 group-focus-visible:delay-0 group-focus-within:opacity-100 group-focus-within:delay-0 sm:hidden z-20 shadow-lg">
        {props.label}
      </span>
    </button>
  );
}
