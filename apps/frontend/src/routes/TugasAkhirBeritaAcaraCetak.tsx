import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import KopSurat, { KOPI_FALLBACK } from '../components/cetak/KopSurat';
import { systemController } from '../controllers/systemController';
import {
  type TugasAkhir,
  type TugasAkhirPenguji,
  type TugasAkhirSidang,
  tugasAkhirController,
} from '../controllers/tugasAkhirController';

interface RekapNilaiSidangData {
  tugasAkhir: TugasAkhir;
  sidang: TugasAkhirSidang;
  timPenguji: TugasAkhirPenguji[];
  anggotaList: { id: number; mahasiswaId: number; nim: string; nama: string; peran: string }[];
  exportRows: {
    no: number;
    nim: string;
    nama: string;
    peran: string;
    judulTa: string;
    programStudi: string;
    jenisSidang: string;
    tanggalSidang: string;
    ruangan: string;
    nilaiAkhir: string;
    nilaiAkhirSkala100: string;
    hurufMutu: string;
    indeksMutu: string;
    statusHasil: string;
    statusRevisi: string;
    catatanSidang: string;
  }[];
}

export default function TugasAkhirBeritaAcaraCetak() {
  const params = useParams<{ id: string; sidangId: string }>();
  const navigate = useNavigate();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  // Ambil kop surat resmi institusi
  const [kop] = createResource(() => systemController.getKop().catch(() => null));

  // Ambil rekap nilai dan data berita acara sidang
  const [dataResource] = createResource(
    () => ({ taId: Number(params.id), sidangId: Number(params.sidangId) }),
    async ({ taId, sidangId }): Promise<RekapNilaiSidangData | null> => {
      if (!taId || !sidangId || isNaN(taId) || isNaN(sidangId)) return null;
      return await tugasAkhirController.getRekapNilaiSidang(taId, sidangId);
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
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      return new Date(tglStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return tglStr;
    }
  };

  const getPeranPengujiLabel = (peran: string) => {
    switch (peran) {
      case 'ketua_penguji':
        return 'Ketua Dewan Penguji';
      case 'sekretaris':
        return 'Sekretaris Sidang';
      case 'penguji_1':
        return 'Penguji I (Ahli)';
      case 'penguji_2':
        return 'Penguji II';
      case 'pembimbing_1':
        return 'Pembimbing I';
      case 'pembimbing_2':
        return 'Pembimbing II';
      default:
        return peran.replace(/_/g, ' ').toUpperCase();
    }
  };

  const getKeputusanLabel = (statusHasil?: string) => {
    switch (statusHasil) {
      case 'lulus_tanpa_revisi':
        return 'LULUS TANPA REVISI';
      case 'lulus_dengan_revisi':
        return 'LULUS DENGAN REVISI';
      case 'sidang_ulang':
        return 'SIDANG ULANG';
      case 'tidak_lulus':
        return 'TIDAK LULUS';
      default:
        return 'BELUM DITENTUKAN';
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
          <span class="text-xs font-bold text-secondary-800">Cetak Berita Acara Sidang (A4)</span>
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
          <p class="text-xs font-medium text-secondary-600">Menyiapkan dokumen berita acara sidang...</p>
        </div>
      </Show>

      <Show when={dataResource.error}>
        <div class="max-w-[210mm] mx-auto p-8 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-700 print:hidden">
          <p class="text-sm font-bold mb-1">Gagal memuat berkas berita acara sidang</p>
          <p class="text-xs text-rose-600">
            {dataResource.error instanceof Error ? dataResource.error.message : 'Terjadi kendala jaringan'}
          </p>
        </div>
      </Show>

      {/* KERTAS A4 CETAK BERITA ACARA */}
      <Show when={dataResource()}>
        {(data) => {
          const ta = data().tugasAkhir;
          const s = data().sidang;
          const jenisSidangNama = s.jenisSidang === 'akhir' ? 'TUGAS AKHIR' : 'PROPOSAL TUGAS AKHIR';

          return (
            <div class="max-w-[210mm] mx-auto bg-white p-8 sm:p-12 print:p-0 shadow-md print:shadow-none print:max-w-none rounded-none text-ink text-[12px] leading-normal border border-secondary-200 print:border-none">
              {/* 1. Kop Surat Resmi Institusi */}
              <KopSurat kop={kop() ?? KOPI_FALLBACK} />

              {/* 2. Judul Dokumen Berita Acara */}
              <div class="my-5 text-center">
                <h1 class="text-base sm:text-lg font-bold tracking-tight uppercase text-secondary-900 underline underline-offset-4">
                  BERITA ACARA UJIAN SIDANG {jenisSidangNama}
                </h1>
                <p class="text-xs text-secondary-600 mt-1">
                  Program Studi {ta.prodiNama || '-'} • Periode Akademik {ta.periodeNama || ta.periodeId || '-'}
                </p>
              </div>

              {/* 3. Pernyataan Pembuka & Waktu Pelaksanaan */}
              <div class="mb-4 text-justify leading-relaxed">
                <p>
                  Pada hari ini, <span class="font-bold">{formatTanggalIndo(s.tanggalSidang)}</span>, bertempat di ruang{' '}
                  <span class="font-bold">{s.ruangan || 'Ruang Sidang'}</span> Politeknik Sorowako, telah dilaksanakan
                  Ujian Sidang {jenisSidangNama} bagi mahasiswa program studi{' '}
                  <span class="font-bold">{ta.prodiNama || '-'}</span>:
                </p>
              </div>

              {/* 4. Identitas Tugas Akhir & Mahasiswa */}
              <div class="mb-5 rounded-lg border border-secondary-300 p-3.5 bg-secondary-50/40 print:bg-transparent">
                <table class="w-full text-xs">
                  <tbody>
                    <tr class="align-top">
                      <td class="w-36 py-1 font-semibold text-secondary-700">Kode & Tipe TA</td>
                      <td class="w-4 py-1 text-center font-bold">:</td>
                      <td class="py-1">
                        <span class="font-bold">{ta.kodeTa || '-'}</span> (
                        {ta.tipe === 'kelompok' ? 'Kelompok' : 'Individu'} -{' '}
                        {(ta.jenisKarya || 'skripsi').replace(/_/g, ' ').toUpperCase()})
                      </td>
                    </tr>
                    <tr class="align-top">
                      <td class="py-1 font-semibold text-secondary-700">Judul Tugas Akhir</td>
                      <td class="py-1 text-center font-bold">:</td>
                      <td class="py-1 font-bold leading-relaxed">{ta.judul}</td>
                    </tr>
                    <tr class="align-top">
                      <td class="py-1 font-semibold text-secondary-700">Peserta Sidang</td>
                      <td class="py-1 text-center font-bold">:</td>
                      <td class="py-1">
                        <ol class="list-decimal pl-4 space-y-0.5">
                          <For each={data().anggotaList}>
                            {(ang) => (
                              <li>
                                <span class="font-bold">{ang.nama}</span> (NIM: {ang.nim}) —{' '}
                                <span class="text-secondary-600 italic">
                                  {ang.peran === 'ketua' ? 'Ketua Tim' : 'Anggota'}
                                </span>
                              </li>
                            )}
                          </For>
                        </ol>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 5. Susunan Dewan Penguji & Rekapitulasi Penilaian */}
              <div class="mb-5">
                <h2 class="text-xs font-bold uppercase tracking-wider text-secondary-800 mb-2">
                  A. Susunan Tim Penguji & Rekapitulasi Penilaian (BPA 2025)
                </h2>
                <table class="w-full text-xs border border-secondary-400 border-collapse">
                  <thead>
                    <tr class="bg-secondary-100 print:bg-secondary-100 text-secondary-800">
                      <th class="border border-secondary-400 py-2 px-2 text-center w-8">No</th>
                      <th class="border border-secondary-400 py-2 px-3 text-left">Nama Dosen Penguji</th>
                      <th class="border border-secondary-400 py-2 px-3 text-left w-44">Kedudukan Tim</th>
                      <th class="border border-secondary-400 py-2 px-2 text-center w-24">Nilai Angka</th>
                      <th class="border border-secondary-400 py-2 px-2 text-center w-20">Kehadiran</th>
                      <th class="border border-secondary-400 py-2 px-3 text-center w-28">Tanda Tangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={data().timPenguji}>
                      {(p, idx) => (
                        <tr class="border-b border-secondary-300">
                          <td class="border border-secondary-400 py-2 px-2 text-center font-mono">{idx() + 1}</td>
                          <td class="border border-secondary-400 py-2 px-3">
                            <span class="font-semibold block">{p.dosenNama || '-'}</span>
                            <span class="text-[11px] text-secondary-600">NIP: {p.dosenNip || '-'}</span>
                          </td>
                          <td class="border border-secondary-400 py-2 px-3 font-medium">
                            {getPeranPengujiLabel(p.peranPenguji)}
                          </td>
                          <td class="border border-secondary-400 py-2 px-2 text-center font-mono font-bold">
                            {p.nilaiTotal ? Number(p.nilaiTotal).toFixed(2) : '-'}
                          </td>
                          <td class="border border-secondary-400 py-2 px-2 text-center text-[11px] font-semibold text-emerald-700">
                            Hadir
                          </td>
                          <td class="border border-secondary-400 py-2 px-3 text-center align-bottom text-[10px] text-secondary-400 h-12">
                            ..........................
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              {/* 6. Hasil Keputusan Sidang */}
              <div class="mb-5">
                <h2 class="text-xs font-bold uppercase tracking-wider text-secondary-800 mb-2">
                  B. Keputusan Dewan Penguji
                </h2>
                <div class="border border-secondary-300 p-3.5 rounded-lg space-y-2.5">
                  <div class="flex items-center justify-between border-b border-secondary-200 pb-2">
                    <div>
                      <span class="text-[11px] text-secondary-500 font-semibold uppercase block">Hasil Keputusan:</span>
                      <span class="text-sm font-bold text-secondary-900 tracking-wide">
                        {getKeputusanLabel(s.statusHasil)}
                      </span>
                    </div>
                    <div class="text-right">
                      <span class="text-[11px] text-secondary-500 font-semibold uppercase block">
                        Nilai Gabungan Akhir:
                      </span>
                      <span class="text-base font-black text-secondary-900">
                        {s.nilaiAkhirAngka ? Number(s.nilaiAkhirAngka).toFixed(2) : '-'} / Skala 10 (
                        {s.nilaiAkhirHuruf || '-'})
                      </span>
                    </div>
                  </div>

                  <Show when={s.batasWaktuRevisi}>
                    <p class="text-xs">
                      <span class="font-semibold text-secondary-700">Batas Akhir Perbaikan/Revisi: </span>
                      <span class="font-bold underline">{formatTanggalIndo(s.batasWaktuRevisi)}</span>
                    </p>
                  </Show>

                  <Show when={s.catatanSidang}>
                    <div class="text-xs">
                      <span class="font-semibold text-secondary-700 block mb-0.5">Catatan Khusus Dewan Penguji:</span>
                      <p class="p-2 bg-secondary-50 border border-secondary-200 rounded italic text-secondary-800">
                        "{s.catatanSidang}"
                      </p>
                    </div>
                  </Show>
                </div>
              </div>

              {/* 7. Penutup & Pengesahan Berita Acara */}
              <div class="text-justify leading-relaxed mb-6">
                <p>
                  Demikian Berita Acara ini dibuat dengan sebenarnya dan ditandatangani oleh Tim Penguji untuk dapat
                  dipergunakan sebagaimana mestinya sesuai ketentuan akademik yang berlaku di Politeknik Sorowako.
                </p>
              </div>

              {/* 8. Lembar Tanda Tangan */}
              <div class="pt-2 text-xs">
                <div class="flex justify-end mb-4">
                  <p class="text-secondary-700">
                    Sorowako, <span class="font-semibold">{formatTanggalIndo(s.tanggalSidang)}</span>
                  </p>
                </div>

                <div class="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <p class="font-semibold text-secondary-700 mb-16">Ketua Tim Penguji,</p>
                    <p class="font-bold underline uppercase">
                      {data().timPenguji.find((p) => p.peranPenguji === 'ketua_penguji')?.dosenNama ||
                        '(....................................................)'}
                    </p>
                    <p class="text-[11px] text-secondary-600">
                      NIP:{' '}
                      {data().timPenguji.find((p) => p.peranPenguji === 'ketua_penguji')?.dosenNip ||
                        '............................................'}
                    </p>
                  </div>

                  <div>
                    <p class="font-semibold text-secondary-700 mb-16">
                      Mengetahui,
                      <br />
                      Ketua Program Studi
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
