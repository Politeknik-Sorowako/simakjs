import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import KopSurat, { KOPI_FALLBACK } from '../components/cetak/KopSurat';
import { systemController } from '../controllers/systemController';
import { type TugasAkhir, type TugasAkhirSidang, tugasAkhirController } from '../controllers/tugasAkhirController';

interface PengesahanData {
  ta: TugasAkhir;
  sidangAkhir: TugasAkhirSidang | null;
}

export default function TugasAkhirPengesahanCetak() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  // Ambil kop surat resmi institusi
  const [kop] = createResource(() => systemController.getKop().catch(() => null));

  // Ambil detail Tugas Akhir dan data sidang akhir
  const [dataResource] = createResource(
    () => Number(params.id),
    async (taId): Promise<PengesahanData | null> => {
      if (!taId || isNaN(taId)) return null;
      const [ta, sidangList] = await Promise.all([
        tugasAkhirController.getById(taId),
        tugasAkhirController.getSidangList(taId).catch(() => []),
      ]);

      // Cari sidang akhir yang sudah disetujui / selesai
      const sidangAkhir =
        sidangList.find((s) => s.jenisSidang === 'akhir' && s.statusHasil && s.statusHasil !== 'belum_ditentukan') ||
        sidangList.find((s) => s.jenisSidang === 'akhir') ||
        sidangList[0] ||
        null;

      return { ta, sidangAkhir };
    },
  );

  // Otomatis picu dialog print setelah data selesai dimuat
  createEffect(() => {
    const data = dataResource();
    if (data && !hasPrinted()) {
      setHasPrinted(true);
      setTimeout(() => window.print(), 350);
    }
  });

  const formatTanggalIndo = (tglStr?: string | null) => {
    if (!tglStr) return '-';
    try {
      const parts = tglStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      return new Date(tglStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return tglStr;
    }
  };

  return (
    <div class="min-h-screen bg-secondary-100/60 p-4 sm:p-6 print:p-0 print:bg-white text-secondary-900 font-sans">
      {/* Action Bar (Hanya tampil di layar, tersembunyi saat diprint) */}
      <div class="max-w-[210mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-secondary-200 shadow-sm print:hidden">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-secondary-300 hover:bg-secondary-50 text-secondary-700 transition-all active:scale-95"
          >
            ← Kembali
          </button>
          <span class="text-xs font-bold text-secondary-800">Cetak Lembar Pengesahan TA (A4)</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            class="px-4 py-1.5 text-xs font-semibold rounded-lg bg-action hover:bg-action-dark text-white shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
          >
            🖨️ Cetak Dokumen (Ctrl+P)
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-secondary-100 hover:bg-secondary-200 text-secondary-700 transition-all active:scale-95"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Loading & Error State */}
      <Show when={dataResource.loading}>
        <div class="max-w-[210mm] mx-auto p-12 bg-white rounded-xl border border-secondary-200 text-center print:hidden">
          <div class="w-8 h-8 border-3 border-action border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p class="text-xs font-medium text-secondary-600">Menyiapkan lembar pengesahan naskah...</p>
        </div>
      </Show>

      <Show when={dataResource.error}>
        <div class="max-w-[210mm] mx-auto p-8 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-700 print:hidden">
          <p class="text-sm font-bold mb-1">Gagal memuat berkas pengesahan</p>
          <p class="text-xs text-rose-600">
            {dataResource.error instanceof Error ? dataResource.error.message : 'Terjadi kendala jaringan'}
          </p>
        </div>
      </Show>

      {/* KERTAS A4 LEMBAR PENGESAHAN */}
      <Show when={dataResource()}>
        {(data) => {
          const ta = data().ta;
          const s = data().sidangAkhir;
          const pembimbing1 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_1');
          const pembimbing2 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_2');
          const ketuaMhs = ta.anggota?.find((a) => a.peran === 'ketua') || ta.anggota?.[0];

          return (
            <div class="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 print:p-0 shadow-md print:shadow-none print:max-w-none rounded-none text-ink text-[12px] leading-relaxed border border-secondary-200 print:border-none">
              {/* 1. Kop Surat Resmi Institusi */}
              <KopSurat kop={kop() ?? KOPI_FALLBACK} />

              {/* 2. Judul Dokumen Pengesahan */}
              <div class="my-6 text-center">
                <h1 class="text-base sm:text-lg font-bold tracking-tight uppercase text-secondary-900 underline underline-offset-4">
                  LEMBAR PENGESAHAN LAPORAN TUGAS AKHIR
                </h1>
                <p class="text-xs text-secondary-600 mt-1">Program Studi {ta.prodiNama || '-'} • Politeknik Sorowako</p>
              </div>

              {/* 3. Pernyataan & Identitas Karya */}
              <div class="mb-5 text-justify leading-relaxed">
                <p>
                  Laporan Tugas Akhir dengan judul dan identitas di bawah ini telah disetujui, dipertahankan di hadapan
                  Dewan Penguji pada tanggal{' '}
                  <span class="font-bold">{formatTanggalIndo(s?.tanggalSidang || ta.tanggalSelesai)}</span>, dan
                  dinyatakan telah memenuhi syarat kelulusan program pendidikan Diploma pada Politeknik Sorowako:
                </p>
              </div>

              {/* 4. Kotak Identitas */}
              <div class="mb-6 rounded-lg border border-secondary-300 p-4 bg-secondary-50/30 print:bg-transparent">
                <table class="w-full text-xs">
                  <tbody>
                    <tr class="align-top">
                      <td class="w-36 py-1.5 font-semibold text-secondary-700">Judul Tugas Akhir</td>
                      <td class="w-4 py-1.5 text-center font-bold">:</td>
                      <td class="py-1.5 font-bold uppercase leading-relaxed text-secondary-900">{ta.judul}</td>
                    </tr>
                    <Show when={ta.judulInggris}>
                      <tr class="align-top">
                        <td class="py-1 font-semibold text-secondary-700">Judul (Inggris)</td>
                        <td class="py-1 text-center font-bold">:</td>
                        <td class="py-1 italic text-secondary-600">{ta.judulInggris}</td>
                      </tr>
                    </Show>
                    <tr class="align-top">
                      <td class="py-1 font-semibold text-secondary-700">Penyusun / Mahasiswa</td>
                      <td class="py-1 text-center font-bold">:</td>
                      <td class="py-1">
                        <Show
                          when={ta.tipe === 'kelompok' && (ta.anggota?.length || 0) > 1}
                          fallback={
                            <span>
                              <span class="font-bold">{ketuaMhs?.mahasiswaNama || '-'}</span> (NIM:{' '}
                              {ketuaMhs?.mahasiswaNim || '-'})
                            </span>
                          }
                        >
                          <ol class="list-decimal pl-4 space-y-0.5">
                            <For each={ta.anggota}>
                              {(ang) => (
                                <li>
                                  <span class="font-bold">{ang.mahasiswaNama}</span> (NIM: {ang.mahasiswaNim}) —{' '}
                                  <span class="text-secondary-600 italic">
                                    {ang.peran === 'ketua' ? 'Ketua Tim' : 'Anggota'}
                                  </span>
                                </li>
                              )}
                            </For>
                          </ol>
                        </Show>
                      </td>
                    </tr>
                    <tr class="align-top">
                      <td class="py-1 font-semibold text-secondary-700">Program Studi</td>
                      <td class="py-1 text-center font-bold">:</td>
                      <td class="py-1 font-medium">{ta.prodiNama || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 5. Blok Tanda Tangan Pembimbing */}
              <div class="mb-6">
                <p class="text-center text-xs font-semibold text-secondary-700 mb-4">Disetujui oleh Tim Pembimbing:</p>
                <div class="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <p class="font-semibold text-secondary-700 mb-16">Dosen Pembimbing 1,</p>
                    <p class="font-bold underline uppercase">
                      {pembimbing1?.dosenNama ||
                        pembimbing1?.namaEksternal ||
                        '(....................................................)'}
                    </p>
                    <p class="text-[11px] text-secondary-600">NIP: {pembimbing1?.dosenNip || '-'}</p>
                  </div>
                  <div>
                    <p class="font-semibold text-secondary-700 mb-16">Dosen Pembimbing 2,</p>
                    <p class="font-bold underline uppercase">
                      {pembimbing2?.dosenNama ||
                        pembimbing2?.namaEksternal ||
                        '(....................................................)'}
                    </p>
                    <p class="text-[11px] text-secondary-600">NIP: {pembimbing2?.dosenNip || '-'}</p>
                  </div>
                </div>
              </div>

              {/* 6. Blok Pengesahan Pimpinan & Kaprodi */}
              <div class="pt-4 border-t border-secondary-300">
                <p class="text-center text-xs font-semibold text-secondary-700 mb-4">Mengesahkan dan Mengetahui:</p>
                <div class="grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <p class="font-semibold text-secondary-700 mb-16">
                      Ketua Program Studi,
                      <br />
                      {ta.prodiNama || 'Program Studi'}
                    </p>
                    <p class="font-bold underline uppercase">(....................................................)</p>
                    <p class="text-[11px] text-secondary-600">NIP: ............................................</p>
                  </div>

                  <div>
                    <p class="font-semibold text-secondary-700 mb-16">
                      Direktur / Pembantu Direktur I,
                      <br />
                      Politeknik Sorowako
                    </p>
                    <p class="font-bold underline uppercase">(....................................................)</p>
                    <p class="text-[11px] text-secondary-600">NIP: ............................................</p>
                  </div>
                </div>
              </div>
            </div>
          );
        }}
      </Show>
    </div>
  );
}
