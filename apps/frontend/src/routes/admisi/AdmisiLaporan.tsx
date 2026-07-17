import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiLaporan() {
  const toast = useToast();
  const [sessionFilter, setSessionFilter] = createSignal('');
  const [exporting, setExporting] = createSignal(false);

  const [stats] = createResource(() => admisiAdminController.getStats());
  const [exportData] = createResource(
    () => (sessionFilter() ? Number(sessionFilter()) : undefined),
    (sid) => admisiAdminController.exportApplications(sid ? { sessionId: sid } : undefined),
  );

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = exportData();
      if (!res?.data?.length) {
        toast.showToast('Tidak ada data untuk diexport', 'error');
        return;
      }
      const headers = Object.keys(res.data[0]).join(',');
      const rows = res.data
        .map((r: Record<string, unknown>) =>
          Object.values(r)
            .map((v) => `"${v || ''}"`)
            .join(','),
        )
        .join('\n');
      const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export-pmb-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.showToast('Export berhasil!', 'success');
    } catch (err: unknown) {
      toast.showToast((err as Error).message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Laporan PMB</h1>
        <p class="text-sm text-secondary-500 mb-6">Statistik dan export data pendaftar</p>

        {/* Stats */}
        <Show when={stats()}>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
              <div class="text-xs text-secondary-500">Total Pendaftar</div>
              <div class="text-2xl font-bold">{stats()?.totalPendaftar || 0}</div>
            </div>
            <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
              <div class="text-xs text-secondary-500">Hari Ini</div>
              <div class="text-2xl font-bold text-green-600">{stats()?.todayPendaftar || 0}</div>
            </div>
          </div>

          <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5 mb-6">
            <h2 class="font-semibold mb-3">Status Pipeline</h2>
            <For each={stats()?.statusCounts || []}>
              {(s: { status: string; count: number }) => (
                <div class="flex items-center gap-3 py-1">
                  <span class="text-sm w-40">{s.status}</span>
                  <div class="flex-1 bg-secondary-200 dark:bg-secondary-700 rounded-full h-2.5">
                    <div
                      class="bg-brand-500 h-2.5 rounded-full"
                      style={{ width: `${stats()?.totalPendaftar ? (s.count / stats()?.totalPendaftar) * 100 : 0}%` }}
                    />
                  </div>
                  <span class="text-sm font-mono w-16 text-right">{s.count}</span>
                </div>
              )}
            </For>
          </div>
        </Show>

        {/* Export */}
        <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-5">
          <h2 class="font-semibold mb-3">Export Data</h2>
          <div class="flex gap-3 items-end">
            <div>
              <label class="text-xs text-secondary-500 block mb-1">Filter Sesi (opsional)</label>
              <input
                type="number"
                placeholder="Sesi ID"
                value={sessionFilter()}
                onInput={(e) => setSessionFilter(e.currentTarget.value)}
                class="px-3 py-2 border border-secondary-300 rounded-lg text-sm w-40"
              />
            </div>
            <Button onClick={handleExportCsv} disabled={exporting()}>
              {exporting() ? 'Memproses...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
