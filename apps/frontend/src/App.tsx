import { Navigate, Route, Routes } from '@solidjs/router';
import { QueryClientProvider } from '@tanstack/solid-query';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import AdmisiDaftar from './routes/AdmisiDaftar';
import AdmisiDaftarUlang from './routes/AdmisiDaftarUlang';
import AdmisiDashboard from './routes/AdmisiDashboard';
import AdmisiDetail from './routes/AdmisiDetail';
import AdmisiDokumen from './routes/AdmisiDokumen';
import AdmisiEditPendaftaran from './routes/AdmisiEditPendaftaran';
import AdmisiPembayaran from './routes/AdmisiPembayaran';
import AdmisiPendaftaranBaru from './routes/AdmisiPendaftaranBaru';
import AdmisiSesi from './routes/AdmisiSesi';
import AngkatanKurikulum from './routes/AngkatanKurikulum';
import ApelKelola from './routes/ApelKelola';
import ApelMonitor from './routes/ApelMonitor';
import ApelVerifikasi from './routes/ApelVerifikasi';
import AuditLog from './routes/AuditLog';
import AdmisiDaftarUlangNIM from './routes/admisi/AdmisiDaftarUlangNIM';
import AdmisiImportUjian from './routes/admisi/AdmisiImportUjian';
import AdmisiJadwal from './routes/admisi/AdmisiJadwal';
import AdmisiLaporan from './routes/admisi/AdmisiLaporan';
import AdmisiManajemenDashboard from './routes/admisi/AdmisiManajemenDashboard';
import AdmisiPengumuman from './routes/admisi/AdmisiPengumuman';
import AdmisiPenilaian from './routes/admisi/AdmisiPenilaian';
import AdmisiSeleksiMassal from './routes/admisi/AdmisiSeleksiMassal';
import AdmisiSesiDetail from './routes/admisi/AdmisiSesiDetail';
import AdmisiSesiList from './routes/admisi/AdmisiSesiList';
import AdmisiVABanks from './routes/admisi/AdmisiVABanks';
import AdmisiVerifikasi from './routes/admisi/AdmisiVerifikasi';
import BahanKajian from './routes/BahanKajian';
import BapPresensi from './routes/BapPresensi';
import Bimbingan from './routes/Bimbingan';
import BobotPenilaianObe from './routes/BobotPenilaianObe';
import Cpl from './routes/Cpl';
import Cpmk from './routes/Cpmk';
import CutiMahasiswa from './routes/CutiMahasiswa';
import Dashboard from './routes/Dashboard';
import Dosen from './routes/Dosen';
import DuplicateRiskKompensasi from './routes/DuplicateRiskKompensasi';
import EvaluasiKurikulum from './routes/EvaluasiKurikulum';
import EvaluasiSistem from './routes/EvaluasiSistem';
import ForceChangePassword from './routes/ForceChangePassword';
import ForgotPassword from './routes/ForgotPassword';
import InputNilai from './routes/InputNilai';
import KelasKuliah from './routes/KelasKuliah';
import KeuanganDashboard from './routes/KeuanganDashboard';
import Khs from './routes/Khs';
import KompensasiManual from './routes/KompensasiManual';
import KonfigurasiAbout from './routes/KonfigurasiAbout';
import KonfigurasiAksesRole from './routes/KonfigurasiAksesRole';
import KonfigurasiParameter from './routes/KonfigurasiParameter';
import KonfigurasiScopeProdi from './routes/KonfigurasiScopeProdi';
import Krs from './routes/Krs';
import Kurikulum from './routes/Kurikulum';
import LaporanKompensasi from './routes/LaporanKompensasi';
import LaporanObe from './routes/LaporanObe';
// Routes imports
import Login from './routes/Login';
import Mahasiswa from './routes/Mahasiswa';
import MahasiswaKeluar from './routes/MahasiswaKeluar';
import ManajemenCuti from './routes/ManajemenCuti';
import MataKuliah from './routes/MataKuliah';
import MonitoringBimbingan from './routes/MonitoringBimbingan';
import { PddiktiSync } from './routes/PddiktiSync';
import Pelanggaran from './routes/Pelanggaran';
import Pengguna from './routes/Pengguna';
import PeriodeAkademik from './routes/PeriodeAkademik';
import PetaObe from './routes/PetaObe';
import PresensiUnknown from './routes/PresensiUnknown';
import Profil from './routes/Profil';
import ProfilLulusan from './routes/ProfilLulusan';
import ProgramStudi from './routes/ProgramStudi';
import ResetPassword from './routes/ResetPassword';
import RombelEnroll from './routes/RombelEnroll';
import Rps from './routes/Rps';
import LaporanAkademik from './routes/reports/LaporanAkademik';
import LaporanBKD from './routes/reports/LaporanBKD';
import LaporanKeuangan from './routes/reports/LaporanKeuangan';
import LaporanKRS from './routes/reports/LaporanKRS';
import LaporanMahasiswaBaru from './routes/reports/LaporanMahasiswaBaru';
import LaporanMahasiswaKeluar from './routes/reports/LaporanMahasiswaKeluar';
import LaporanPeringatan from './routes/reports/LaporanPeringatan';
import LaporanPresensiKelas from './routes/reports/LaporanPresensiKelas';
import LaporanRekapNilai from './routes/reports/LaporanRekapNilai';
import LaporanYudisium from './routes/reports/LaporanYudisium';
import VisiMisiProdi from './routes/VisiMisiProdi';
import Yudisium from './routes/Yudisium';
import { queryClient } from './utils/queryClient';

function AppContent() {
  const auth = useAuth();

  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/ganti-password" component={ForceChangePassword} />
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
          <ProtectedRoute allowedRoles={['admin', 'super_admin', 'instruktur']}>
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
          <ProtectedRoute allowedRoles={['admin', 'dosen', 'mahasiswa', 'instruktur']}>
            <Pelanggaran />
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
          <ProtectedRoute allowedRoles={['admin', 'prodi', 'dosen']}>
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
      <Route path="*" element={auth.isAuthenticated() ? <Navigate href="/dashboard" /> : <Navigate href="/login" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <AppContent />
            </WorkspaceProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
