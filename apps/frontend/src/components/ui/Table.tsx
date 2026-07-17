import { For, type JSX } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
}

export function Table(props: TableProps) {
  return (
    <div class="w-full overflow-hidden rounded-2xl border border-secondary-100 dark:border-secondary-800 bg-white dark:bg-secondary-900 shadow-card dark:shadow-card-dark">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-100 dark:divide-secondary-800 text-left text-sm">
          <thead>
            <tr class="bg-brand-50/75 dark:bg-secondary-800/50">
              <For each={props.headers}>
                {(header) => (
                  <th class="px-6 py-4 font-semibold text-secondary-600 dark:text-secondary-400 uppercase tracking-wider text-xs">
                    {header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-100/50 dark:divide-secondary-800/50">{props.children}</tbody>
        </table>
      </div>
    </div>
  );
}
