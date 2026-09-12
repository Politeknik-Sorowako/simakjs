import { useSearchParams } from '@solidjs/router';
import { createEffect, createResource, createSignal, For, Show } from 'solid-js';
import type { KelasKuliah } from '../controllers/kelasKuliahController';
import { kelasKuliahController } from '../controllers/kelasKuliahController';
import type { Krs } from '../controllers/krsController';
import { krsController } from '../controllers/krsController';
import type { Mahasiswa } from '../controllers/mahasiswaController';
import { mahasiswaController } from '../controllers/mahasiswaController';

interface PrintData {
  profile: Mahasiswa;
  items: { krs: Krs; kelas: KelasKuliah | null }[];
  totalSks: number;
  periodeId: string;
}

const dosenPengajarLabel = (kelas: KelasKuliah | null | undefined) =>
  kelas?.dosenPengajarKelas
    ?.map((d) => d.dosen?.nama)
    .filter(Boolean)
    .join(', ') || '-';

export default function KrsCetak() {
  const [searchParams] = useSearchParams();
  const [hasPrinted, setHasPrinted] = createSignal(false);

  const [printData] = createResource(
    () => {
      const id = Number(searchParams.mahasiswaId);
      if (!id) return null;
      return { id, periodeId: searchParams.periodeId || '' };
    },
    async (target): Promise<PrintData | null> => {
      if (!target) return null;
      const profile = await mahasiswaController.getById(target.id, true);
      const krsRes = await krsController.getAll(profile.nim, 1, 200);
      let rows = krsRes.data.filter((k) => k.mahasiswaId === target.id);
      if (target.periodeId) {
        rows = rows.filter((k) => k.kelasKuliah?.periodeId === target.periodeId);
      }
      const kelasList = await Promise.all(
        rows.map((r) => kelasKuliahController.getById(r.kelasKuliahId).catch(() => null)),
      );
      const items = rows.map((r, i) => ({ krs: r, kelas: kelasList[i] }));
      const totalSks = items.reduce((sum, it) => sum + (it.kelas?.mataKuliah?.sksTotal || 0), 0);
      return {
        profile,
        items,
        totalSks,
        periodeId: target.periodeId || rows[0]?.kelasKuliah?.periodeId || '',
      };
    },
  );

  createEffect(() => {
    if (printData() && !hasPrinted()) {
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
              {printData.error
                ? 'Data KRS tidak dapat dimuat. Pastikan Anda memiliki akses ke data mahasiswa ini.'
                : 'Data KRS tidak ditemukan.'}
            </div>
          }
        >
          {(data) => (
            <div id="print-area-krs" class="text-secondary-800">
              <div class="border-b border-secondary-200 pb-3 text-center">
                <h2 class="text-xl font-bold tracking-wider text-brand-700">POLITEKNIK SOROWAKO</h2>
                <h3 class="text-base font-bold uppercase tracking-widest text-secondary-600">
                  Kartu Rencana Studi (KRS)
                </h3>
                <p class="text-xs text-secondary-500">Periode Akademik: {data().periodeId || '-'}</p>
              </div>

              <div class="mt-4 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div>
                  <p>
                    Nama: <span class="font-bold text-secondary-900">{data().profile.nama || '-'}</span>
                  </p>
                  <p>
                    NIM: <span class="font-bold">{data().profile.nim || '-'}</span>
                  </p>
                </div>
                <div class="text-right">
                  <p>
                    Program Studi: <span class="font-bold">{data().profile.programStudi?.nama || '-'}</span>
                  </p>
                  <p>
                    Dosen PA: <span class="font-bold">{data().profile.dosenPa?.nama || '-'}</span>
                  </p>
                </div>
              </div>

              <table class="mt-4 w-full border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-secondary-200 bg-secondary-50 font-bold uppercase text-secondary-500">
                    <th class="border-r border-secondary-200 p-2">No</th>
                    <th class="border-r border-secondary-200 p-2">Kode MK</th>
                    <th class="border-r border-secondary-200 p-2">Nama Mata Kuliah</th>
                    <th class="border-r border-secondary-200 p-2">Kelas</th>
                    <th class="border-r border-secondary-200 p-2 text-center">SKS</th>
                    <th class="border-r border-secondary-200 p-2">Dosen Pengajar</th>
                    <th class="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={data().items}>
                    {(row, idx) => (
                      <tr class="border-b border-secondary-200">
                        <td class="border-r border-secondary-200 p-2">{idx() + 1}</td>
                        <td class="border-r border-secondary-200 p-2">{row.kelas?.mataKuliah?.kode || '-'}</td>
                        <td class="border-r border-secondary-200 p-2 font-bold text-secondary-800">
                          {row.kelas?.mataKuliah?.nama || '-'}
                        </td>
                        <td class="border-r border-secondary-200 p-2">{row.kelas?.namaKelas || '-'}</td>
                        <td class="border-r border-secondary-200 p-2 text-center">
                          {row.kelas?.mataKuliah?.sksTotal ?? '-'}
                        </td>
                        <td class="border-r border-secondary-200 p-2">{dosenPengajarLabel(row.kelas)}</td>
                        <td class="p-2 text-center">{row.krs.isApproved ? 'Disetujui' : 'Pending'}</td>
                      </tr>
                    )}
                  </For>
                  <Show when={data().items.length === 0}>
                    <tr>
                      <td colspan="7" class="p-6 text-center text-secondary-400">
                        Tidak ada kontrak KRS pada periode ini.
                      </td>
                    </tr>
                  </Show>
                </tbody>
                <tfoot>
                  <tr class="font-bold text-secondary-800">
                    <td colspan="4" class="border-r border-secondary-200 p-2 text-right">
                      Total SKS
                    </td>
                    <td class="border-r border-secondary-200 p-2 text-center">{data().totalSks}</td>
                    <td colspan="2" class="p-2" />
                  </tr>
                </tfoot>
              </table>

              <div class="mt-12 grid grid-cols-2 gap-4 text-xs text-secondary-700">
                <div class="text-center">
                  <p>Mahasiswa</p>
                  <div class="h-16" />
                  <p class="font-bold underline">
                    {(data().profile.nama || '').trim() || '...........................'}
                  </p>
                </div>
                <div class="text-center">
                  <p>Dosen Pembimbing Akademik</p>
                  <div class="h-16" />
                  <p class="font-bold underline">{data().profile.dosenPa?.nama || '...........................'}</p>
                </div>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
