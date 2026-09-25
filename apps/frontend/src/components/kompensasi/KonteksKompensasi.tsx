import { A } from '@solidjs/router';
import { Show } from 'solid-js';
import type { KetidakhadiranRow } from '../../controllers/kompensasiAdminController';
import { fmtTanggal } from '../../utils/format';

interface KonteksKompensasiProps {
  row: KetidakhadiranRow;
}

const LINK_CLASS = 'text-brand-600 underline font-semibold hover:text-brand-700';

export default function KonteksKompensasi(props: KonteksKompensasiProps) {
  return (
    <div class="text-xs text-secondary-600 dark:text-secondary-200">
      <Show when={props.row.sumber === 'BAP' || props.row.sumber === 'PRAKTIKUM'}>
        <Show
          when={props.row.mataKuliahNama || props.row.namaKelas}
          fallback={<div class="text-secondary-400">{props.row.sumberLabel || props.row.sumber}</div>}
        >
          <div class="font-semibold">
            <Show when={props.row.mataKuliahKode}>
              <span class="text-brand-600">[{props.row.mataKuliahKode}]</span>{' '}
            </Show>
            <Show when={props.row.mataKuliahNama}>{props.row.mataKuliahNama}</Show>
            <Show when={props.row.mataKuliahNama && props.row.namaKelas}> · </Show>
            <Show when={props.row.namaKelas}>{props.row.namaKelas}</Show>
            <Show when={props.row.sumber === 'PRAKTIKUM' && props.row.namaGroup}> · {props.row.namaGroup}</Show>
          </div>
        </Show>
        <Show when={props.row.sumber === 'BAP' && props.row.dosenNama}>
          <div class="text-secondary-400">Dosen: {props.row.dosenNama}</div>
        </Show>
        <Show when={props.row.sumber === 'PRAKTIKUM' && props.row.dosenNama}>
          <div class="text-secondary-400">Instruktur: {props.row.dosenNama}</div>
        </Show>
        <Show when={props.row.pertemuanKe != null}>
          <div class="text-secondary-400">
            {props.row.sumber === 'PRAKTIKUM' ? `Sesi ${props.row.pertemuanKe}` : `Pertemuan ${props.row.pertemuanKe}`}
          </div>
        </Show>
        <Show
          when={props.row.kelasKuliahId && (props.row.sumber === 'BAP' ? props.row.bapId : props.row.rombelPraktikumId)}
        >
          <A
            href={
              props.row.sumber === 'BAP'
                ? `/jurnal-presensi?kelas=${props.row.kelasKuliahId}&bapId=${props.row.bapId}&tab=teori`
                : `/jurnal-presensi?kelas=${props.row.kelasKuliahId}&rombel=${props.row.rombelPraktikumId}&tab=praktikum`
            }
            target="_blank"
            rel="noopener noreferrer"
            class={LINK_CLASS}
          >
            {props.row.sumber === 'BAP' ? 'Lihat BAP' : 'Lihat Praktikum'} →
          </A>
        </Show>
      </Show>

      <Show when={props.row.sumber === 'APEL'}>
        <Show
          when={props.row.kelompokNama}
          fallback={<div class="text-secondary-400">{props.row.sumberLabel || props.row.sumber}</div>}
        >
          <div class="font-semibold">Apel · {props.row.kelompokNama}</div>
        </Show>
        <Show when={props.row.sesiApelId != null}>
          <div class="text-secondary-400">Sesi #{props.row.sesiApelId}</div>
        </Show>
        <Show when={props.row.tanggalSesiApel}>
          <div class="text-secondary-400">{fmtTanggal(props.row.tanggalSesiApel)}</div>
        </Show>
        <Show when={props.row.shift}>
          <div class="text-secondary-400">Shift {props.row.shift}</div>
        </Show>
        <Show when={props.row.kelompokApelId && props.row.sesiApelId}>
          <A
            href={`/presensi-apel?kelompok=${props.row.kelompokApelId}&sesi=${props.row.sesiApelId}`}
            target="_blank"
            rel="noopener noreferrer"
            class={LINK_CLASS}
          >
            Lihat sesi apel →
          </A>
        </Show>
      </Show>

      <Show when={props.row.sumber === 'MANUAL'}>
        <div class="text-secondary-400">Input manual</div>
      </Show>

      <Show when={props.row.materi && props.row.sumber !== 'APEL'}>
        <div class="text-secondary-400 line-clamp-2">{props.row.materi}</div>
      </Show>
    </div>
  );
}
