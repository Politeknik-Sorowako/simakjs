import { Navigate, Route, Routes } from '@solidjs/router';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import AngkatanKurikulum from './routes/AngkatanKurikulum';
import BapPresensi from './routes/BapPresensi';
import Bimbingan from './routes/Bimbingan';
import CutiMahasiswa from './routes/CutiMahasiswa';
import Dashboard from './routes/Dashboard';
import Dosen from './routes/Dosen';
import ForgotPassword from './routes/ForgotPassword';
import InputNilai from './routes/InputNilai';
import KelasKuliah from './routes/KelasKuliah';
import KeuanganDashboard from './routes/KeuanganDashboard';
import Khs from './routes/Khs';
import Krs from './routes/Krs';
import Kurikulum from './routes/Kurikulum';
import LaporanKompensasi from './routes/LaporanKompensasi';
import LaporanRekapNilai from './routes/reports/LaporanRekapNilai';
import LaporanPeringatan from './routes/reports/LaporanPeringatan';
import LaporanMahasiswaBaru from './routes/reports/LaporanMahasiswaBaru';
import LaporanPresensiKelas from './routes/reports/LaporanPresensiKelas';
import LaporanAkademik from './routes/reports/LaporanAkademik';
import LaporanBKD from './routes/reports/LaporanBKD';
import LaporanKRS from './routes/reports/LaporanKRS';
import LaporanKeuangan from './routes/reports/LaporanKeuangan';
import LaporanYudisium from './routes/reports/LaporanYudisium';
import LaporanMahasiswaKeluar from './routes/reports/LaporanMahasiswaKeluar';
// Routes imports
import Login from './routes/Login';
import AdmisiDaftar from './routes/AdmisiDaftar';
import AdmisiDashboard from './routes/AdmisiDashboard';
import AdmisiPendaftaranBaru from './routes/AdmisiPendaftaranBaru';
import AdmisiDetail from './routes/AdmisiDetail';
import AdmisiEditPendaftaran from './routes/AdmisiEditPendaftaran';
import AdmisiDokumen from './routes/AdmisiDokumen';
import AdmisiDaftarUlang from './routes/AdmisiDaftarUlang';
import AdmisiManajemenDashboard from './routes/admisi/AdmisiManajemenDashboard';
import AdmisiSesiList from './routes/admisi/AdmisiSesiList';
import AdmisiVerifikasi from './routes/admisi/AdmisiVerifikasi';
import AdmisiDaftarUlangNIM from './routes/admisi/AdmisiDaftarUlangNIM';
import AdmisiLaporan from './routes/admisi/AdmisiLaporan';
import AdmisiPenilaian from './routes/admisi/AdmisiPenilaian';
import AdmisiJadwal from './routes/admisi/AdmisiJadwal';
import AdmisiSesiDetail from './routes/admisi/AdmisiSesiDetail';
import Mahasiswa from './routes/Mahasiswa';
import MahasiswaKeluar from './routes/MahasiswaKeluar';
import ManajemenCuti from './routes/ManajemenCuti';
import MataKuliah from './routes/MataKuliah';
import { PddiktiSync } from './routes/PddiktiSync';
import Pelanggaran from './routes/Pelanggaran';
import Pengguna from './routes/Pengguna';
import PeriodeAkademik from './routes/PeriodeAkademik';
import Profil from './routes/Profil';
import ProgramStudi from './routes/ProgramStudi';
import ResetPassword from './routes/ResetPassword';
import Rps from './routes/Rps';
import Yudisium from './routes/Yudisium';

function AppContent() {
  const auth = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

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
          <ProtectedRoute allowedRoles={['admin', 'dosen']}>
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
        path="/bimbingan"
        element={
          <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa', 'prodi']}>
            <Bimbingan />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pelanggaran"
        element={
          <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa']}>
            <Pelanggaran />
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
          <ProtectedRoute allowedRoles={['admin', 'dosen', 'prodi']}>
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
        path="/rps"
        element={
          <ProtectedRoute allowedRoles={['admin', 'dosen']}>
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
          <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
            <LaporanPeringatan />
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
        path="/admisi/manajemen/laporan"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdmisiLaporan />
          </ProtectedRoute>
        }
      />

      {/* Catch-all redirect */}
      <Route path="*" element={auth.isAuthenticated() ? <Navigate href="/dashboard" /> : <Navigate href="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
