import { For, type JSX, Show } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
  /**
   * Lebar kolom eksplisit (persentase CSS). Bila diisi, tabel memakai
   * `table-fixed` + `<colgroup>` sehingga lebar kolom identik antara header dan
   * body — tanpa itu, browser menghitung lebar dari konten sehingga header
   * bisa tampak bergeser dari kolomnya saat tabel digeser horizontal.
   * Tanpa prop ini, perilaku otomatis (tanpa `table-fixed`) dipertahankan.
   */
  colWidths?: string[];
  /** Judul tooltip untuk header (berguna saat header memakai `whitespace-nowrap`). */
  headerTitles?: string[];
}

export function Table(props: TableProps) {
  const fixed = () => Array.isArray(props.colWidths) && props.colWidths.length > 0;

  return (
    // DESIGN.md: kartu utilitas = hairline 1px + radius 18px, TANPA shadow.
    // Elevasi hanya dari perbedaan permukaan; baris memakai hairline pemisah lembut.
    <div class="w-full overflow-hidden rounded-card border border-hairline dark:border-secondary-800 bg-white dark:bg-secondary-900 transition-colors duration-200">
      <div class="overflow-x-auto">
        <table
          class={`divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-table ${
            // Tanpa lebar kolom eksplisit: `min-w-full` (perilaku lama).
            // Dengannya: `table-fixed` + lebar minimum, sehingga pada layar sempit
            // terjadi scroll horizontal (bukan kolom tergencet) dan header tetap
            // persis sejajar dengan body.
            fixed() ? 'table-fixed min-w-[880px]' : 'min-w-full'
          }`}
        >
          <Show when={fixed()}>
            <colgroup>
              <For each={props.colWidths ?? []}>{(w) => <col style={{ width: w }} />}</For>
            </colgroup>
          </Show>
          <thead>
            <tr class="bg-parchment dark:bg-secondary-800/60 border-b border-secondary-200/80 dark:border-secondary-800">
              <For each={props.headers}>
                {(header, i) => (
                  <th
                    title={props.headerTitles?.[i()]}
                    class="px-6 py-4 font-semibold text-secondary-600 dark:text-secondary-300 uppercase tracking-wider text-fine whitespace-nowrap"
                  >
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
