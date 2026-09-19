import { useSearchParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { type BkdRekap, bkdController } from '../controllers/bkdController';

const PRESENSI_LABEL: {
  key: keyof { hadir: number; sakit: number; izin: number; alpa: number; telat: number };
  label: string;
}[] = [
  { key: 'hadir', label: 'H' },
  { key: 'sakit', label: 'S' },
  { key: 'izin', label: 'I' },
  { key: 'alpa', label: 'A' },
  { key: 'telat', label: 'T' },
];

export default function BkdCetak() {
  const [searchParams] = useSearchParams();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  const [rekap] = createResource(
    () => {
      const dosenId = Number(searchParams.dosenId);
      const periodeId = searchParams.periodeId || '';
      if (!dosenId || !periodeId) return null;
      return { dosenId, periodeId };
    },
    async (target): Promise<BkdRekap | null> => {
      if (!target) return null;
      try {
        const res = await bkdController.getRekap(target.dosenId, target.periodeId);
        return res.data;
      } catch {
        return null;
      }
    },
  );

  createEffect(() => {
    if (rekap() && !hasPrinted()) {
      setHasPrinted(true);
      setTimeout(() => window.print(), 300);
    }
  });

  return (
    <div class="min-h-screen bg-white p-8 text-secondary-800">
      <div class="mb-4 flex justify-end print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          class="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
        >
          🖨️ Cetak Sekarang
        </button>
      </div>

      <Show
        when={!rekap.loading}
        fallback={
          <div class="flex items-center justify-center py-24 text-secondary-400">
            <div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <span class="text-sm">Menyiapkan data cetak...</span>
          </div>
        }
      >
        <Show
          when={rekap()}
          fallback={
            <div class="rounded-2xl border border-secondary-100 p-10 text-center text-secondary-500">
              Data BKD tidak dapat dimuat. Pastikan parameter dosen &amp; periode valid dan Anda memiliki akses.
            </div>
          }
        >
          {(data) => (
            <div id="print-area-bkd" class="text-secondary-800">
              <div class="border-b border-secondary-200 pb-3 text-center">
                <h2 class="text-xl font-bold tracking-wider text-brand-700">POLITEKNIK SOROWAKO</h2>
                <h3 class="text-base font-bold uppercase tracking-widest text-secondary-600">
                  Laporan Beban Kerja Dosen (BKD)
                </h3>
                <p class="text-xs text-secondary-500">Periode Akademik: {data().periode.nama || '-'}</p>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div>
                  <p>
                    Nama Dosen: <span class="font-bold text-secondary-900">{data().dosen.nama || '-'}</span>
                  </p>
                  <p>
                    NIP: <span class="font-bold">{data().dosen.nip || '-'}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p>
                    NIDN: <span class="font-bold">{data().dosen.nidn || '-'}</span>
                  </p>
                  <p>
                    Program Studi: <span class="font-bold">{data().dosen.prodi || '-'}</span>
                  </p>
                </div>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  A. Rekapitulasi Mengajar
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">Kode MK</th>
                      <th class="border-r border-secondary-200 p-2">Mata Kuliah</th>
                      <th class="border-r border-secondary-200 p-2">Kelas</th>
                      <th class="border-r border-secondary-200 p-2 text-center">SKS</th>
                      <th class="border-r border-secondary-200 p-2 text-center">Pertemuan</th>
                      <th class="p-2 text-center">Total Menit</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={data().mengajar}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2">{r.mataKuliah.kode}</td>
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                            {r.mataKuliah.nama}
                          </td>
                          <td class="border-r border-secondary-200 p-2">{r.namaKelas}</td>
                          <td class="border-r border-secondary-200 p-2 text-center">{r.mataKuliah.sks}</td>
                          <td class="border-r border-secondary-200 p-2 text-center">{r.jumlahPertemuan}</td>
                          <td class="p-2 text-center">{r.totalMenit}</td>
                        </tr>
                      )}
                    </For>
                    <Show when={data().mengajar.length === 0}>
                      <tr>
                        <td colspan="6" class="p-4 text-center text-secondary-400">
                          Tidak ada kelas yang diampu pada periode ini.
                        </td>
                      </tr>
                    </Show>
                  </tbody>
                  <tfoot>
                    <tr class="font-bold text-secondary-800">
                      <td colspan="3" class="border-r border-secondary-200 p-2 text-right">
                        Total
                      </td>
                      <td class="border-r border-secondary-200 p-2 text-center">{data().ringkasan.totalSks}</td>
                      <td class="border-r border-secondary-200 p-2 text-center">{data().ringkasan.totalPertemuan}</td>
                      <td class="p-2 text-center">{data().ringkasan.totalMenit}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  B. Rekap Presensi per Kelas
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">Mata Kuliah</th>
                      <th class="border-r border-secondary-200 p-2">Kelas</th>
                      <th class="border-r border-secondary-200 p-2 text-center">H</th>
                      <th class="border-r border-secondary-200 p-2 text-center">S</th>
                      <th class="border-r border-secondary-200 p-2 text-center">I</th>
                      <th class="border-r border-secondary-200 p-2 text-center">A</th>
                      <th class="p-2 text-center">T</th>
                      <th class="p-2 text-center">% Hadir</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={data().mengajar}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                            {r.mataKuliah.nama}
                          </td>
                          <td class="border-r border-secondary-200 p-2">{r.namaKelas}</td>
                          <For each={PRESENSI_LABEL}>
                            {(st) => (
                              <td class="border-r border-secondary-200 p-2 text-center">{r.presensi[st.key]}</td>
                            )}
                          </For>
                          <td class="p-2 text-center">{r.presensi.persen}%</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="mt-6">
                <h4 class="mb-2 text-sm font-bold uppercase tracking-widest text-secondary-600">
                  C. Riwayat Bimbingan Akademik
                </h4>
                <table class="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                      <th class="border-r border-secondary-200 p-2">NIM</th>
                      <th class="border-r border-secondary-200 p-2">Mahasiswa</th>
                      <th class="border-r border-secondary-200 p-2 text-center">Sesi</th>
                      <th class="p-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={data().bimbingan}>
                      {(r) => (
                        <tr class="border-b border-secondary-200">
                          <td class="border-r border-secondary-200 p-2">{r.mahasiswa?.nim || '-'}</td>
                          <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                            {r.mahasiswa?.nama || '-'}
                          </td>
                          <td class="border-r border-secondary-200 p-2 text-center">{r.sesi?.length || 0}</td>
                          <td class="p-2 text-center">{r.isApproved ? 'Disetujui' : 'Pending'}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="mt-12 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div class="text-center">
                  <p>Mengetahui,</p>
                  <p>Kaprodi / Pimpinan</p>
                  <div class="h-16" />
                  <p class="font-bold underline">.........................................................</p>
                </div>
                <div class="text-center">
                  <p>Dosen Yang Bersangkutan</p>
                  <div class="h-16" />
                  <p class="font-bold underline">{data().dosen.nama || '...........................'}</p>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
