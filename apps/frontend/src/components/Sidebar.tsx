import { A, useLocation } from '@solidjs/router';
import { createSignal, Show, createEffect } from 'solid-js';
import logoImg from '../assets/logo.png';
import { useAuth } from '../contexts/AuthContext';

export function Sidebar(props: { isOpen: boolean; onClose: () => void }) {
  const auth = useAuth();
  const role = () => auth.user()?.role;
  const location = useLocation();
  const path = () => location.pathname;

  const [isMasterOpen, setIsMasterOpen] = createSignal(false);
  const [isPerencanaanOpen, setIsPerencanaanOpen] = createSignal(false);
  const [isRegistrasiOpen, setIsRegistrasiOpen] = createSignal(false);
  const [isPelaksanaanOpen, setIsPelaksanaanOpen] = createSignal(false);
  const [isEvaluasiOpen, setIsEvaluasiOpen] = createSignal(false);
  const [isLaporanOpen, setIsLaporanOpen] = createSignal(false);
  const [isLayananOpen, setIsLayananOpen] = createSignal(false);
  const [isIntegrasiOpen, setIsIntegrasiOpen] = createSignal(false);
  const [isAdmisiOpen, setIsAdmisiOpen] = createSignal(false);

  createEffect(() => {
    const currentPath = path();
    if (['/program-studi', '/mahasiswa', '/dosen', '/pengguna'].includes(currentPath)) {
      setIsMasterOpen(true);
    }
    if (['/kurikulum', '/angkatan-kurikulum', '/rps', '/periode-akademik', '/mata-kuliah', '/kelas-kuliah'].includes(currentPath)) {
      setIsPerencanaanOpen(true);
    }
    if (['/krs', '/keuangan'].includes(currentPath)) {
      setIsRegistrasiOpen(true);
    }
    if (['/jurnal-presensi', '/input-nilai', '/bimbingan', '/pelanggaran'].includes(currentPath)) {
      setIsPelaksanaanOpen(true);
    }
    if (['/khs', '/yudisium'].includes(currentPath)) {
      setIsEvaluasiOpen(true);
    }
    if (['/laporan-kompensasi', '/laporan/rekap-nilai', '/laporan/peringatan', '/laporan/mahasiswa-baru', '/laporan/presensi-kelas', '/laporan/akademik', '/laporan/bkd', '/laporan/krs', '/laporan/keuangan', '/laporan/yudisium', '/laporan/mahasiswa-keluar'].includes(currentPath)) {
      setIsLaporanOpen(true);
    }
    if (['/pengajuan-cuti', '/manajemen-cuti', '/penonaktifan'].includes(currentPath)) {
      setIsLayananOpen(true);
    }
    if (['/pddikti'].includes(currentPath)) {
      setIsIntegrasiOpen(true);
    }
    if (['/admisi/dashboard', '/admisi/sesi', '/admisi/pendaftaran/baru', '/admisi/pendaftaran'].some((p) => currentPath.startsWith(p))) {
      setIsAdmisiOpen(true);
    }
  });

  const isAdmin = () => role() === 'admin';
  const isDosen = () => role() === 'dosen';
  const isMahasiswa = () => role() === 'mahasiswa';
  const isProdi = () => role() === 'prodi';
  const isKeuangan = () => role() === 'keuangan';
  const isCalonMhs = () => role() === 'calon_mahasiswa';
  const notGuest = () => role() !== 'guest';
  const isMahasiswaOrMore = () => !isCalonMhs() && notGuest();

  return (
    <aside
      class={`fixed inset-y-0 left-0 z-40 w-64 bg-brand-800 border-r border-brand-900/60 text-secondary-100 min-h-screen flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        props.isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div class="h-16 flex items-center justify-between border-b border-brand-900/60 bg-brand-900 px-6">
        <div class="flex items-center gap-3">
          <img src={logoImg} alt="Logo" class="h-8 w-8 object-contain rounded-md" />
          <span class="text-sm font-bold text-white tracking-wider uppercase">Politeknik Sorowako</span>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => props.onClose()}
          class="p-1 rounded-lg text-secondary-300 hover:bg-brand-700 hover:text-white md:hidden focus:outline-none"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav Menu */}
      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <div class="px-3 mb-2 text-[10px] font-semibold text-secondary-300/70 uppercase tracking-widest">Menu Utama</div>

        {/* Dashboard Link */}
        <A
          href="/dashboard"
          onClick={() => props.onClose()}
          activeClass="text-accent-400 font-semibold border-l-2 border-accent-400 pl-2 bg-brand-800/40"
          inactiveClass="hover:bg-brand-800/60 hover:text-white"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
        >
          <svg
            class="w-5 h-5 text-accent-200/70 group-hover:text-white transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          Dashboard
        </A>

        {/* PMB - Calon Mahasiswa Only */}
        <Show when={isCalonMhs()}>
          <div class="pt-2">
            <div class="px-3 mb-2 text-[10px] font-semibold text-secondary-300/70 uppercase tracking-widest">Admisi</div>
            <A
              href="/admisi/dashboard"
              onClick={() => props.onClose()}
              activeClass="text-accent-400 font-semibold border-l-2 border-accent-400 pl-2 bg-brand-800/40"
              inactiveClass="hover:bg-brand-800/60 hover:text-white"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
               Dashboard PMB
            </A>
            <A
              href="/admisi/sesi"
              onClick={() => props.onClose()}
              activeClass="text-accent-400 font-semibold border-l-2 border-accent-400 pl-2 bg-brand-800/40"
              inactiveClass="hover:bg-brand-800/60 hover:text-white"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Sesi Admisi
            </A>
            <A
              href="/admisi/pendaftaran/baru"
              onClick={() => props.onClose()}
              activeClass="text-accent-400 font-semibold border-l-2 border-accent-400 pl-2 bg-brand-800/40"
              inactiveClass="hover:bg-brand-800/60 hover:text-white"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Pendaftaran Baru
            </A>
          </div>
        </Show>

        {/* Data Master - Admin Only */}
        <Show when={isAdmin()}>
          <div class="pt-2">
            <button
              onClick={() => setIsMasterOpen(!isMasterOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Data Master</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isMasterOpen() ? 'transform rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isMasterOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <A
                  href="/program-studi"
                  onClick={() => props.onClose()}
                  activeClass="text-accent-400 font-semibold"
                  inactiveClass="hover:text-white text-secondary-200"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Prodi
                </A>
                <A
                  href="/mahasiswa"
                  onClick={() => props.onClose()}
                  activeClass="text-accent-400 font-semibold"
                  inactiveClass="hover:text-white text-secondary-200"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"
                    />
                  </svg>
                  Mahasiswa
                </A>
                <A
                  href="/dosen"
                  onClick={() => props.onClose()}
                  activeClass="text-accent-400 font-semibold"
                  inactiveClass="hover:text-white text-secondary-200"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Dosen
                </A>
                <A
                  href="/pengguna"
                  onClick={() => props.onClose()}
                  activeClass="text-accent-400 font-semibold"
                  inactiveClass="hover:text-white text-secondary-200"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Pengguna
                </A>
              </div>
            </Show>
          </div>
        </Show>

        {/* Perencanaan Akademik */}
        <Show when={isAdmin() || isDosen()}>
          <div class="pt-2">
            <button
              onClick={() => setIsPerencanaanOpen(!isPerencanaanOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Perencanaan Akademik</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isPerencanaanOpen() ? 'transform rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isPerencanaanOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin()}>
                  <A
                    href="/periode-akademik"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Periode Akademik
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/kurikulum"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Kurikulum
                  </A>
                </Show>
                <Show when={isAdmin() || isDosen()}>
                  <A
                    href="/rps"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253"
                      />
                    </svg>
                    RPS & Evaluasi
                  </A>
                </Show>                
                <Show when={isAdmin()}>
                  <A
                    href="/mata-kuliah"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253"
                      />
                    </svg>
                    Mata Kuliah
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/angkatan-kurikulum"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Binding Angkatan
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/kelas-kuliah"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    Kelas Kuliah
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* Registrasi Akademik */}
        <Show when={isMahasiswaOrMore()}>
          <div class="pt-2">
            <button
              onClick={() => setIsRegistrasiOpen(!isRegistrasiOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Registrasi Akademik</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isRegistrasiOpen() ? 'transform rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isRegistrasiOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin() || isDosen() || isMahasiswa()}>
                  <A
                    href="/krs"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Kartu Rencana Studi
                  </A>
                </Show>
                <Show when={isAdmin() || isMahasiswa()}>
                  <A
                    href="/keuangan"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Keuangan & SPP
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* Pelaksanaan Akademik */}
        <Show when={isMahasiswaOrMore()}>
          <div class="pt-2">
            <button
              onClick={() => setIsPelaksanaanOpen(!isPelaksanaanOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Pelaksanaan Akademik</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isPelaksanaanOpen() ? 'transform rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isPelaksanaanOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin() || isDosen()}>
                  <A
                    href="/jurnal-presensi"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253"
                      />
                    </svg>
                    Jurnal & Presensi
                  </A>
                </Show>
                <Show when={isAdmin() || isDosen() || isProdi()}>
                  <A
                    href="/input-nilai"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Input Nilai Kelas
                  </A>
                </Show>
                <Show when={isAdmin() || isDosen() || isMahasiswa() || isProdi()}>
                  <A
                    href="/bimbingan"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                    Bimbingan Akademik
                  </A>
                </Show>                
              </div>
            </Show>
          </div>
        </Show>

        {/* Evaluasi & Kelulusan */}
        <Show when={isMahasiswaOrMore()}>
          <div class="pt-2">
            <button
              onClick={() => setIsEvaluasiOpen(!isEvaluasiOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Evaluasi & Kelulusan</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isEvaluasiOpen() ? 'transform rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isEvaluasiOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin() || isDosen() || isMahasiswa()}>
                  <A
                    href="/khs"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
                      />
                    </svg>
                    Hasil Studi & KHS
                  </A>
                </Show>
                <Show when={isAdmin() || isDosen() || isMahasiswa() || isProdi()}>
                  <A
                    href="/yudisium"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                      />
                    </svg>
                    Evaluasi Yudisium
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
        {/* Laporan */}
        <Show when={isAdmin() || isDosen() || isProdi()} >
          <div class="pt-2">
            <button
              onClick={() => setIsLaporanOpen(!isLaporanOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Laporan</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isLaporanOpen() ? "transform rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isLaporanOpen()} >
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin() || isProdi() || isDosen()} >
                  <A
                    href="/laporan/rekap-nilai"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Rekap Nilai
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi() || isDosen()} >
                  <A
                    href="/laporan/presensi-kelas"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Presensi Kelas
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi() || isDosen()} >
                  <A
                    href="/laporan/peringatan"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Peringatan
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi()} >
                  <A
                    href="/laporan/mahasiswa-baru"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    ADMISI
                  </A>
                </Show>
                <Show when={isAdmin()} >
                  <A
                    href="/laporan-kompensasi"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Jam Kompensasi
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi() || isDosen()}>
                  <A
                    href="/laporan/akademik"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Akademik
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi() || isDosen()}>
                  <A
                    href="/laporan/bkd"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    BKD / Beban Dosen
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi() || isDosen()}>
                  <A
                    href="/laporan/krs"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    KRS
                  </A>
                </Show>
                <Show when={isAdmin() || isKeuangan()}>
                  <A
                    href="/laporan/keuangan"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Keuangan
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi() || isDosen()}>
                  <A
                    href="/laporan/yudisium"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                    Yudisium
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi()}>
                  <A
                    href="/laporan/mahasiswa-keluar"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Mahasiswa Keluar
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
        {/* Layanan Mahasiswa */}
        <Show when={isMahasiswaOrMore()}>
          <div class="pt-2">
            <button
              onClick={() => setIsLayananOpen(!isLayananOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Layanan Mahasiswa</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isLayananOpen() ? 'transform rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isLayananOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin() || isDosen() || isMahasiswa()}>
                  <A
                    href="/pelanggaran"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    Kedisiplinan
                  </A>
                </Show>
                <Show when={isMahasiswa()}>
                  <A
                    href="/pengajuan-cuti"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Pengajuan Cuti
                  </A>
                </Show>
                <Show when={role() !== 'mahasiswa' && role() !== 'guest'}>
                  <A
                    href="/manajemen-cuti"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Manajemen Cuti
                  </A>
                </Show>
                <Show when={isAdmin() || isProdi()}>
                  <A
                    href="/penonaktifan"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                      />
                    </svg>
                    Penonaktifan Mahasiswa
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* PMB Admin - Admin Only */}
        <Show when={isAdmin()}>
          <div class="pt-2">
            <button
              onClick={() => setIsAdmisiOpen(!isAdmisiOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Admisi</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isAdmisiOpen() ? "transform rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isAdmisiOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Dashboard PMB
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/sesi"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Manajemen Sesi
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/verifikasi"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verifikasi Dokumen
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/penilaian"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Penilaian
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/jadwal"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Jadwal Ujian
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/daftar-ulang"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Daftar Ulang & NIM
                  </A>
                </Show>
                  <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/pengumuman"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    Pengumuman
                  </A>
                </Show>
                <Show when={isAdmin()}>
                  <A
                    href="/admisi/manajemen/laporan"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Laporan PMB
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        {/* Integrasi Data */}
        <Show when={isAdmin() || isDosen()}>
          <div class="pt-2">
            <button
              onClick={() => setIsIntegrasiOpen(!isIntegrasiOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-secondary-300/70 hover:text-accent-400 uppercase tracking-widest focus:outline-none"
            >
              <span>Integrasi Data</span>
              <svg
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isIntegrasiOpen() ? "transform rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isIntegrasiOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-brand-950/60 ml-3">
                <Show when={isAdmin() || isDosen()}>
                  <A
                    href="/pddikti"
                    onClick={() => props.onClose()}
                    activeClass="text-accent-400 font-semibold"
                    inactiveClass="hover:text-white text-secondary-200"
                    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                  >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    Sinkronisasi PDDIKTI
                  </A>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </nav>

      {/* Footer / User Profile Summary & Action Links */}
      <div class="p-4 border-t border-brand-950/60 bg-brand-950 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <Show
            when={auth.user()?.avatar}
            fallback={
              <div class="h-9 w-9 rounded-full bg-brand-600 border border-brand-500 flex items-center justify-center font-bold text-white uppercase shadow-md shadow-accent-500/20 text-sm">
                {auth.user()?.nama?.[0] || auth.user()?.email?.[0] || 'U'}
              </div>
            }
          >
            <img
              src={auth.user()?.avatar}
              alt="Foto Profil"
              class="h-9 w-9 rounded-full object-cover border border-brand-800 shadow-md"
            />
          </Show>
          <div class="flex-1 overflow-hidden">
            <div class="text-sm font-semibold text-white truncate">{auth.user()?.nama || auth.user()?.email}</div>
            <div class="text-xs text-accent-200/50 capitalize">{auth.user()?.role}</div>
          </div>
        </div>

        <div class="flex gap-2 text-xs border-t border-brand-950/60 pt-2.5">
          <A
            href="/profil"
            onClick={() => props.onClose()}
            activeClass="bg-brand-800 text-white font-medium"
            class="flex-1 text-center py-1.5 bg-brand-900 hover:bg-brand-800/80 text-accent-100 rounded border border-brand-950/60 transition-colors"
          >
            Profil
          </A>
          <button
            onClick={auth.logout}
            class="flex-1 text-center py-1.5 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 rounded border border-rose-950/40 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
