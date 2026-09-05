import { Navigate, Route, Routes } from '@solidjs/router';
import { QueryClientProvider } from '@tanstack/solid-query';
import { lazy, Suspense } from 'solid-js';
import { ProtectedRoute } from './components/ProtectedRoute';
import OfflineBanner from './components/pwa/OfflineBanner';
import PwaInstallPrompt from './components/pwa/PwaInstallPrompt';
import ReloadPrompt from './components/pwa/ReloadPrompt';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';

import AktivasiAkun from './routes/AktivasiAkun';
import ForceChangePassword from './routes/ForceChangePassword';
import ForgotPassword from './routes/ForgotPassword';
import GoogleCallback from './routes/GoogleCallback';
// Critical Shell Routes (Synchronous load for instant paint)
import Login from './routes/Login';
import ResetPassword from './routes/ResetPassword';

// Lazy Loaded Protected Routes for Performance Optimization
const AdminPasalBpa = lazy(() => import('./routes/AdminPasalBpa'));
const AdmisiDaftar = lazy(() => import('./routes/AdmisiDaftar'));
const AdmisiDaftarUlang = lazy(() => import('./routes/AdmisiDaftarUlang'));
const AdmisiDashboard = lazy(() => import('./routes/AdmisiDashboard'));
const AdmisiDetail = lazy(() => import('./routes/AdmisiDetail'));
const AdmisiDokumen = lazy(() => import('./routes/AdmisiDokumen'));
const AdmisiEditPendaftaran = lazy(() => import('./routes/AdmisiEditPendaftaran'));
const AdmisiPembayaran = lazy(() => import('./routes/AdmisiPembayaran'));
const AdmisiPendaftaranBaru = lazy(() => import('./routes/AdmisiPendaftaranBaru'));
const AdmisiSesi = lazy(() => import('./routes/AdmisiSesi'));
const AngkatanKurikulum = lazy(() => import('./routes/AngkatanKurikulum'));
const ApelKelola = lazy(() => import('./routes/ApelKelola'));
const ApelMonitor = lazy(() => import('./routes/ApelMonitor'));
const ApelVerifikasi = lazy(() => import('./routes/ApelVerifikasi'));
const AuditLog = lazy(() => import('./routes/AuditLog'));
const AdmisiDaftarUlangNIM = lazy(() => import('./routes/admisi/AdmisiDaftarUlangNIM'));
const AdmisiImportUjian = lazy(() => import('./routes/admisi/AdmisiImportUjian'));
const AdmisiJadwal = lazy(() => import('./routes/admisi/AdmisiJadwal'));
const AdmisiLaporan = lazy(() => import('./routes/admisi/AdmisiLaporan'));
const AdmisiManajemenDashboard = lazy(() => import('./routes/admisi/AdmisiManajemenDashboard'));
const AdmisiPengumuman = lazy(() => import('./routes/admisi/AdmisiPengumuman'));
const AdmisiPenilaian = lazy(() => import('./routes/admisi/AdmisiPenilaian'));
const AdmisiSeleksiMassal = lazy(() => import('./routes/admisi/AdmisiSeleksiMassal'));
const AdmisiSesiDetail = lazy(() => import('./routes/admisi/AdmisiSesiDetail'));
const AdmisiSesiList = lazy(() => import('./routes/admisi/AdmisiSesiList'));
const AdmisiVABanks = lazy(() => import('./routes/admisi/AdmisiVABanks'));
const AdmisiVerifikasi = lazy(() => import('./routes/admisi/AdmisiVerifikasi'));
const BahanKajian = lazy(() => import('./routes/BahanKajian'));
const BapPresensi = lazy(() => import('./routes/BapPresensi'));
const Bimbingan = lazy(() => import('./routes/Bimbingan'));
const BobotPenilaianObe = lazy(() => import('./routes/BobotPenilaianObe'));
const Cpl = lazy(() => import('./routes/Cpl'));
const Cpmk = lazy(() => import('./routes/Cpmk'));
const CutiMahasiswa = lazy(() => import('./routes/CutiMahasiswa'));
const Dashboard = lazy(() => import('./routes/Dashboard'));
const Dosen = lazy(() => import('./routes/Dosen'));
const DuplicateRiskKompensasi = lazy(() => import('./routes/DuplicateRiskKompensasi'));
const EvaluasiKurikulum = lazy(() => import('./routes/EvaluasiKurikulum'));
const EvaluasiSistem = lazy(() => import('./routes/EvaluasiSistem'));
const InputNilai = lazy(() => import('./routes/InputNilai'));
const KelasKuliah = lazy(() => import('./routes/KelasKuliah'));
const KeuanganDashboard = lazy(() => import('./routes/KeuanganDashboard'));
const Khs = lazy(() => import('./routes/Khs'));
const KompensasiManual = lazy(() => import('./routes/KompensasiManual'));
const KonfigurasiAbout = lazy(() => import('./routes/KonfigurasiAbout'));
const KonfigurasiAksesRole = lazy(() => import('./routes/KonfigurasiAksesRole'));
const KonfigurasiParameter = lazy(() => import('./routes/KonfigurasiParameter'));
const KonfigurasiScopeProdi = lazy(() => import('./routes/KonfigurasiScopeProdi'));
const Krs = lazy(() => import('./routes/Krs'));
const Kurikulum = lazy(() => import('./routes/Kurikulum'));
const LaporanKompensasi = lazy(() => import('./routes/LaporanKompensasi'));
const LaporanObe = lazy(() => import('./routes/LaporanObe'));
const Mahasiswa = lazy(() => import('./routes/Mahasiswa'));
const MahasiswaKeluar = lazy(() => import('./routes/MahasiswaKeluar'));
const ManajemenCuti = lazy(() => import('./routes/ManajemenCuti'));
const MataKuliah = lazy(() => import('./routes/MataKuliah'));
const MonitoringBimbingan = lazy(() => import('./routes/MonitoringBimbingan'));
const PddiktiSync = lazy(() => import('./routes/PddiktiSync').then((m) => ({ default: m.PddiktiSync })));
const Pelanggaran = lazy(() => import('./routes/Pelanggaran'));
const Pengguna = lazy(() => import('./routes/Pengguna'));
const PeriodeAkademik = lazy(() => import('./routes/PeriodeAkademik'));
const PetaObe = lazy(() => import('./routes/PetaObe'));
const PresensiMahasiswa = lazy(() => import('./routes/PresensiMahasiswa'));
const PresensiUnknown = lazy(() => import('./routes/PresensiUnknown'));
const Profil = lazy(() => import('./routes/Profil'));
const ProfilLulusan = lazy(() => import('./routes/ProfilLulusan'));
const ProgramStudi = lazy(() => import('./routes/ProgramStudi'));
const RombelEnroll = lazy(() => import('./routes/RombelEnroll'));
const Rps = lazy(() => import('./routes/Rps'));
const LaporanAkademik = lazy(() => import('./routes/reports/LaporanAkademik'));
const LaporanBKD = lazy(() => import('./routes/reports/LaporanBKD'));
const LaporanKeuangan = lazy(() => import('./routes/reports/LaporanKeuangan'));
const LaporanKRS = lazy(() => import('./routes/reports/LaporanKRS'));
const LaporanMahasiswaBaru = lazy(() => import('./routes/reports/LaporanMahasiswaBaru'));
const LaporanMahasiswaKeluar = lazy(() => import('./routes/reports/LaporanMahasiswaKeluar'));
const LaporanPeringatan = lazy(() => import('./routes/reports/LaporanPeringatan'));
const LaporanPresensiKelas = lazy(() => import('./routes/reports/LaporanPresensiKelas'));
const LaporanRekapNilai = lazy(() => import('./routes/reports/LaporanRekapNilai'));
const LaporanYudisium = lazy(() => import('./routes/reports/LaporanYudisium'));
const VisiMisiProdi = lazy(() => import('./routes/VisiMisiProdi'));
const Yudisium = lazy(() => import('./routes/Yudisium'));

