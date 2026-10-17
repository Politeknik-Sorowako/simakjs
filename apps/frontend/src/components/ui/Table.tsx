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
  /**
   * Header menempel saat tabel digulir. Tanpa ini, baris header ikut ter-scroll
   * dan-kosong-kosong sehingga sulit dicocokkan dengan kolomnya di body.
   * Memerlukan `divide-separate` agar border/background `thead` tidak "tembus"
   * ke body (efek `border-collapse: collapse` pada elemen sticky).
   */
  stickyHeader?: boolean;
}

export function Table(props: TableProps) {
  /**
   * Lebar kolom HANYA dipakai bila jumlahnya sama persis dengan jumlah header.
   * Bila tidak, `table-fixed` + `<colgroup>` akan memetakan lebar ke kolom yang
   * salah sehingga header terlihat tidak selaras dengan body — lebih aman
   * kembali ke layout otomatis daripada menampilkan kolom yang bergeser.
   */
  const widths = () =>
    Array.isArray(props.colWidths) && props.colWidths.length === props.headers.length ? props.colWidths : undefined;
  const fixed = () => widths() !== undefined;

  return (
    // DESIGN.md: kartu utilitas = hairline 1px + radius 18px, TANPA shadow.
    // Elevasi hanya dari perbedaan permukaan; baris memakai hairline pemisah lembut.
    <div class="w-full overflow-hidden rounded-card border border-hairline dark:border-secondary-800 bg-white dark:bg-secondary-900 transition-colors duration-200">
      <div class="overflow-x-auto">
        <table
          class={`divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-table ${
            props.stickyHeader ? 'divide-separate border-separate' : ''
          } ${
            // Tanpa lebar kolom eksplisit: `min-w-full` (perilaku lama).
            // Dengannya: `table-fixed` + lebar minimum, sehingga pada layar sempit
            // terjadi scroll horizontal (bukan kolom tergencet) dan header tetap
            // persis sejajar dengan body.
            fixed() ? 'table-fixed min-w-[960px]' : 'min-w-full'
          }`}
        >
          <Show when={fixed()}>
            <colgroup>
              <For each={widths() ?? []}>{(w) => <col style={{ width: w }} />}</For>
            </colgroup>
          </Show>
          <thead class={props.stickyHeader ? 'sticky top-0 z-10 bg-parchment dark:bg-secondary-800' : undefined}>
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
