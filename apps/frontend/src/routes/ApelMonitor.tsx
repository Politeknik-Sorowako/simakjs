import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apelController, MonitorResponse } from '../controllers/apelController';

export default function ApelMonitor() {
  const auth = useAuth();
  const ws = useWorkspace();

  const [tanggal, setTanggal] = createSignal(new Date().toISOString().slice(0, 10));
  const [autoRefresh, setAutoRefresh] = createSignal(true);

  const [data, { refetch }] = createResource(
    () => ({ tanggal: tanggal(), role: auth.user()?.role }),
    async (params) => {
      let dosenId: number | undefined;
      if (params.role === 'dosen') {
        dosenId = auth.user()!.id as unknown as number;
      }
      return apelController.getMonitorRealtime({ dosenId, tanggal: params.tanggal || undefined });
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

    let csv = 'Kelompok,Tanggal,Shift,Dosen,Jam Mulai,Total Mahasiswa,Hadir,Terlambat,Unknown\n';
    for (const d of monitorData.detail) {
      csv += `${d.kelompokNama},${d.tanggal},${d.shift},${d.dosenNama},${d.jamMulai},${d.totalMahasiswa},${d.hadir},${d.terlambat},${d.unknown}\n`;
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
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div class="text-sm text-gray-500">Sesi Aktif</div>
              <div class="text-3xl font-bold">{data()?.summary.totalSesiAktif || 0}</div>
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
                    <th class="px-4 py-3 text-left text-xs font-medium uppercase">Dosen</th>
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
                        <td class="px-4 py-3 text-center text-sm">{item.shift}</td>
                        <td class="px-4 py-3 text-sm">{item.dosenNama}</td>
                        <td class="px-4 py-3 text-center text-sm font-mono">{item.jamMulai}</td>
                        <td class="px-4 py-3 text-center text-sm font-bold">{item.totalMahasiswa}</td>
                        <td class="px-4 py-3 text-center text-sm text-green-600 font-semibold">{item.hadir}</td>
                        <td class="px-4 py-3 text-center text-sm text-yellow-600 font-semibold">{item.terlambat}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 font-semibold">{item.unknown}</td>
                        <td class="px-4 py-3 text-center">
                          <button
                            class="text-blue-600 hover:text-blue-800 text-xs"
                            onClick={() => {
                              /* View detail - navigate to sesi */
                            }}
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
