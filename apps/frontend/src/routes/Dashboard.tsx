import { createResource, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { dosenController } from '../controllers/dosenController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { presensiController } from '../controllers/presensiController';
import { prodiController } from '../controllers/prodiController';

export default function Dashboard() {
  const auth = useAuth();
  const user = () => auth.user();

  // Load stats if admin
  const [prodis] = createResource(() => {
    if (user()?.role === 'admin') return prodiController.getAll(undefined, 1, 1);
    return null;
  });
  const [mahasiswas] = createResource(() => {
    if (user()?.role === 'admin') return mahasiswaController.getAll(undefined, 1, 1);
    return null;
  });
  const [dosens] = createResource(() => {
    if (user()?.role === 'admin') return dosenController.getAll(undefined, 1, 1);
    return null;
  });

  // Load Mahasiswa profile if current user is Mahasiswa
  const [mahasiswaProfile] = createResource(
    () => {
      if (user()?.role === 'mahasiswa') return user()?.email;
      return null;
    },
    async (email) => {
      if (!email) return null;
      const res = await mahasiswaController.getAll(email, 1, 1);
      return res.data[0] || null;
    },
  );

  // Load compensation details if mahasiswa profile is loaded
  const [kompensasiDetail] = createResource(
    () => mahasiswaProfile()?.id,
    async (id) => {
      if (!id) return null;
      return await presensiController.getKompensasiDetail(id);
    },
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-8 text-brand-gray-800 dark:text-white transition-colors duration-200">
        {/* Welcome Section */}
        <div class="bg-gradient-to-r from-brand-600 to-accent-700 text-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div class="relative z-10 flex flex-col gap-2">
            <h1 class="text-3xl font-extrabold tracking-tight">Selamat Datang, {user()?.nama || user()?.email}!</h1>
            <p class="text-brand-100 max-w-xl">
              Anda masuk sebagai <strong class="uppercase text-white">{user()?.role}</strong> di SIMAK Vokasi. Gunakan
              menu navigasi di sebelah kiri untuk mengelola atau mengakses fitur akademik.
            </p>
          </div>
        </div>

        {/* Dashboard Content Based on Role */}
        <Show when={user()?.role === 'admin'}>
          {/* Admin Stats */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Prodi Card */}
            <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-colors duration-200">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-brand-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Program Studi
                </span>
                <span class="text-3xl font-extrabold text-brand-gray-800 dark:text-white">
                  {prodis.loading ? '...' : prodis()?.meta.total || 0}
                </span>
              </div>
              <div class="p-3 bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>

            {/* Dosen Card */}
            <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-colors duration-200">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-brand-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Dosen Pengajar
                </span>
                <span class="text-3xl font-extrabold text-brand-gray-800 dark:text-white">
                  {dosens.loading ? '...' : dosens()?.meta.total || 0}
                </span>
              </div>
              <div class="p-3 bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 rounded-xl">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>

            {/* Mahasiswa Card */}
            <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 p-6 rounded-2xl shadow-sm flex items-center justify-between transition-colors duration-200">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-brand-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Mahasiswa Aktif
                </span>
                <span class="text-3xl font-extrabold text-brand-gray-800 dark:text-white">
                  {mahasiswas.loading ? '...' : mahasiswas()?.meta.total || 0}
                </span>
              </div>
              <div class="p-3 bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400 rounded-xl">
                <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                  />
                </svg>
              </div>
            </div>
          </div>
        </Show>

        <Show when={user()?.role === 'dosen'}>
          {/* Dosen Portal */}
          <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors duration-200">
            <h3 class="text-lg font-bold border-b border-brand-gray-100 dark:border-brand-gray-800 pb-2">Informasi Mengajar</h3>
            <p class="text-sm text-brand-gray-500 dark:text-gray-400">
              Sistem mencatat beban mengajar dan daftar kelas yang Anda ampu secara real-time. Buka menu{' '}
              <strong>Jurnal & Presensi</strong> untuk mengisi berita acara kuliah dan mengabsen mahasiswa kelas.
            </p>
          </div>
        </Show>

        <Show when={user()?.role === 'mahasiswa'}>
          {/* Mahasiswa Portal */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors duration-200">
              <h3 class="text-lg font-bold border-b border-brand-gray-100 dark:border-brand-gray-800 pb-2">Kartu Rencana Studi</h3>
              <p class="text-xs text-brand-gray-500 dark:text-gray-400 mt-2">
                Silakan akses halaman <strong>KRS</strong> untuk melakukan pengisian Kartu Rencana Studi semester
                berjalan.
              </p>
            </div>
            <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors duration-200">
              <h3 class="text-lg font-bold border-b border-brand-gray-100 dark:border-brand-gray-800 pb-2">
                Indeks Prestasi Kumulatif (IPK)
              </h3>
              <div class="flex items-center gap-4 mt-2">
                <span class="text-4xl font-extrabold text-brand-600 dark:text-brand-400">3.85</span>
                <span class="text-xs text-brand-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
                  IPK Sementara (OBE)
                </span>
              </div>
            </div>
            <div class="bg-white dark:bg-brand-gray-900 border border-brand-gray-100 dark:border-brand-gray-800 rounded-2xl p-6 shadow-sm flex flex-col gap-4 transition-colors duration-200">
              <h3 class="text-lg font-bold border-b border-brand-gray-100 dark:border-brand-gray-800 pb-2">Jam Kompensasi</h3>
              <div class="flex items-center gap-4 mt-2">
                <span
                  class={`text-4xl font-extrabold ${(kompensasiDetail()?.summary.sisaKompensasi || 0) > 0 ? 'text-red-600 animate-pulse' : 'text-accent-600 dark:text-accent-400'}`}
                >
                  {kompensasiDetail.loading ? '...' : `${kompensasiDetail()?.summary.sisaKompensasi || 0} Menit`}
                </span>
                <span class="text-xs text-brand-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">
                  Tanggungan
                </span>
              </div>
              <p class="text-[10px] text-brand-gray-400 dark:text-gray-550 mt-1">
                Aturan vokasi: Alpa/Telat 5x lipat, Sakit/Izin 1x lipat.
              </p>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
