import { JSX } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
}

export function Table(props: TableProps) {
  return (
    <div class="w-full overflow-hidden rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md shadow-gray-100/40 dark:shadow-none transition-colors duration-200">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-100 dark:divide-slate-800 text-left text-sm">
          <thead class="bg-gray-50/75 dark:bg-slate-950/40">
            <tr>
              {props.headers.map((h) => (
                <th scope="col" class="px-6 py-4 font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {props.children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
