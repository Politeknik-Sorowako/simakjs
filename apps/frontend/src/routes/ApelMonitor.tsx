import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { StudentAvatar } from '../components/ui/StudentAvatar';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apelController, MonitorResponse } from '../controllers/apelController';
import { getTodayString } from '../utils/format';

export default function ApelMonitor() {
  const auth = useAuth();
  const ws = useWorkspace();

  const [tanggal, setTanggal] = createSignal(getTodayString());
  const [autoRefresh, setAutoRefresh] = createSignal(true);

  const [selectedDetailSesiId, setSelectedDetailSesiId] = createSignal<number | null>(null);

  const [sesiDetailData] = createResource(
    () => selectedDetailSesiId(),
    async (id) => {
      if (!id) return null;
      return apelController.getSesiPresensi(id);
    },
  );

  const [data, { refetch }] = createResource(
    () => ({ tanggal: tanggal() }),
    async (params) => {
      return apelController.getMonitorRealtime({ tanggal: params.tanggal || undefined });
    },
  );

  // Auto-refresh every 30 seconds
  let intervalId: ReturnType<typeof setInterval> | undefined;
  createEffect(() => {
    if (autoRefresh()) {
      intervalId = setInterval(() => {
        refetch();
      }, 30000);
    }
    onCleanup(() => {
      if (intervalId) clearInterval(intervalId);
    });
  });

  const handleExport = () => {
    const monitorData = data();
    if (!monitorData) return;

    let csv = 'Kelompok,Tanggal,Shift,Dosen,Status Sesi,Jam Mulai,Total Mahasiswa,Hadir,Terlambat,Unknown\n';
    for (const d of monitorData.detail) {
      csv += `${d.kelompokNama},${d.tanggal},${d.shift},${d.dosenNama},${d.statusSesi || 'belum_buka'},${d.jamMulai},${d.totalMahasiswa},${d.hadir},${d.terlambat},${d.unknown}\n`;
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitor-apel-${tanggal()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout>
      <div class="space-y-6">
        <div class="flex justify-between items-center">
          <h1 class="text-2xl font-bold">Monitor Presensi Apel</h1>
          <div class="flex items-center gap-4">
            <input
              type="date"
              class="border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600"
              value={tanggal()}
              onChange={(e) => setTanggal(e.target.value)}
            />
            <label class="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh()}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                class="rounded"
              />
              Auto-refresh (30 detik)
            </label>
            <button
              class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
              onClick={() => refetch()}
            >
              Refresh
            </button>
            <button
              class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              onClick={handleExport}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <Show when={data()}>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div class="text-sm text-gray-500">Total Kelompok Aktif</div>
              <div class="text-3xl font-bold">{data()?.summary.totalKelompok || data()?.detail.length || 0}</div>
            </div>
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-4">
              <div class="text-sm text-blue-600 dark:text-blue-400">Sesi Berlangsung</div>
              <div class="text-3xl font-bold text-blue-700 dark:text-blue-300">
                {data()?.summary.totalSesiAktif || 0}
              </div>
            </div>
            <div class="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4">
              <div class="text-sm text-green-600 dark:text-green-400">Hadir</div>
              <div class="text-3xl font-bold text-green-700 dark:text-green-300">{data()?.summary.totalHadir || 0}</div>
            </div>
            <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow p-4">
              <div class="text-sm text-yellow-600 dark:text-yellow-400">Terlambat</div>
              <div class="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                {data()?.summary.totalTerlambat || 0}
              </div>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg shadow p-4">
              <div class="text-sm text-gray-500">Unknown</div>
              <div class="text-3xl font-bold">{data()?.summary.totalUnknown || 0}</div>
            </div>
          </div>

          {/* Detail Table */}
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase">Kelompok</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase">Tanggal</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Shift</th>
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase">Dosen PJ</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Status Sesi</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Jam Mulai</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Total</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Hadir</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Terlambat</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Unknown</th>
                    <th class="px-4 py-3 text-center text-xs font-medium uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody class="divide-y dark:divide-gray-700">
                  <For each={data()?.detail}>
                    {(item) => (
                      <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                        <td class="px-4 py-3 text-sm font-medium">{item.kelompokNama}</td>
                        <td class="px-4 py-3 text-sm">{item.tanggal}</td>
                        <td class="px-4 py-3 text-center text-sm capitalize">{item.shift}</td>
                        <td class="px-4 py-3 text-sm">{item.dosenNama}</td>
                        <td class="px-4 py-3 text-center text-xs">
                          <Show
                            when={item.statusSesi === 'berlangsung'}
                            fallback={
                              <Show
                                when={item.statusSesi === 'ditutup'}
                                fallback={
                                  <span class="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-semibold">
                                    Belum Dibuka
                                  </span>
                                }
                              >
                                <span class="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
                                  Selesai
                                </span>
                              </Show>
                            }
                          >
                            <span class="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold">
                              Berlangsung
                            </span>
                          </Show>
                        </td>
                        <td class="px-4 py-3 text-center text-sm font-mono">{item.jamMulai}</td>
                        <td class="px-4 py-3 text-center text-sm font-bold">{item.totalMahasiswa}</td>
                        <td class="px-4 py-3 text-center text-sm text-green-600 font-semibold">{item.hadir}</td>
                        <td class="px-4 py-3 text-center text-sm text-yellow-600 font-semibold">{item.terlambat}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 font-semibold">{item.unknown}</td>
                        <td class="px-4 py-3 text-center">
                          <Show when={item.id} fallback={<span class="text-xs text-gray-400 italic">Belum Sesi</span>}>
                            <button
                              class="bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-100 px-3 py-1 rounded text-xs font-semibold"
                              onClick={() => setSelectedDetailSesiId(item.id)}
                            >
                              Detail
                            </button>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>

        {/* Modal Detail Presensi Sesi */}
        <Show when={selectedDetailSesiId()}>
          <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
              <div class="flex justify-between items-center border-b dark:border-gray-700 pb-3 flex-shrink-0">
                <div>
                  <h3 class="text-lg font-bold">Detail Presensi Sesi Apel</h3>
                  <p class="text-xs text-gray-500">
                    {sesiDetailData()?.sesi.kelompokNama} — Tanggal: {sesiDetailData()?.sesi.tanggal} (
                    {sesiDetailData()?.sesi.shift}) | Dosen PJ: {sesiDetailData()?.sesi.dosenNama}
                  </p>
                </div>
                <button
                  class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setSelectedDetailSesiId(null)}
                >
                  ✕
                </button>
              </div>

              <div class="flex-1 overflow-y-auto pr-1">
                <table class="w-full text-sm">
                  <thead class="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th class="px-3 py-2 text-left text-xs uppercase">No</th>
                      <th class="px-3 py-2 text-left text-xs uppercase">NIM</th>
                      <th class="px-3 py-2 text-left text-xs uppercase">Nama</th>
                      <th class="px-3 py-2 text-center text-xs uppercase">Status</th>
                      <th class="px-3 py-2 text-center text-xs uppercase">Durasi / Menit</th>
                      <th class="px-3 py-2 text-left text-xs uppercase">Verifikasi / Catatan</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y dark:divide-gray-700">
                    <For each={sesiDetailData()?.presensi}>
                      {(p, idx) => (
                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-750">
                          <td class="px-3 py-2 text-xs">{idx() + 1}</td>
                          <td class="px-3 py-2 text-xs font-mono">{p.mahasiswaNim}</td>
                          <td class="px-3 py-2 text-xs font-semibold">
                            <div class="flex items-center gap-2">
                              <StudentAvatar
                                foto={p.mahasiswaFoto}
                                nama={p.mahasiswaNama}
                                nim={p.mahasiswaNim}
                                size="sm"
                              />
                              {p.mahasiswaNama}
                            </div>
                          </td>
                          <td class="px-3 py-2 text-center text-xs">
                            <span
                              class={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                p.status === 'hadir'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                                  : p.status === 'terlambat'
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                    : p.status === 'sakit' || p.status === 'izin'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                                      : p.status === 'alpa'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {p.status.toUpperCase()}
                            </span>
                          </td>
                          <td class="px-3 py-2 text-center text-xs font-mono">
                            {p.menitTerlambat ? `${p.menitTerlambat} mnt` : '-'}
                          </td>
                          <td class="px-3 py-2 text-xs text-gray-500">
                            {p.verifiedStatus ? (
                              <span class="text-blue-600 dark:text-blue-400 font-medium">
                                Diverifikasi: {p.verifiedStatus} {p.verificationNote ? `(${p.verificationNote})` : ''}
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <div class="flex justify-end pt-2 border-t dark:border-gray-700 flex-shrink-0">
                <button
                  class="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  onClick={() => setSelectedDetailSesiId(null)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
