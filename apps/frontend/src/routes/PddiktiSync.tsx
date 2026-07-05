import { createSignal, createResource, Show, For } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { khsController } from '../controllers/khsController';
import { useToast } from '../contexts/ToastContext';

export function PddiktiSync() {
  const toast = useToast();
  const [stats, { refetch: refetchStats }] = createResource(async () => {
    try {
      return await khsController.getPddiktiStats();
    } catch (e) {
      return null;
    }
  });

  const [isSyncing, setIsSyncing] = createSignal(false);
  const [syncLogs, setSyncLogs] = createSignal<string[]>([]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncLogs(['Menghubungkan ke Neo Feeder PDDIKTI...', 'Mengunduh data akademik lokal yang belum disinkronisasi...']);

    try {
      // Simulate real-time progress steps
      setTimeout(() => {
        setSyncLogs(prev => [...prev, 'Mengunggah Program Studi dan Mata Kuliah...']);
      }, 800);
      
      setTimeout(() => {
        setSyncLogs(prev => [...prev, 'Memvalidasi data Mahasiswa dan Kelas Kuliah...']);
      }, 1500);

      const res = await khsController.syncPddikti();

      setTimeout(() => {
        setSyncLogs(prev => [
          ...prev,
          `Sinkronisasi Program Studi: +${res.details.prodiSynced} data`,
          `Sinkronisasi Mata Kuliah: +${res.details.mataKuliahSynced} data`,
          `Sinkronisasi Mahasiswa: +${res.details.mahasiswaSynced} data`,
          `Sinkronisasi Kelas Kuliah: +${res.details.kelasSynced} data`,
          `Sinkronisasi KRS & Nilai Mahasiswa: +${res.details.krsSynced} data`,
          '-------------------------------------------------------',
          '✅ SUCCESS: Sinkronisasi Neo Feeder PDDIKTI selesai tanpa kendala!'
        ]);
        setIsSyncing(false);
        refetchStats();
        toast.showToast('Sinkronisasi PDDIKTI berhasil dilaksanakan!', 'success');
      }, 2500);

    } catch (e: any) {
      setSyncLogs(prev => [...prev, `❌ ERROR: ${e.message || 'Gagal terhubung ke Neo Feeder PDDIKTI'}`]);
      setIsSyncing(false);
      toast.showToast('Gagal melakukan sinkronisasi PDDIKTI.', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="flex flex-col gap-6 max-w-6xl mx-auto p-4">
        {/* Header */}
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm">
          <div>
            <h1 class="text-2xl font-extrabold text-brand-gray-800 tracking-tight">PDDIKTI Feeder Sync</h1>
            <p class="text-sm text-brand-gray-500">Sinkronisasi data mahasiswa, kelas kuliah, KRS, dan nilai akhir ke pangkalan data nasional</p>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing()}
            class="px-5 py-2.5 bg-brand-800 hover:bg-brand-900 text-white font-extrabold text-sm rounded-xl disabled:opacity-50 active:scale-95 transition-all shadow-md shadow-brand-100 flex items-center gap-2"
          >
            <Show when={isSyncing()} fallback="⚡ Eksekusi Sinkronisasi">
              <span class="animate-spin">🔄</span> Mensinkronisasi...
            </Show>
          </button>
        </div>

        {/* Stats Grid */}
        <Show when={stats()} fallback={<div class="text-center py-12 text-brand-gray-400">Memuat status sinkronisasi...</div>}>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Mahasiswa Stats */}
            <div class="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <span class="text-xs uppercase font-extrabold tracking-wider text-brand-gray-400">Data Mahasiswa</span>
                <span class="px-2 py-0.5 bg-brand-50 text-brand-800 text-[10px] font-bold rounded">PDDIKTI</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-3xl font-extrabold text-brand-gray-800">{stats()?.mahasiswa?.total}</span>
                <span class="text-xs text-brand-gray-450 font-medium">Total Mahasiswa Terdaftar</span>
              </div>
              <div class="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <p class="text-brand-gray-400">Tersinkron</p>
                  <p class="font-bold text-green-600">{stats()?.mahasiswa?.synced}</p>
                </div>
                <div>
                  <p class="text-brand-gray-400">Belum Sinkron</p>
                  <p class="font-bold text-red-500">{stats()?.mahasiswa?.unsynced}</p>
                </div>
              </div>
            </div>

            {/* Kelas Stats */}
            <div class="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <span class="text-xs uppercase font-extrabold tracking-wider text-brand-gray-400">Kelas Kuliah</span>
                <span class="px-2 py-0.5 bg-brand-50 text-brand-800 text-[10px] font-bold rounded">PDDIKTI</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-3xl font-extrabold text-brand-gray-800">{stats()?.kelasKuliah?.total}</span>
                <span class="text-xs text-brand-gray-450 font-medium">Total Kelas Kuliah</span>
              </div>
              <div class="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <p class="text-brand-gray-400">Tersinkron</p>
                  <p class="font-bold text-green-600">{stats()?.kelasKuliah?.synced}</p>
                </div>
                <div>
                  <p class="text-brand-gray-400">Belum Sinkron</p>
                  <p class="font-bold text-red-500">{stats()?.kelasKuliah?.unsynced}</p>
                </div>
              </div>
            </div>

            {/* KRS Stats */}
            <div class="bg-white p-6 rounded-2xl border border-brand-gray-100 shadow-sm flex flex-col gap-4">
              <div class="flex justify-between items-center">
                <span class="text-xs uppercase font-extrabold tracking-wider text-brand-gray-400">KRS & Nilai</span>
                <span class="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-bold rounded">PDDIKTI</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-3xl font-extrabold text-brand-gray-800">{stats()?.krs?.total}</span>
                <span class="text-xs text-brand-gray-450 font-medium">Total KRS Terkontrak</span>
              </div>
              <div class="grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                <div>
                  <p class="text-brand-gray-400">Tersinkron</p>
                  <p class="font-bold text-green-600">{stats()?.krs?.synced}</p>
                </div>
                <div>
                  <p class="text-brand-gray-400">Belum Sinkron</p>
                  <p class="font-bold text-red-500">{stats()?.krs?.unsynced}</p>
                </div>
              </div>
            </div>
          </div>
        </Show>

        {/* Sync Console Logs */}
        <Show when={syncLogs().length > 0}>
          <div class="bg-brand-900 rounded-2xl p-6 border border-brand-gray-800 shadow-xl flex flex-col gap-4 font-mono text-xs text-brand-gray-300">
            <div class="flex justify-between items-center border-b border-brand-gray-800 pb-2">
              <span class="text-brand-gray-400 font-bold uppercase tracking-wider">Sync Log Console</span>
              <span class="w-3 h-3 bg-green-600 rounded-full animate-ping"></span>
            </div>
            <div class="flex flex-col gap-2 max-h-72 overflow-y-auto">
              <For each={syncLogs()}>
                {(log) => (
                  <div class={`${log.startsWith('❌') ? 'text-red-400' : log.startsWith('✅') ? 'text-green-450 font-bold' : 'text-brand-gray-300'}`}>
                    {log}
                  </div>
                )}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
