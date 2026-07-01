import { A } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { Show, createSignal } from 'solid-js';
import logoImg from '../assets/logo.png';

export function Sidebar(props: { isOpen: boolean; onClose: () => void }) {
  const auth = useAuth();
  const role = () => auth.user()?.role;

  const [isDataOpen, setIsDataOpen] = createSignal(true);
  const [isAkademikOpen, setIsAkademikOpen] = createSignal(true);

  return (
    <aside 
      class={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-gray-300 min-h-screen flex flex-col shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        props.isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand Header */}
      <div class="h-16 flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6">
        <div class="flex items-center gap-3">
          <img src={logoImg} alt="Logo" class="h-8 w-8 object-contain rounded-md" />
          <span class="text-sm font-bold text-white tracking-wider uppercase">Politeknik Sorowako</span>
        </div>

        {/* Mobile Close Button */}
        <button 
          onClick={() => props.onClose()}
          class="p-1 rounded-lg text-gray-400 hover:bg-slate-800 hover:text-white md:hidden focus:outline-none"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav Menu */}
      <nav class="flex-1 p-4 space-y-2 overflow-y-auto">
        <div class="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          Menu Utama
        </div>

        {/* Dashboard Link (Selaras dengan menu lainnya - font-size text-sm) */}
        <A
          href="/dashboard"
          onClick={() => props.onClose()}
          activeClass="text-blue-400 font-semibold border-l-2 border-blue-500 pl-2 bg-slate-850/40"
          inactiveClass="hover:bg-slate-800/60 hover:text-white"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150"
        >
          <svg class="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </A>

        {/* Admin only / Manage menus */}
        <Show when={role() === 'admin'}>
          <div class="pt-2">
            <button
              onClick={() => setIsDataOpen(!isDataOpen())}
              class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-widest focus:outline-none"
            >
              <span>Pengelolaan Data</span>
              <svg 
                class={`w-3.5 h-3.5 transition-transform duration-200 ${isDataOpen() ? 'transform rotate-90' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <Show when={isDataOpen()}>
              <div class="mt-1 space-y-1 pl-2 border-l border-slate-800 ml-3">
                <A
                  href="/program-studi"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Prodi
                </A>
                <A
                  href="/mahasiswa"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  Mahasiswa
                </A>
                <A
                  href="/dosen"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Dosen
                </A>
                <A
                  href="/periode-akademik"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Periode Akademik
                </A>
                <A
                  href="/mata-kuliah"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253" />
                  </svg>
                  Mata Kuliah
                </A>
                <A
                  href="/kelas-kuliah"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Kelas Kuliah
                </A>
                <A
                  href="/keuangan"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Keuangan & SPP
                </A>
                <A
                  href="/laporan-kompensasi"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Laporan Kompensasi
                </A>
                <A
                  href="/pengguna"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Pengguna
                </A>
                <A
                  href="/kurikulum"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Kurikulum
                </A>
                <A
                  href="/rps"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253" />
                  </svg>
                  RPS & Evaluasi
                </A>
              </div>
            </Show>
          </div>
        </Show>

        {/* Academic / KRS Menu for Dosen, Mahasiswa, or Admin */}
        <div class="pt-2">
          <button
            onClick={() => setIsAkademikOpen(!isAkademikOpen())}
            class="w-full flex items-center justify-between px-3 py-2 text-[10px] font-semibold text-gray-500 hover:text-gray-300 uppercase tracking-widest focus:outline-none"
          >
            <span>Akademik</span>
            <svg 
              class={`w-3.5 h-3.5 transition-transform duration-200 ${isAkademikOpen() ? 'transform rotate-90' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <Show when={isAkademikOpen()}>
            <div class="mt-1 space-y-1 pl-2 border-l border-slate-800 ml-3">
              <A
                href="/krs"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white text-gray-400"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Kartu Rencana Studi
              </A>
              <Show when={role() === 'admin' || role() === 'dosen'}>
                <A
                  href="/jurnal-presensi"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.168.477-4.5 1.253" />
                  </svg>
                  Jurnal & Presensi
                </A>
              </Show>
              <A
                href="/bimbingan"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white text-gray-400"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Bimbingan Akademik
              </A>
              <A
                href="/pelanggaran"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white text-gray-400"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Kedisiplinan
              </A>
              <A
                href="/khs"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white text-gray-400"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
                Hasil Studi & KHS
              </A>
              <Show when={role() !== 'mahasiswa'}>
                <A
                  href="/input-nilai"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Input Nilai Kelas
                </A>
              </Show>
              <A
                href="/yudisium"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white text-gray-400"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Evaluasi Yudisium
              </A>
              <Show when={role() === 'admin' || role() === 'dosen'}>
                <A
                  href="/pddikti"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white text-gray-400"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Sinkronisasi PDDIKTI
                </A>
              </Show>
            </div>
          </Show>
        </div>
      </nav>

      {/* Footer / User Profile Summary & Action Links */}
      <div class="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <Show 
            when={auth.user()?.avatar} 
            fallback={
              <div class="h-9 w-9 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center font-bold text-white uppercase shadow-md shadow-blue-500/20 text-sm">
                {auth.user()?.nama?.[0] || auth.user()?.email?.[0] || 'U'}
              </div>
            }
          >
            <img src={auth.user()?.avatar} alt="Foto Profil" class="h-9 w-9 rounded-full object-cover border border-slate-700 shadow-md" />
          </Show>
          <div class="flex-1 overflow-hidden">
            <div class="text-sm font-semibold text-white truncate">{auth.user()?.nama || auth.user()?.email}</div>
            <div class="text-xs text-gray-500 capitalize">{auth.user()?.role}</div>
          </div>
        </div>

        <div class="flex gap-2 text-xs border-t border-slate-800/60 pt-2.5">
          <A 
            href="/profil" 
            onClick={() => props.onClose()}
            activeClass="bg-slate-800 text-white font-medium"
            class="flex-1 text-center py-1.5 bg-slate-900 hover:bg-slate-800/80 text-gray-300 rounded border border-slate-800 transition-colors"
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
