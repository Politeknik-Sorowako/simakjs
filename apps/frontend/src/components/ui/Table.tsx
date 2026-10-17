import { For, type JSX } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
}

export function Table(props: TableProps) {
  return (
    // DESIGN.md: kartu utilitas = hairline 1px + radius 18px, TANPA shadow.
    // Elevasi hanya dari perbedaan permukaan; baris memakai hairline pemisah lembut.
    <div class="w-full overflow-hidden rounded-card border border-hairline dark:border-secondary-800 bg-white dark:bg-secondary-900 transition-colors duration-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-table">
          <thead>
            <tr class="bg-parchment dark:bg-secondary-800/60 border-b border-secondary-200/80 dark:border-secondary-800">
              <For each={props.headers}>
                {(header) => (
                  <th class="px-6 py-4 font-semibold text-secondary-600 dark:text-secondary-300 uppercase tracking-wider text-fine">
                    {header}
                  </th>
                )}
              </For>
            </tr>
          </thead>
          <tbody class="divide-y divide-secondary-100 dark:divide-secondary-800/60">{props.children}</tbody>
        </table>
      </div>
    </div>
  );
}
