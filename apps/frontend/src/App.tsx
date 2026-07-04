import { Routes, Route, Navigate } from '@solidjs/router';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ToastProvider } from './contexts/ToastContext';

// Routes imports
import Login from './routes/Login';
import Dashboard from './routes/Dashboard';
import ProgramStudi from './routes/ProgramStudi';
import Mahasiswa from './routes/Mahasiswa';
import Dosen from './routes/Dosen';
import PeriodeAkademik from './routes/PeriodeAkademik';
import MataKuliah from './routes/MataKuliah';
import KelasKuliah from './routes/KelasKuliah';
import Krs from './routes/Krs';
import KeuanganDashboard from './routes/KeuanganDashboard';
import BapPresensi from './routes/BapPresensi';
import LaporanKompensasi from './routes/LaporanKompensasi';
import Bimbingan from './routes/Bimbingan';
import Pelanggaran from './routes/Pelanggaran';
import Khs from './routes/Khs';
import InputNilai from './routes/InputNilai';
import Yudisium from './routes/Yudisium';
import { PddiktiSync } from './routes/PddiktiSync';
import Pengguna from './routes/Pengguna';
import Profil from './routes/Profil';
import ForgotPassword from './routes/ForgotPassword';
import ResetPassword from './routes/ResetPassword';
import Kurikulum from './routes/Kurikulum';
import Rps from './routes/Rps';
import CutiMahasiswa from './routes/CutiMahasiswa';
import ManajemenCuti from './routes/ManajemenCuti';
import MahasiswaKeluar from './routes/MahasiswaKeluar';

import { WorkspaceProvider } from './contexts/WorkspaceContext';

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

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={
          auth.isAuthenticated() ? (
            <Navigate href="/dashboard" />
          ) : (
            <Navigate href="/login" />
          )
        }
      />
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
