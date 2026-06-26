import { Show, createResource, For } from 'solid-js';
import { useAuth } from '../contexts/AuthContext';
import { prodiController } from '../controllers/prodiController';
import { mahasiswaController } from '../controllers/mahasiswaController';
import { dosenController } from '../controllers/dosenController';
import { presensiController } from '../controllers/presensiController';
import { MainLayout } from '../components/MainLayout';

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
    }
  );

  // Load compensation details if mahasiswa profile is loaded
  const [kompensasiDetail] = createResource(
    () => mahasiswaProfile()?.id,
    async (id) => {
      if (!id) return null;
      return await presensiController.getKompensasiDetail(id);
    }
  );

  return (
    <MainLayout>
      <div class="flex flex-col gap-8">
        {/* Welcome Section */}
        <div class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-8 shadow-lg relative overflow-hidden">
          <div class="absolute -right-16 -top-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div class="relative z-10 flex flex-col gap-2">
            <h1 class="text-3xl font-extrabold tracking-tight">Selamat Datang, {user()?.email}!</h1>
            <p class="text-blue-100 max-w-xl">
              Anda masuk sebagai <strong class="uppercase text-white">{user()?.role}</strong> di SIMAK Vokasi. Gunakan menu navigasi di sebelah kiri untuk mengelola atau mengakses fitur akademik.
            </p>
          </div>
        </div>

        {/* Dashboard Content Based on Role */}
        <Show when={user()?.role === 'admin'}>
          {/* Admin Stats */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Prodi Card */}
            <div class="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Program Studi</span>
                <span class="text-3xl font-extrabold text-gray-800">
                  {prodis.loading ? '...' : prodis()?.meta.total || 0}
                </span>
              </div>
              <div class="p-3 bg-blue-50 text-blue-600 rounded-xl font-bold text-xl">📋</div>
            </div>

            {/* Dosen Card */}
            <div class="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Dosen Pengajar</span>
                <span class="text-3xl font-extrabold text-gray-800">
                  {dosens.loading ? '...' : dosens()?.meta.total || 0}
                </span>
              </div>
              <div class="p-3 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xl">👨‍🏫</div>
            </div>

            {/* Mahasiswa Card */}
            <div class="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm flex items-center justify-between">
              <div class="flex flex-col gap-1">
                <span class="text-sm font-semibold text-gray-400 uppercase tracking-wider">Mahasiswa Aktif</span>
                <span class="text-3xl font-extrabold text-gray-800">
                  {mahasiswas.loading ? '...' : mahasiswas()?.meta.total || 0}
                </span>
              </div>
              <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xl">🎓</div>
            </div>
          </div>
        </Show>

        <Show when={user()?.role === 'dosen'}>
          {/* Dosen Portal */}
          <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
            <h3 class="text-lg font-bold text-gray-800 border-b pb-2">Informasi Mengajar</h3>
            <p class="text-sm text-gray-500">
              Sistem mencatat beban mengajar dan daftar kelas yang Anda ampu secara real-time. Buka menu <strong>Jurnal & Presensi</strong> untuk mengisi berita acara kuliah dan mengabsen mahasiswa kelas.
            </p>
          </div>
        </Show>

        <Show when={user()?.role === 'mahasiswa'}>
          {/* Mahasiswa Portal */}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 class="text-lg font-bold text-gray-800 border-b pb-2">Kartu Rencana Studi</h3>
              <p class="text-xs text-gray-500 mt-2">
                Silakan akses halaman <strong>KRS</strong> untuk melakukan pengisian Kartu Rencana Studi semester berjalan.
              </p>
            </div>
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 class="text-lg font-bold text-gray-800 border-b pb-2">Indeks Prestasi Kumulatif (IPK)</h3>
              <div class="flex items-center gap-4 mt-2">
                <span class="text-4xl font-extrabold text-blue-600">3.85</span>
                <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider">IPK Sementara (OBE)</span>
              </div>
            </div>
            <div class="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <h3 class="text-lg font-bold text-gray-800 border-b pb-2">Jam Kompensasi</h3>
              <div class="flex items-center gap-4 mt-2">
                <span class={`text-4xl font-extrabold ${(kompensasiDetail()?.summary.sisaKompensasi || 0) > 0 ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
                  {kompensasiDetail.loading ? '...' : `${kompensasiDetail()?.summary.sisaKompensasi || 0} Menit`}
                </span>
                <span class="text-xs text-gray-400 font-semibold uppercase tracking-wider">Tanggungan</span>
              </div>
              <p class="text-[10px] text-gray-400 mt-1">
                Aturan vokasi: Alpa/Telat 5x lipat, Sakit/Izin 1x lipat.
              </p>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
