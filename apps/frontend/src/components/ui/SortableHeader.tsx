import type { JSX } from 'solid-js';

interface SortableHeaderProps {
  field: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  children: JSX.Element;
}

export function SortableHeader(props: SortableHeaderProps) {
  const arrow = () => {
    if (props.sortBy !== props.field) return '';
    return props.sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  const isActive = () => props.sortBy === props.field;

  return (
    <button
      type="button"
      onClick={() => props.onSort(props.field)}
      class={`hover:text-brand-700 dark:hover:text-brand-400 transition-colors inline-flex items-center gap-1 ${
        isActive() ? 'text-brand-700 dark:text-brand-400' : ''
      }`}
    >
      {props.children}
      <span class="text-[10px] leading-none">{arrow()}</span>
    </button>
  );
}
