import { A } from '@solidjs/router';
import { useAuth } from '../contexts/AuthContext';
import { Show } from 'solid-js';

export function Sidebar() {
  const auth = useAuth();
  const role = () => auth.user()?.role;

  return (
    <aside class="w-64 bg-gray-900 text-gray-300 min-h-screen flex flex-col border-r border-gray-800 shadow-xl">
      {/* Brand Header */}
      <div class="h-16 flex items-center justify-center border-b border-gray-800 bg-gray-950 px-6 gap-3">
        <div class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-blue-500/30">
          S
        </div>
        <span class="text-lg font-bold text-white tracking-wider uppercase">SIMAK Vokasi</span>
      </div>

      {/* Nav Menu */}
      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <div class="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Menu Utama
        </div>

        {/* Dashboard Link */}
        <A
          href="/dashboard"
          activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
          inactiveClass="hover:bg-gray-800 hover:text-white"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          Dashboard
        </A>

        {/* Admin only / Manage menus */}
        <Show when={role() === 'admin'}>
          <div class="pt-4 px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Pengelolaan Data
          </div>

          <A
            href="/program-studi"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            📋 Prodi
          </A>
          <A
            href="/mahasiswa"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            🎓 Mahasiswa
          </A>
          <A
            href="/dosen"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            👨‍🏫 Dosen
          </A>
          <A
            href="/periode-akademik"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            📅 Periode Akademik
          </A>
          <A
            href="/mata-kuliah"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            📖 Mata Kuliah
          </A>
          <A
            href="/kelas-kuliah"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            🏫 Kelas Kuliah
          </A>
          <A
            href="/keuangan"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            💰 Keuangan & SPP
          </A>
          <A
            href="/laporan-kompensasi"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            ⚖️ Laporan Kompensasi
          </A>
        </Show>

        {/* Academic / KRS Menu for Dosen, Mahasiswa, or Admin */}
        <div class="pt-4 px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Akademik
        </div>
        <A
          href="/krs"
          activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
          inactiveClass="hover:bg-gray-800 hover:text-white"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
        >
          📝 Kartu Rencana Studi (KRS)
        </A>
        <Show when={role() === 'admin' || role() === 'dosen'}>
          <A
            href="/jurnal-presensi"
            activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
            inactiveClass="hover:bg-gray-800 hover:text-white"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
          >
            📓 Jurnal & Presensi
          </A>
        </Show>
        <A
          href="/bimbingan"
          activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
          inactiveClass="hover:bg-gray-800 hover:text-white"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
        >
          💬 Bimbingan Akademik
        </A>
        <A
          href="/pelanggaran"
          activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
          inactiveClass="hover:bg-gray-800 hover:text-white"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
        >
          ⚖️ Kedisiplinan
        </A>
        <A
          href="/khs"
          activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
          inactiveClass="hover:bg-gray-800 hover:text-white"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
        >
          📊 Hasil Studi & KHS
        </A>
        <A
          href="/yudisium"
          activeClass="bg-blue-600/10 text-blue-400 font-medium border-l-4 border-blue-500"
          inactiveClass="hover:bg-gray-800 hover:text-white"
          class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200"
        >
          🎓 Evaluasi Yudisium
        </A>
      </nav>

      {/* Footer / User Profile Summary */}
      <div class="p-4 border-t border-gray-800 bg-gray-950 flex flex-col gap-2">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-white uppercase">
            {auth.user()?.email?.[0] || 'U'}
          </div>
          <div class="flex-1 overflow-hidden">
            <div class="text-sm font-semibold text-white truncate">{auth.user()?.email}</div>
            <div class="text-xs text-gray-500 capitalize">{auth.user()?.role}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
