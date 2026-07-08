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
// Routes imports
import Login from './routes/Login';
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
