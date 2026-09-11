import { For } from 'solid-js';

export function TableLoadingFallback() {
  return (
    <div class="w-full overflow-hidden rounded-2xl border border-secondary-200/80 dark:border-secondary-800 bg-white dark:bg-secondary-900 shadow-card dark:shadow-card-dark transition-colors duration-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-table">
          <tbody class="divide-y divide-secondary-200/50 dark:divide-secondary-800/60">
            <For each={Array.from({ length: 5 })}>
              {() => (
                <tr>
                  <td class="px-6 py-4">
                    <div class="h-4 w-3/4 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
                  </td>
                  <td class="px-6 py-4">
                    <div class="h-4 w-1/2 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
                  </td>
                  <td class="px-6 py-4">
                    <div class="h-4 w-2/3 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </div>
  );
}
