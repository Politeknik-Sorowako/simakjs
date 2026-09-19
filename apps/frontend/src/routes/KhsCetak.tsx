import { useParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { type KhsResponse, khsController } from '../controllers/khsController';
import { mahasiswaController } from '../controllers/mahasiswaController';

interface PrintData {
  nim: string;
  nama: string;
  prodi: string;
  periodeId: string;
  khs: KhsResponse;
}

export default function KhsCetak() {
  const auth = useAuth();
  const params = useParams();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  const [printData] = createResource(
    () => {
      const mhsId = Number(params.mhsId);
      if (!mhsId) return null;
      return { mhsId, periodeId: params.periodeId || '' };
    },
    async (target): Promise<PrintData | null> => {
      if (!target) return null;
      try {
        const khs = await khsController.getByMhsIdAndPeriode(target.mhsId, target.periodeId);
        const profile = await mahasiswaController.getById(target.mhsId).catch(() => null);
        return {
          nim: profile?.nim || '',
          nama: profile?.nama || '',
          prodi: profile?.programStudi?.nama || '',
          periodeId: target.periodeId,
          khs,
        };
      } catch {
        return null;
      }
    },
  );

  createEffect(() => {
    if (printData() && !hasPrinted()) {
      setHasPrinted(true);
      setTimeout(() => window.print(), 300);
    }
  });

  const showWatermark = () =>
    printData()?.khs.warningTunggakan || (printData()?.khs.blocked && !auth.hasRole(['mahasiswa']));

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
        when={!printData.loading}
        fallback={
          <div class="flex items-center justify-center py-24 text-secondary-400">
            <div class="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            <span class="text-sm">Menyiapkan data cetak...</span>
          </div>
        }
      >
        <Show
          when={printData()}
          fallback={
            <div class="rounded-2xl border border-secondary-100 p-10 text-center text-secondary-500">
              Data KHS tidak dapat dimuat. Pastikan Anda memiliki akses ke data mahasiswa ini.
            </div>
          }
        >
          {(data) => (
            <div id="print-area-khs" class="relative text-secondary-800">
              <Show when={showWatermark()}>
                <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center print:fixed">
                  <span class="rotate-[-30deg] border-4 border-red-500/40 px-10 py-2 text-3xl font-black uppercase tracking-widest text-red-500/40">
                    TUNGGAKAN — CETAK ADMIN
                  </span>
                </div>
              </Show>

              <div class="border-b border-secondary-200 pb-3 text-center">
                <h2 class="text-xl font-bold tracking-wider text-brand-700">POLITEKNIK SOROWAKO</h2>
                <h3 class="text-base font-bold uppercase tracking-widest text-secondary-600">
                  Kartu Hasil Studi (KHS) — Semester
                </h3>
                <p class="text-xs text-secondary-500">Periode Akademik: {data().periodeId || '-'}</p>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div>
                  <p>
                    Nama: <span class="font-bold text-secondary-900">{data().nama || '-'}</span>
                  </p>
                  <p>
                    NIM: <span class="font-bold">{data().nim || '-'}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p>
                    Program Studi: <span class="font-bold">{data().prodi || '-'}</span>
                  </p>
                  <p>
                    IPK: <span class="font-bold">{data().khs.summary?.ipk ?? '-'}</span>
                  </p>
                </div>
              </div>

              <Show when={data().khs.warningTunggakan}>
                {(wt) => (
                  <div class="mt-3 border border-red-300 bg-red-50 p-3 text-xs text-red-700">
                    <p class="font-bold">Peringatan: {wt().reason}</p>
                    <p>{wt().detail}</p>
                  </div>
                )}
              </Show>

              <table class="mt-4 w-full border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                    <th class="border-r border-secondary-200 p-2">Kode MK</th>
                    <th class="border-r border-secondary-200 p-2">Mata Kuliah</th>
                    <th class="border-r border-secondary-200 p-2">Kelas</th>
                    <th class="border-r border-secondary-200 p-2 text-center">SKS</th>
                    <th class="border-r border-secondary-200 p-2 text-center">Nilai Angka</th>
                    <th class="border-r border-secondary-200 p-2 text-center">Nilai Huruf</th>
                    <th class="p-2 text-center">Indeks</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data().khs.krsList || []}>
                    {(r) => (
                      <tr class="border-b border-secondary-200">
                        <td class="border-r border-secondary-200 p-2">{r.mataKuliah.kode}</td>
                        <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                          {r.mataKuliah.nama}
                        </td>
                        <td class="border-r border-secondary-200 p-2">{r.kelasKuliah.namaKelas}</td>
                        <td class="border-r border-secondary-200 p-2 text-center">{r.mataKuliah.sksTotal}</td>
                        <td class="border-r border-secondary-200 p-2 text-center">{r.nilaiAngka ?? '-'}</td>
                        <td class="border-r border-secondary-200 p-2 text-center font-bold">{r.nilaiHuruf ?? '-'}</td>
                        <td class="p-2 text-center">{r.nilaiIndeks ?? '-'}</td>
                      </tr>
                    )}
                  </For>
                  <Show when={!data().khs.krsList?.length}>
                    <tr>
                      <td colspan="7" class="p-6 text-center text-secondary-400">
                        Tidak ada mata kuliah pada periode ini.
                      </td>
                    </tr>
                  </Show>
                </tbody>
                <tfoot>
                  <tr class="font-bold text-secondary-800">
                    <td colspan="3" class="border-r border-secondary-200 p-2 text-right">
                      Total SKS
                    </td>
                    <td class="border-r border-secondary-200 p-2 text-center">{data().khs.summary?.totalSks ?? 0}</td>
                    <td colspan="3" class="p-2 text-center">
                      IP Semester: {data().khs.summary?.ipSemester ?? '-'}
                    </td>
                  </tr>
                </tfoot>
              </table>

              <div class="mt-12 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div class="text-center">
                  <p>Mengetahui,</p>
                  <p>Kaprodi / Pimpinan</p>
                  <div class="h-16" />
                  <p class="font-bold underline">.........................................................</p>
                </div>
                <div class="text-center">
                  <p>Mahasiswa</p>
                  <div class="h-16" />
                  <p class="font-bold underline">{data().nama || '...........................'}</p>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
