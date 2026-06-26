import { JSX } from 'solid-js';

interface TableProps {
  headers: string[];
  children: JSX.Element;
}

export function Table(props: TableProps) {
  return (
    <div class="w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md shadow-gray-100/40">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-100 text-left text-sm">
          <thead class="bg-gray-50/75">
            <tr>
              {props.headers.map((h) => (
                <th scope="col" class="px-6 py-4 font-semibold text-gray-600 uppercase tracking-wider text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 bg-white">
            {props.children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
