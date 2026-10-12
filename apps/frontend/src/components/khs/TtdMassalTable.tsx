import { For, Show } from 'solid-js';
import type { KhsSignStatusItem } from '../../controllers/documentSignatureController';
import { fmtWaktu } from '../../utils/format';

interface TtdMassalTableProps {
  rows: KhsSignStatusItem[];
  loading: boolean;
  error: string | null;
  periodeId: string;
  isRowChecked: (id: number) => boolean;
  onToggleRow: (row: KhsSignStatusItem) => void;
}

/** Baris skeleton — tinggi & padding sama dengan baris data agar tidak ada lompatan layout. */
function SkeletonRows() {
  return (
    <>
      <For each={Array.from({ length: 5 })}>
        {() => (
          <tr class="opacity-70">
            <td class="p-3">
              <div class="h-4 w-4 rounded border border-secondary-200 bg-secondary-100 dark:border-secondary-700 dark:bg-secondary-800 animate-pulse" />
            </td>
            <td class="p-3">
              <div class="h-4 w-20 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
            </td>
            <td class="p-3">
              <div class="h-4 w-40 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
            </td>
            <td class="p-3">
              <div class="h-5 w-36 rounded-full bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
            </td>
            <td class="p-3">
              <div class="h-4 w-14 rounded bg-secondary-100 dark:bg-secondary-800 animate-pulse" />
            </td>
          </tr>
        )}
      </For>
    </>
  );
}

/**
 * Tabel daftar status TTD untuk tab TTD Massal.
 *
 * `<thead>` selalu ter-mount; hanya isi `<tbody>` yang bertukar (skeleton /
 * error / baris data). Dengan begitu refresh pencarian/filter HANYA meremount
 * tabel — kartu filter di atasnya (termasuk input pencarian) tidak tersentuh,
 * sehingga fokus/kursor pengguna tidak hilang (lihat pula test e2e
 * `search-focus-isolation.spec.ts`).
 */
export function TtdMassalTable(props: TtdMassalTableProps) {
  return (
    <div class="min-h-[240px] w-full overflow-x-auto">
      <table class="w-full text-left text-caption border-collapse">
        <thead>
          <tr class="border-b border-secondary-100 bg-secondary-50/50 text-secondary-400 uppercase tracking-wider font-bold dark:border-secondary-800 dark:bg-secondary-800 dark:text-secondary-200">
            <th class="p-3 w-10" />
            <th class="p-3">NIM</th>
            <th class="p-3">Nama Mahasiswa</th>
            <th class="p-3">Status Tanda Tangan</th>
            <th class="p-3 text-center">Cetak</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-50 text-secondary-600 dark:text-secondary-200 font-medium">
          <Show
            when={!props.error}
            fallback={
              <tr>
                <td colspan={5} class="p-4 text-center text-rose-600 font-bold">
                  {props.error}
                </td>
              </tr>
            }
          >
            <Show when={!props.loading || props.rows.length > 0} fallback={<SkeletonRows />}>
              <Show
                when={props.rows.length > 0}
                fallback={
                  <tr>
                    <td colspan={5} class="p-4 text-center text-secondary-400 italic">
                      Tidak ada mahasiswa ditemukan pada prodi/periode ini.
                    </td>
                  </tr>
                }
              >
                <For each={props.rows}>
                  {(row) => {
                    const toggle = () => props.onToggleRow(row);
                    return (
                      <tr
                        class="cursor-pointer transition-colors hover:bg-secondary-50/50 dark:hover:bg-secondary-800/20"
                        onClick={toggle}
                      >
                        <td class="p-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={props.isRowChecked(row.mahasiswaId)}
                            onChange={toggle}
                            class="rounded border-secondary-300 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer dark:border-secondary-700"
                          />
                        </td>
                        <td class="p-3 whitespace-nowrap">{row.nim}</td>
                        <td class="p-3 font-bold text-secondary-800 dark:text-white">{row.nama}</td>
                        <td class="p-3">
                          <Show
                            when={row.signed}
                            fallback={
                              <span class="inline-block px-2 py-0.5 rounded-full text-fine font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                                Belum Ditandatangani
                              </span>
                            }
                          >
                            <span class="flex flex-col gap-0.5">
                              <span class="inline-block w-fit px-2 py-0.5 rounded-full text-fine font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                                Ditandatangani
                              </span>
                              <span class="text-fine text-secondary-400 dark:text-secondary-300">
                                {row.signerNama}
                                {row.signedAt ? ` · ${fmtWaktu(row.signedAt)}` : ''}
                              </span>
                            </span>
                          </Show>
                        </td>
                        <td class="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`/khs/cetak/${row.mahasiswaId}/${props.periodeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="px-3 py-1.5 border border-brand-600 text-brand-600 font-bold rounded-xl text-caption hover:bg-brand-50 active:scale-95 transition-all dark:border-brand-400 dark:text-brand-400"
                          >
                            Cetak
                          </a>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </Show>
            </Show>
          </Show>
        </tbody>
      </table>
    </div>
  );
}
