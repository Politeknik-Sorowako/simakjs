import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiVerifikasi() {
  const toast = useToast();
  const [sessionFilter, setSessionFilter] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('submitted');

  const [apps, { refetch }] = createResource(
    () => ({ sessionId: sessionFilter() ? Number(sessionFilter()) : undefined, status: statusFilter() || undefined }),
    (f) => admisiAdminController.getApplications(f),
  );

  const [selectedApp, setSelectedApp] = createSignal<any>(null);

  const handleVerify = async (docId: number, verified: boolean) => {
    try {
      await admisiAdminController.verifyDocument(docId, verified, verified ? undefined : 'Dokumen tidak sesuai persyaratan');
      toast.showToast(verified ? 'Dokumen diverifikasi' : 'Dokumen ditolak', 'success');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message, 'error');
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-6xl mx-auto">
        <h1 class="text-2xl font-bold mb-2">Verifikasi Dokumen</h1>
        <p class="text-sm text-secondary-500 mb-6">Periksa dan verifikasi dokumen pendaftar</p>

        <div class="flex gap-3 mb-4">
          <input
            type="number" placeholder="Filter Sesi ID"
            value={sessionFilter()}
            onInput={(e) => setSessionFilter(e.currentTarget.value)}
            class="px-3 py-2 border border-secondary-300 rounded-lg text-sm w-40"
          />
          <select
            value={statusFilter()}
            onChange={(e) => setStatusFilter(e.currentTarget.value)}
            class="px-3 py-2 border border-secondary-300 rounded-lg text-sm"
          >
            <option value="submitted">Menunggu Verifikasi</option>
            <option value="documents_verified">Terverifikasi</option>
            <option value="documents_rejected">Ditolak</option>
            <option value="">Semua</option>
          </select>
        </div>

        <div class="grid gap-3">
          <For each={apps()?.data || []}>
            {(app: any) => (
              <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <span class="font-mono text-xs text-secondary-400">{app.noPendaftar}</span>
                    <span class="font-semibold ml-2">{app.namaLengkap || '-'}</span>
                  </div>
                  <span class={`text-xs px-2 py-0.5 rounded-full ${app.status === 'submitted' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {app.status}
                  </span>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" onClick={() => setSelectedApp(selectedApp()?.id === app.id ? null : app)}>
                    {selectedApp()?.id === app.id ? 'Tutup' : 'Lihat Dokumen'}
                  </Button>
                </div>

                <Show when={selectedApp()?.id === app.id}>
                  <div class="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700">
                    <p class="text-xs text-secondary-400 mb-2">Dokumen: (simulasi — implementasi dengan dokumen riwayat)</p>
                    <div class="flex gap-2">
                      <Button size="sm" onClick={() => handleVerify(1, true)}>Setujui</Button>
                      <Button size="sm" variant="secondary" onClick={() => handleVerify(1, false)}>Tolak</Button>
                    </div>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>
      </div>
    </MainLayout>
  );
}