import { queryClient } from './utils/queryClient';

function RouteLoadingFallback() {
  return (
    <div class="min-h-screen flex flex-col items-center justify-center bg-secondary-50 dark:bg-secondary-950 text-secondary-700 dark:text-secondary-200">
      <div class="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-sm font-medium">Memuat Halaman...</p>
    </div>
  );
}

function AppContent() {
  const auth = useAuth();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Route */}
        <Route path="/login" component={Login} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/ganti-password" component={ForceChangePassword} />
        <Route path="/aktivasi-akun" component={AktivasiAkun} />
        <Route path="/auth/google/callback" component={GoogleCallback} />
        <Route path="/rombel/enroll/:token" component={RombelEnroll} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/program-studi"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ProgramStudi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mahasiswa"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Mahasiswa />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dosen"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Dosen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/periode-akademik"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <PeriodeAkademik />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mata-kuliah"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <MataKuliah />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kelas-kuliah"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <KelasKuliah />
            </ProtectedRoute>
          }
        />
        <Route
          path="/krs"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa']}>
              <Krs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/keuangan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'mahasiswa']}>
              <KeuanganDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jurnal-presensi"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi', 'instruktur']}>
              <BapPresensi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan-kompensasi"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <LaporanKompensasi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kompensasi-manual"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'instruktur', 'dosen']}>
              <KompensasiManual />
            </ProtectedRoute>
          }
        />
        <Route path="/input-kompensasi-manual" element={<Navigate href="/kompensasi-manual" />} />
        <Route
          path="/duplicate-risk-kompensasi"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DuplicateRiskKompensasi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/presensi-apel"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi', 'instruktur']}>
              <ApelKelola />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apel/verifikasi"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <ApelVerifikasi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/apel/monitor"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi']}>
              <ApelMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/presensi-unknown"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin', 'prodi']}>
              <PresensiUnknown />
            </ProtectedRoute>
          }
        />
        <Route
          path="/presensi-saya"
          element={
            <ProtectedRoute allowedRoles={['mahasiswa']}>
              <PresensiMahasiswa />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bimbingan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa', 'prodi']}>
              <Bimbingan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/monitoring-bimbingan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi']}>
              <MonitoringBimbingan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pelanggaran"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa', 'instruktur', 'prodi']}>
              <Pelanggaran />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pelanggaran/pasal-bpa"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'super_admin']}>
              <AdminPasalBpa />
            </ProtectedRoute>
          }
        />
        <Route
          path="/evaluasi-sistem"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa', 'prodi', 'keuangan']}>
              <EvaluasiSistem />
            </ProtectedRoute>
          }
        />
        <Route
          path="/khs"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa']}>
              <Khs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/input-nilai"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi', 'instruktur']}>
              <InputNilai />
            </ProtectedRoute>
          }
        />
        <Route
          path="/yudisium"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa', 'prodi']}>
              <Yudisium />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pddikti"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen']}>
              <PddiktiSync />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengguna"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Pengguna />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/konfigurasi/akses-role"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <KonfigurasiAksesRole />
            </ProtectedRoute>
          }
        />
        <Route
          path="/konfigurasi/scope-prodi"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <KonfigurasiScopeProdi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/konfigurasi/parameter"
          element={
            <ProtectedRoute allowedRoles={['admin', 'super_admin']}>
              <KonfigurasiParameter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/konfigurasi/about"
          element={
            <ProtectedRoute>
              <KonfigurasiAbout />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil"
          element={
            <ProtectedRoute>
              <Profil />
            </ProtectedRoute>
          }
        />
        <Route
          path="/kurikulum"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Kurikulum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/angkatan-kurikulum"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AngkatanKurikulum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profil-lulusan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <ProfilLulusan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/visi-misi-prodi"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <VisiMisiProdi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bahan-kajian"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <BahanKajian />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cpl"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <Cpl />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cpmk"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <Cpmk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/peta-obe"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <PetaObe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rps"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'instruktur']}>
              <Rps />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pengajuan-cuti"
          element={
            <ProtectedRoute allowedRoles={['mahasiswa']}>
              <CutiMahasiswa />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manajemen-cuti"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi', 'keuangan']}>
              <ManajemenCuti />
            </ProtectedRoute>
          }
        />
        <Route
          path="/penonaktifan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <MahasiswaKeluar />
            </ProtectedRoute>
          }
        />

        {/* Report Pages */}
        <Route
          path="/laporan/rekap-nilai"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <LaporanRekapNilai />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/peringatan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen', 'instruktur']}>
              <LaporanPeringatan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/obe"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <LaporanObe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/obe/bobot-penilaian"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <BobotPenilaianObe />
            </ProtectedRoute>
          }
        />
        <Route
          path="/obe/evaluasi-kurikulum"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <EvaluasiKurikulum />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/mahasiswa-baru"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <LaporanMahasiswaBaru />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/presensi-kelas"
          element={
            <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi']}>
              <LaporanPresensiKelas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/akademik"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <LaporanAkademik />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/bkd"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <LaporanBKD />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/krs"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <LaporanKRS />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/keuangan"
          element={
            <ProtectedRoute allowedRoles={['admin', 'keuangan']}>
              <LaporanKeuangan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/yudisium"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
              <LaporanYudisium />
            </ProtectedRoute>
          }
        />
        <Route
          path="/laporan/mahasiswa-keluar"
          element={
            <ProtectedRoute allowedRoles={['admin', 'prodi']}>
              <LaporanMahasiswaKeluar />
            </ProtectedRoute>
          }
        />

        {/* Admisi Routes */}
        <Route path="/daftar" component={AdmisiDaftar} />
        <Route
          path="/admisi/dashboard"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa']}>
              <AdmisiDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/sesi"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa']}>
              <AdmisiSesi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/pendaftaran/baru"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa']}>
              <AdmisiPendaftaranBaru />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/pendaftaran/:id"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa', 'admin']}>
              <AdmisiDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/pendaftaran/:id/edit"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa']}>
              <AdmisiEditPendaftaran />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/pendaftaran/:id/dokumen"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa']}>
              <AdmisiDokumen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/pendaftaran/:id/daftar-ulang"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa', 'admin']}>
              <AdmisiDaftarUlang />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/pembayaran/:id"
          element={
            <ProtectedRoute allowedRoles={['calon_mahasiswa']}>
              <AdmisiPembayaran />
            </ProtectedRoute>
          }
        />

        {/* Admin PMB Routes */}
        <Route
          path="/admisi/manajemen"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiManajemenDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/sesi"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiSesiList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/sesi/:id"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiSesiDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/verifikasi"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiVerifikasi />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/penilaian"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiPenilaian />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/jadwal"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiJadwal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/daftar-ulang"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiDaftarUlangNIM />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/import-ujian"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiImportUjian />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/seleksi-massal"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiSeleksiMassal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/laporan"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiLaporan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/pengumuman"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiPengumuman />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admisi/manajemen/va-banks"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdmisiVABanks />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route
          path="*"
          element={auth.isAuthenticated() ? <Navigate href="/dashboard" /> : <Navigate href="/login" />}
        />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <OfflineBanner />
              <AppContent />
              <ReloadPrompt />
              <PwaInstallPrompt />
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
