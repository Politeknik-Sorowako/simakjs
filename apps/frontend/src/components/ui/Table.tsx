import { For, type JSX } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
}

export function Table(props: TableProps) {
  return (
    <div class="w-full overflow-hidden rounded-2xl border border-secondary-200/80 dark:border-secondary-800 bg-white dark:bg-secondary-900 shadow-card dark:shadow-card-dark transition-colors duration-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-sm">
          <thead>
            <tr class="bg-secondary-50/80 dark:bg-secondary-800/60 border-b border-secondary-200/80 dark:border-secondary-800">
              <For each={props.headers}>
                {(header) => (
                  <th class="px-6 py-4 font-semibold text-secondary-700 dark:text-secondary-300 uppercase tracking-wider text-xs">
                    {header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-200/50 dark:divide-secondary-800/60">{props.children}</tbody>
        </table>
      </div>
    </div>
  );
}
