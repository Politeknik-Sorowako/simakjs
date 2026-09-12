import { createResource, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { presensiController } from '../controllers/presensiController';
import { fmtTanggal } from '../utils/format';

export default function KompensasiMahasiswa() {
  const auth = useAuth();
  const email = () => auth.user()?.email;

  const [mhsProfile] = createResource(email, async (mail) => {
    if (!mail) return null;
    const res = await mahasiswaController.getAll(mail, 1, 1);
    return res.data[0] || null;
  });

  const [detail] = createResource(
    () => mhsProfile()?.id,
    async (id) => {
      if (!id) return null;
      return presensiController.getKompensasiDetail(id);
    },
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-6">
        <div>
          <h1 class="text-2xl font-bold text-secondary-800 dark:text-white">Detail Kompensasi Saya</h1>
          <p class="text-sm text-secondary-500 dark:text-secondary-200">
            Rincian akumulasi jam kompensasi dari perkuliahan, apel, dan penyesuaian manual, beserta riwayat
            pelunasannya.
          </p>
        </div>

        <Show
          when={!mhsProfile.loading && !detail.loading}
          fallback={
            <div class="flex items-center justify-center py-16 text-secondary-400 dark:text-secondary-300">
              <div class="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mr-2" />
              <span class="text-sm">Memuat data kompensasi...</span>
            </div>
          }
        >
          <Show
            when={mhsProfile()}
            fallback={
              <div class="rounded-2xl border border-secondary-100 bg-white p-8 text-center text-secondary-500 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                Profil mahasiswa tidak ditemukan. Silakan hubungi Admin Prodi.
              </div>
            }
          >
            <Show
              when={detail()}
              fallback={
                <div class="rounded-2xl border border-secondary-100 bg-white p-8 text-center text-secondary-500 dark:border-secondary-800 dark:bg-secondary-900 dark:text-secondary-200">
                  Belum ada data kompensasi untuk akun Anda.
                </div>
              }
            >
              {(data) => (
                <div class="flex flex-col gap-6">
                  <div class="rounded-2xl border border-secondary-100 bg-white p-5 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
                    <div class="text-caption font-semibold uppercase tracking-wider text-secondary-400">
                      {data().mahasiswa.nama} · {data().mahasiswa.nim}
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="rounded-2xl border border-orange-200 bg-orange-50 p-5 shadow-sm dark:border-orange-900/40 dark:bg-orange-900/20">
                      <div class="text-caption font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                        Total Kompensasi
                      </div>
                      <div class="mt-1 text-2xl font-bold text-orange-700 dark:text-orange-300">
                        {data().summary.totalKompensasi} Menit
                      </div>
                    </div>
                    <div class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-900/20">
                      <div class="text-caption font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Sudah Dilunasi
                      </div>
                      <div class="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                        {data().summary.totalDibayar} Menit
                      </div>
                    </div>
                    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm dark:border-rose-900/40 dark:bg-rose-900/20">
                      <div class="text-caption font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Sisa Tanggungan
                      </div>
                      <div class="mt-1 text-2xl font-bold text-rose-700 dark:text-rose-300">
                        {Math.max(0, data().summary.sisaKompensasi)} Menit
                      </div>
                    </div>
                  </div>

                  <div class="rounded-2xl border border-secondary-100 bg-white p-6 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
                    <h2 class="mb-3 text-base font-bold text-secondary-800 dark:text-white">Riwayat Ketidakhadiran</h2>
                    <div class="overflow-x-auto">
                      <table class="w-full text-left text-sm">
                        <thead>
                          <tr class="border-b border-secondary-100 text-caption uppercase font-semibold text-secondary-400 dark:border-secondary-800">
                            <th class="py-3 px-3">Tanggal</th>
                            <th class="py-3 px-3">Sumber</th>
                            <th class="py-3 px-3">Status</th>
                            <th class="py-3 px-3">Durasi</th>
                            <th class="py-3 px-3">Poin</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                          <For each={data().historyKompensasi}>
                            {(item) => (
                              <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                                <td class="py-3 px-3 whitespace-nowrap">{fmtTanggal(item.bapTanggal)}</td>
                                <td class="py-3 px-3 capitalize">{item.sumber}</td>
                                <td class="py-3 px-3 capitalize">{item.verifiedStatus || item.status}</td>
                                <td class="py-3 px-3">{item.durasiMangkir} mnt</td>
                                <td class="py-3 px-3 font-bold text-orange-600 dark:text-orange-400">
                                  {item.poinKompensasi}
                                </td>
                              </tr>
                            )}
                          </For>
                          <Show when={data().historyKompensasi.length === 0}>
                            <tr>
                              <td colspan="5" class="py-8 text-center text-secondary-400 dark:text-secondary-300">
                                Tidak ada riwayat kompensasi.
                              </td>
                            </tr>
                          </Show>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="rounded-2xl border border-secondary-100 bg-white p-6 shadow-sm dark:border-secondary-800 dark:bg-secondary-900">
                    <h2 class="mb-3 text-base font-bold text-secondary-800 dark:text-white">
                      Riwayat Pelunasan Kompensasi
                    </h2>
                    <div class="overflow-x-auto">
                      <table class="w-full text-left text-sm">
                        <thead>
                          <tr class="border-b border-secondary-100 text-caption uppercase font-semibold text-secondary-400 dark:border-secondary-800">
                            <th class="py-3 px-3">Tanggal</th>
                            <th class="py-3 px-3">Menit</th>
                            <th class="py-3 px-3">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody class="divide-y divide-secondary-50 dark:divide-secondary-800">
                          <For each={data().payments}>
                            {(item) => (
                              <tr class="hover:bg-secondary-50/50 dark:hover:bg-secondary-800/40">
                                <td class="py-3 px-3 whitespace-nowrap">{fmtTanggal(item.tanggal)}</td>
                                <td class="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                                  {item.jumlahMenit} mnt
                                </td>
                                <td class="py-3 px-3">{item.keterangan || '-'}</td>
                              </tr>
                            )}
                          </For>
                          <Show when={data().payments.length === 0}>
                            <tr>
                              <td colspan="3" class="py-8 text-center text-secondary-400 dark:text-secondary-300">
                                Belum ada pelunasan kompensasi.
                              </td>
                            </tr>
                          </Show>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </Show>
          </Show>
        </Show>
      </div>
    </MainLayout>
  );
}
