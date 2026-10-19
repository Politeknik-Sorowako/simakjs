import { useNavigate, useParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import KopSurat, { KOPI_FALLBACK } from '../components/cetak/KopSurat';
import { systemController } from '../controllers/systemController';
import { type TugasAkhir, type TugasAkhirLogbook, tugasAkhirController } from '../controllers/tugasAkhirController';

interface KartuKendaliData {
  ta: TugasAkhir;
  logbooks: TugasAkhirLogbook[];
}

export default function TugasAkhirKartuKendaliCetak() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  // Ambil kop surat resmi institusi
  const [kop] = createResource(() => systemController.getKop().catch(() => null));

  // Ambil detail Tugas Akhir dan riwayat logbook bimbingan
  const [dataResource] = createResource(
    () => Number(params.id),
    async (taId): Promise<KartuKendaliData | null> => {
      if (!taId || isNaN(taId)) return null;
      const [ta, logbooks] = await Promise.all([
        tugasAkhirController.getById(taId),
        tugasAkhirController.getLogbooks(taId),
      ]);
      return { ta, logbooks };
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

  const todayIndo = () => {
    const d = new Date();
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div class="min-h-screen bg-white p-6 sm:p-10 text-secondary-900 font-sans">
      {/* Tombol Aksi Kontrol (Disembunyikan saat dicetak) */}
      <div class="mb-6 flex items-center justify-between border-b pb-4 print:hidden">
        <button
          type="button"
          onClick={() => navigate('/tugas-akhir')}
          class="inline-flex items-center gap-2 rounded-xl border border-secondary-300 bg-white px-4 py-2 text-xs font-semibold text-secondary-700 shadow-2xs hover:bg-secondary-50 active:scale-95"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Kembali ke Tugas Akhir
        </button>

        <div class="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            class="inline-flex items-center gap-2 rounded-full bg-action-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-action-700 active:scale-95"
          >
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Cetak Kartu Kendali
          </button>
        </div>
      </div>

      <Show
        when={!dataResource.loading}
        fallback={
          <div class="flex items-center justify-center py-28 text-secondary-500">
            <div class="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-action-600 border-t-transparent" />
            <span class="text-sm font-medium">Menyiapkan kartu kendali bimbingan...</span>
          </div>
        }
      >
        <Show
          when={dataResource()}
          fallback={
            <div class="rounded-2xl border border-secondary-200 p-12 text-center text-secondary-500">
              Data Tugas Akhir tidak ditemukan atau Anda tidak memiliki akses ke kartu kendali ini.
            </div>
          }
        >
          {(data) => {
            const ta = data().ta;
            const logbooks = data().logbooks;

            const pembimbing1 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_1');
            const pembimbing2 = ta.pembimbing?.find((p) => p.peran === 'pembimbing_2');
            const ketuaMhs = ta.anggota?.find((a) => a.peran === 'ketua') || ta.anggota?.[0];

            return (
              <div class="max-w-4xl mx-auto print:max-w-none text-secondary-900 text-xs sm:text-sm">
                {/* 1. Kop Surat Institusi */}
                <KopSurat kop={kop() ?? KOPI_FALLBACK} />

                {/* 2. Judul Dokumen */}
                <div class="my-5 text-center">
                  <h1 class="text-base sm:text-lg font-bold tracking-tight uppercase text-secondary-900 underline underline-offset-4">
                    KARTU KENDALI BIMBINGAN TUGAS AKHIR
                  </h1>
                  <p class="text-xs text-secondary-600 mt-1">
                    Program Studi {ta.prodiNama || '-'} • Periode Akademik {ta.periodeNama || ta.periodeId || '-'}
                  </p>
                </div>

                {/* 3. Identitas Tugas Akhir & Mahasiswa */}
                <div class="mb-6 rounded-lg border border-secondary-300 p-4 bg-secondary-50/50 print:bg-transparent">
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
                      <Show when={ta.bidangKajian}>
                        <tr class="align-top">
                          <td class="py-1 font-semibold text-secondary-700">Bidang Kajian</td>
                          <td class="py-1 text-center font-bold">:</td>
                          <td class="py-1">{ta.bidangKajian}</td>
                        </tr>
                      </Show>
                      <tr class="align-top">
                        <td class="py-1 font-semibold text-secondary-700">
                          {ta.tipe === 'kelompok' ? 'Mahasiswa (Tim)' : 'Mahasiswa Pengusul'}
                        </td>
                        <td class="py-1 text-center font-bold">:</td>
                        <td class="py-1">
                          <Show
                            when={ta.tipe === 'kelompok' && (ta.anggota?.length || 0) > 1}
                            fallback={
                              <span>
                                {ketuaMhs?.mahasiswaNama || '-'}{' '}
                                <span class="font-mono text-secondary-600">({ketuaMhs?.mahasiswaNim || '-'})</span>
                              </span>
                            }
                          >
                            <ol class="list-decimal pl-4 space-y-0.5">
                              <For each={ta.anggota}>
                                {(ang) => (
                                  <li>
                                    <span class="font-medium">{ang.mahasiswaNama}</span> ({ang.mahasiswaNim}) —{' '}
                                    <span class="italic text-secondary-600">
                                      {ang.peran === 'ketua' ? 'Ketua' : 'Anggota'}
                                    </span>
                                  </li>
                                )}
                              </For>
                            </ol>
                          </Show>
                        </td>
                      </tr>
                      <tr class="align-top">
                        <td class="py-1 font-semibold text-secondary-700">Pembimbing 1 (Utama)</td>
                        <td class="py-1 text-center font-bold">:</td>
                        <td class="py-1">
                          <span class="font-semibold">
                            {pembimbing1?.dosenNama || pembimbing1?.namaEksternal || '-'}
                          </span>
                          <Show when={pembimbing1?.dosenNip}>
                            <span class="text-secondary-600"> (NIP: {pembimbing1?.dosenNip})</span>
                          </Show>
                        </td>
                      </tr>
                      <tr class="align-top">
                        <td class="py-1 font-semibold text-secondary-700">Pembimbing 2 (Pendamping)</td>
                        <td class="py-1 text-center font-bold">:</td>
                        <td class="py-1">
                          <span class="font-semibold">
                            {pembimbing2?.dosenNama || pembimbing2?.namaEksternal || '-'}
                          </span>
                          <Show when={pembimbing2?.dosenNip}>
                            <span class="text-secondary-600"> (NIP: {pembimbing2?.dosenNip})</span>
                          </Show>
                          <Show when={pembimbing2?.instansiEksternal}>
                            <span class="text-secondary-600 italic"> — {pembimbing2?.instansiEksternal}</span>
                          </Show>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Tabel Riwayat Sesi Bimbingan (Logbook) */}
                <div class="mb-6">
                  <h2 class="text-xs sm:text-sm font-bold uppercase tracking-wider text-secondary-800 mb-2">
                    Riwayat Sesi Bimbingan ({logbooks.length} Pertemuan)
                  </h2>
                  <table class="w-full border-collapse border border-secondary-400 text-xs">
                    <thead>
                      <tr class="bg-secondary-100 text-secondary-900 font-bold border-b border-secondary-400">
                        <th class="border border-secondary-400 px-2.5 py-2 text-center w-10">No</th>
                        <th class="border border-secondary-400 px-2.5 py-2 text-left w-28">Hari / Tanggal</th>
                        <th class="border border-secondary-400 px-3 py-2 text-left w-48">Topik / Materi Bimbingan</th>
                        <th class="border border-secondary-400 px-3 py-2 text-left">Catatan & Arahan Pembimbing</th>
                        <th class="border border-secondary-400 px-2.5 py-2 text-center w-28">Pembimbing</th>
                        <th class="border border-secondary-400 px-2 py-2 text-center w-20">Status</th>
                        <th class="border border-secondary-400 px-2 py-2 text-center w-20">Paraf</th>
                      </tr>
                    </thead>
                    <tbody>
                      <Show
                        when={logbooks.length > 0}
                        fallback={
                          <tr>
                            <td
                              colspan={7}
                              class="border border-secondary-400 py-6 text-center italic text-secondary-500"
                            >
                              Belum ada catatan logbook bimbingan yang terdata.
                            </td>
                          </tr>
                        }
                      >
                        <For each={logbooks}>
                          {(lb, idx) => (
                            <tr class="align-top border-b border-secondary-300">
                              <td class="border border-secondary-400 px-2 py-2 text-center font-semibold">
                                {lb.pertemuanKe || idx() + 1}
                              </td>
                              <td class="border border-secondary-400 px-2 py-2 whitespace-nowrap">
                                {formatTanggalIndo(lb.tanggalBimbingan)}
                              </td>
                              <td class="border border-secondary-400 px-3 py-2">
                                <p class="font-semibold text-secondary-900">{lb.topik}</p>
                                <Show when={lb.deskripsiKemajuan}>
                                  <p class="text-[11px] text-secondary-600 mt-1 leading-snug line-clamp-3">
                                    {lb.deskripsiKemajuan}
                                  </p>
                                </Show>
                              </td>
                              <td class="border border-secondary-400 px-3 py-2 leading-relaxed">
                                {lb.catatanDosen || <span class="text-secondary-400 italic">-</span>}
                              </td>
                              <td class="border border-secondary-400 px-2 py-2 text-center text-[11px]">
                                {lb.dosenNama || <span class="italic text-secondary-500">Pembimbing</span>}
                              </td>
                              <td class="border border-secondary-400 px-2 py-2 text-center">
                                <span
                                  class={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                    lb.statusBimbingan === 'disetujui'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : lb.statusBimbingan === 'perlu_revisi'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                        : 'bg-secondary-100 text-secondary-700'
                                  }`}
                                >
                                  {lb.statusBimbingan === 'disetujui'
                                    ? 'Disetujui'
                                    : lb.statusBimbingan === 'perlu_revisi'
                                      ? 'Revisi'
                                      : 'Menunggu'}
                                </span>
                              </td>
                              <td class="border border-secondary-400 px-2 py-2 text-center">
                                <Show when={lb.statusBimbingan === 'disetujui'}>
                                  <span class="text-xs font-mono font-bold text-emerald-700">✓ Paraf</span>
                                </Show>
                              </td>
                            </tr>
                          )}
                        </For>
                      </Show>
                    </tbody>
                  </table>
                </div>

                {/* 5. Status Rekomendasi Ujian (ACC Maju Sidang) */}
                <div class="mb-8 rounded-lg border border-secondary-300 p-3 bg-secondary-50/30 print:bg-transparent">
                  <h3 class="text-xs font-bold uppercase tracking-wider text-secondary-800 mb-2">
                    Status Rekomendasi Maju Ujian / Sidang
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div class="border rounded p-2.5 bg-white print:border-secondary-400">
                      <p class="font-bold text-secondary-800">1. Seminar Proposal (Sempro)</p>
                      <div class="mt-1.5 space-y-1 text-[11px]">
                        <p>
                          Pembimbing 1:{' '}
                          <span
                            class={`font-bold ${pembimbing1?.accSidangProposal ? 'text-emerald-700' : 'text-amber-700'}`}
                          >
                            {pembimbing1?.accSidangProposal ? '✓ SUDAH ACC' : '○ BELUM ACC'}
                          </span>
                        </p>
                        <p>
                          Pembimbing 2:{' '}
                          <span
                            class={`font-bold ${pembimbing2?.accSidangProposal ? 'text-emerald-700' : 'text-amber-700'}`}
                          >
                            {pembimbing2?.accSidangProposal ? '✓ SUDAH ACC' : '○ BELUM ACC'}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div class="border rounded p-2.5 bg-white print:border-secondary-400">
                      <p class="font-bold text-secondary-800">2. Sidang Akhir (Pendadaran Meja Hijau)</p>
                      <div class="mt-1.5 space-y-1 text-[11px]">
                        <p>
                          Pembimbing 1:{' '}
                          <span
                            class={`font-bold ${pembimbing1?.accSidangAkhir ? 'text-emerald-700' : 'text-amber-700'}`}
                          >
                            {pembimbing1?.accSidangAkhir ? '✓ SUDAH ACC' : '○ BELUM ACC'}
                          </span>
                        </p>
                        <p>
                          Pembimbing 2:{' '}
                          <span
                            class={`font-bold ${pembimbing2?.accSidangAkhir ? 'text-emerald-700' : 'text-amber-700'}`}
                          >
                            {pembimbing2?.accSidangAkhir ? '✓ SUDAH ACC' : '○ BELUM ACC'}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Lembar Tanda Tangan Resmi (Footer) */}
                <div class="mt-8 break-inside-avoid text-xs">
                  <div class="text-right mb-4">
                    <p>Sorowako, {todayIndo()}</p>
                  </div>

                  <div class="grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p class="font-semibold text-secondary-700 mb-16">Dosen Pembimbing 1,</p>
                      <p class="font-bold underline uppercase">
                        {pembimbing1?.dosenNama ||
                          pembimbing1?.namaEksternal ||
                          '(.......................................)'}
                      </p>
                      <p class="text-[11px] text-secondary-600">NIP: {pembimbing1?.dosenNip || '-'}</p>
                    </div>

                    <div>
                      <p class="font-semibold text-secondary-700 mb-16">Dosen Pembimbing 2,</p>
                      <p class="font-bold underline uppercase">
                        {pembimbing2?.dosenNama ||
                          pembimbing2?.namaEksternal ||
                          '(.......................................)'}
                      </p>
                      <p class="text-[11px] text-secondary-600">NIP: {pembimbing2?.dosenNip || '-'}</p>
                    </div>
                  </div>

                  <div class="mt-8 grid grid-cols-2 gap-8 text-center">
                    <div>
                      <p class="font-semibold text-secondary-700 mb-16">Mahasiswa (Ketua Tim),</p>
                      <p class="font-bold underline uppercase">
                        {ketuaMhs?.mahasiswaNama || '(.......................................)'}
                      </p>
                      <p class="text-[11px] text-secondary-600">NIM: {ketuaMhs?.mahasiswaNim || '-'}</p>
                    </div>

                    <div>
                      <p class="font-semibold text-secondary-700 mb-16">
                        Mengetahui,
                        <br />
                        Ketua Program Studi
                      </p>
                      <p class="font-bold underline uppercase">
                        (....................................................)
                      </p>
                      <p class="text-[11px] text-secondary-600">NIP: ............................................</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        </Show>
      </Show>
    </div>
  );
}
