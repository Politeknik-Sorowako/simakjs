import { createResource, For, Show } from 'solid-js';
import logoBawaan from '../../assets/logo.png';
import { type KopSurat, systemController } from '../../controllers/systemController';

/** Fallback kop bila `GET /settings/kop` belum termuat/gagal (nilai default kampus). */
export const KOPI_FALLBACK: KopSurat = {
  nama: 'POLITEKNIK SOROWAKO',
  alamat: [
    'Jl. Sumantri Brojonegoro no. 1 Sorowako, Kode Pos 92984',
    'Kabupaten Luwu Timur – Propinsi Sulawesi Selatan',
  ],
  kontak: 'Telepon [021] 5249100 ext. 3816, 3818, 3819, 3820 • Fax [021] 5249589',
  website: 'https://www.politekniksorowako.ac.id',
  email: 'info@politekniksorowako.ac.id',
  tampilkanLogo: true,
  logoCustom: false,
  logoUrl: null,
};

/**
 * Kop surat GLOBAL semua dokumen cetak (KHS, SKPI, BKD, KRS, Peringatan, dst).
 * Format mengikuti desain standar: logo kiri + blok info tengah (nama, alamat,
 * kontak, website, email) + garis bawah. Nilai dari `GET /settings/kop`
 * (kunci `surat_kop_global`); logo kustom di-resolve via objectURL, fallback
 * ke aset bawaan repo.
 */
export default function KopSurat(props: { kop: KopSurat }) {
  // Kunci resource memakai logoUrl+flag agar berubah saat admin ganti logo.
  const [logoSrc] = createResource(
    () =>
      `${props.kop.tampilkanLogo ? 'on' : 'off'}:${props.kop.logoCustom ? 'custom' : 'default'}:${props.kop.logoUrl ?? ''}`,
    async () => {
      if (!props.kop.tampilkanLogo) return null;
      return (await systemController.kopLogoObjectUrl(props.kop)) ?? logoBawaan;
    },
  );

  return (
    <div class="table w-full border-b-2 border-secondary-900 pb-3">
      <div class="table-row">
        <Show when={props.kop.tampilkanLogo && logoSrc() !== null}>
          <div class="table-cell w-24 pr-5 align-middle">
            <img
              src={logoSrc() ?? logoBawaan}
              alt={`Logo ${props.kop.nama}`}
              class="h-20 w-20 object-contain"
              onError={(e) => {
                // Logo kustom gagal dimuat → fallback logo bawaan.
                if (e.currentTarget.src !== logoBawaan) e.currentTarget.src = logoBawaan;
              }}
            />
          </div>
        </Show>
        <div class="table-cell align-middle text-center text-secondary-900">
          <h2 class="text-2xl font-bold tracking-wide">{props.kop.nama}</h2>
          <For each={props.kop.alamat}>{(baris) => <p class="text-sm leading-snug">{baris}</p>}</For>
          <Show when={props.kop.kontak}>
            <p class="text-sm leading-snug">{props.kop.kontak}</p>
          </Show>
          <Show when={props.kop.website}>
            <p class="text-sm leading-snug">
              <a href={props.kop.website} class="text-blue-700 underline" target="_blank" rel="noreferrer">
                {props.kop.website}
              </a>
            </p>
          </Show>
          <Show when={props.kop.email}>
            <p class="text-sm leading-snug">
              Email:{' '}
              <a href={`mailto:${props.kop.email}`} class="text-blue-700 underline">
                {props.kop.email}
              </a>
            </p>
          </Show>
        </div>
      </div>
    </div>
  );
}
