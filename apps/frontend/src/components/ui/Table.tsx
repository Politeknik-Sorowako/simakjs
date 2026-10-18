import { For, type JSX, onMount } from 'solid-js';

interface TableProps {
  headers: (string | JSX.Element)[];
  children: JSX.Element;
  /** Judul tooltip untuk tiap header (berguna saat header tidak boleh membungkus). */
  headerTitles?: string[];
}

/**
 * Kartu tabel dasbor.
 *
 * KONTRAK CHILDREN: `children` harus berisi BARIS tabel (`<tr>` / `<For>`),
 * bukan `<tbody>`. Komponen ini sudah menyediakan satu `<tbody>` sendiri.
 * Nested `<tbody>` membuat browser membentuk kisi kolom TERPISA untuk body,
 * sehingga header bergeser jauh dari isi kolomnya (terukur offset > 900px di
 * Chromium). Bug senyap inilah yang membuat `/penetapan-pembimbing` dan
 * `/aktivitas-mbkm` tidak sejajar; guard di bawah menangkap regresinya.
 *
 * Lebar kolom TIDAK diatur eksplisit (`colgroup` + `table-fixed`) maupun
 * `position: sticky` pada header. Alignment dijamin oleh satu `<table>` dengan
 * satu kisi kolom, bukan lewat lebar kolom.
 *
 * Agar kolom tetap rapi tanpa `colgroup`:
 * - header harus PENDEK (nama panjang dipindah ke tooltip `headerTitles`),
 * - isi sel yang panjang memakai `truncate` + `title`,
 * - tabel dibungkus `overflow-x-auto` agar melebar ke samping, bukan squeezing.
 */
export function Table(props: TableProps) {
  let bodyRef: HTMLTableSectionElement | undefined;

  onMount(() => {
    if (!import.meta.env.DEV || !bodyRef) return;
    if (bodyRef.querySelector(':scope > tbody')) {
      console.error(
        '[Table] children memuat <tbody> di dalam <tbody>. Baris tabel harus dikirim langsung (tanpa pembungkus <tbody>), jika tidak header akan bergeser dari body.',
      );
    }
  });

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
          <tbody ref={bodyRef} class="divide-y divide-secondary-100 dark:divide-secondary-800/60">
            {props.children}
          </tbody>
        </table>
      </div>
    </div>
  );
}
