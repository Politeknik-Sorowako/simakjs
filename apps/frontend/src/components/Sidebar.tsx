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
          <span class="text-xs font-bold text-white tracking-wider uppercase">Politeknik Sorowako</span>
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
      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <div class="px-3 mb-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          Menu Utama
        </div>

        {/* Dashboard Link (Selaras dengan menu lainnya) */}
        <A
          href="/dashboard"
          onClick={() => props.onClose()}
          activeClass="text-blue-400 font-semibold border-l-2 border-blue-500 pl-2 bg-slate-800/30"
          inactiveClass="hover:bg-slate-800/60 hover:text-white"
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-all duration-150"
        >
          <span>🏠</span>
          <span>Dashboard</span>
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
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  📋 Prodi
                </A>
                <A
                  href="/mahasiswa"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  🎓 Mahasiswa
                </A>
                <A
                  href="/dosen"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  👨‍🏫 Dosen
                </A>
                <A
                  href="/periode-akademik"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  📅 Periode Akademik
                </A>
                <A
                  href="/mata-kuliah"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  📖 Mata Kuliah
                </A>
                <A
                  href="/kelas-kuliah"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  🏫 Kelas Kuliah
                </A>
                <A
                  href="/keuangan"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  💰 Keuangan & SPP
                </A>
                <A
                  href="/laporan-kompensasi"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  ⚖️ Laporan Kompensasi
                </A>
                <A
                  href="/pengguna"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  👤 Pengguna
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
                inactiveClass="hover:text-white"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
              >
                📝 Kartu Rencana Studi
              </A>
              <Show when={role() === 'admin' || role() === 'dosen'}>
                <A
                  href="/jurnal-presensi"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  📓 Jurnal & Presensi
                </A>
              </Show>
              <A
                href="/bimbingan"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
              >
                💬 Bimbingan Akademik
              </A>
              <A
                href="/pelanggaran"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
              >
                ⚖️ Kedisiplinan
              </A>
              <A
                href="/khs"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
              >
                📊 Hasil Studi & KHS
              </A>
              <A
                href="/yudisium"
                onClick={() => props.onClose()}
                activeClass="text-blue-400 font-semibold"
                inactiveClass="hover:text-white"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
              >
                🎓 Evaluasi Yudisium
              </A>
              <Show when={role() === 'admin' || role() === 'dosen'}>
                <A
                  href="/pddikti"
                  onClick={() => props.onClose()}
                  activeClass="text-blue-400 font-semibold"
                  inactiveClass="hover:text-white"
                  class="flex items-center gap-3 px-3 py-2 rounded-lg text-xs transition-colors duration-150"
                >
                  ⚡ Sinkronisasi PDDIKTI
                </A>
              </Show>
            </div>
          </Show>
        </div>
      </nav>

      {/* Footer / User Profile Summary & Action Links */}
      <div class="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center font-bold text-white uppercase shadow-md shadow-blue-500/20">
            {auth.user()?.nama?.[0] || auth.user()?.email?.[0] || 'U'}
          </div>
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
