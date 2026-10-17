import { For, type JSX } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
  /** Judul tooltip untuk tiap header (berguna saat header tidak boleh membungkus). */
  headerTitles?: string[];
}

/**
 * Kartu tabel dasbor.
 *
 * SENGaja tidak ada lebar kolom eksplisit (`colgroup` + `table-fixed`) maupun
 * `position: sticky` pada header di sini. Keduanya pernah dicoba dan gagal:
 * saat `<colgroup>` berada di dalam JSX tabel, kompilasi Solid menaruhnya
 * sebagai saudara `<table>` (bukan anaknya), sehingga lebar kolom tidak pernah
 * diterapkan dan tabel jatuh ke layout otomatis — header pun bergeser dari
 * kolom body. Karena itu alignment dijamin oleh model HTML itu sendiri: header
 * dan body berada dalam satu `<table>`, jadi lebarnya selalu sama.
 *
 * Agar kolom tetap rapi tanpa `colgroup`:
 * - header harus PENDEK (nama panjang dipindah ke tooltip `headerTitles`),
 * - isi sel yang panjang memakai `truncate` + `title`,
 * - tabel dibungkus `overflow-x-auto` agar melebar ke samping, bukan squeezing.
 */
export function Table(props: TableProps) {
  return (
    // DESIGN.md: kartu utilitas = hairline 1px + radius 18px, TANPA shadow.
    // Elevasi hanya dari perbedaan permukaan; baris memakai hairline pemisah lembut.
    <div class="w-full overflow-hidden rounded-card border border-hairline dark:border-secondary-800 bg-white dark:bg-secondary-900 transition-colors duration-200">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[880px] divide-y divide-secondary-200/80 dark:divide-secondary-800 text-left text-table">
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
