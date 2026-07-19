import { createSignal, Show } from 'solid-js';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

const PAGE_OPTIONS = [10, 20, 50, 100];

export function Pagination(props: PaginationProps) {
  const [jumpValue, setJumpValue] = createSignal('');

  const start = () => Math.min((props.currentPage - 1) * props.limit + 1, props.total);
  const end = () => Math.min(props.currentPage * props.limit, props.total);

  const handleJump = () => {
    const val = Number(jumpValue());
    if (val >= 1 && val <= props.totalPages && val !== props.currentPage) {
      props.onPageChange(val);
    }
    setJumpValue('');
  };

  return (
    <div class="flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
      <div class="flex items-center gap-3 text-xs text-secondary-500 dark:text-secondary-400">
        <span>
          Menampilkan {props.total > 0 ? start() : 0}–{end()} dari {props.total} data
        </span>
        <div class="flex items-center gap-1.5">
          <span>Baris:</span>
          <select
            class="rounded border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-xs px-2 py-1 text-secondary-700 dark:text-secondary-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
            value={props.limit}
            onChange={(e) => props.onLimitChange(Number(e.currentTarget.value))}
          >
            {PAGE_OPTIONS.map((opt) => (
              <option value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          disabled={props.currentPage <= 1}
          onClick={() => props.onPageChange(props.currentPage - 1)}
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          &lsaquo; Prev
        </button>

        <Show when={props.totalPages > 0}>
          <div class="flex items-center gap-1.5 text-xs text-secondary-600 dark:text-secondary-300">
            <input
              type="number"
              min={1}
              max={props.totalPages}
              placeholder={String(props.currentPage)}
              value={jumpValue()}
              onInput={(e) => setJumpValue(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJump();
              }}
              onBlur={handleJump}
              class="w-14 text-center rounded border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span>/ {props.totalPages}</span>
          </div>
        </Show>

        <button
          type="button"
          disabled={props.currentPage >= props.totalPages}
          onClick={() => props.onPageChange(props.currentPage + 1)}
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-800 text-secondary-600 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next &rsaquo;
        </button>
      </div>
    </div>
  );
}
