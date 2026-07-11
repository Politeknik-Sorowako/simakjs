import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../../components/MainLayout';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../contexts/ToastContext';
import { admisiAdminController } from '../../controllers/admisiAdminController';

export default function AdmisiVerifikasi() {
  const toast = useToast();
  const [sessionFilter, setSessionFilter] = createSignal('');
  const [statusFilter, setStatusFilter] = createSignal('');
  const [selectedApp, setSelectedApp] = createSignal<any>(null);
  const [appDocs, setAppDocs] = createSignal<any[]>([]);

  const [sessions] = createResource(() => admisiAdminController.getSessions());

  const [apps, { refetch }] = createResource(
    () => ({
      sessionId: sessionFilter() ? Number(sessionFilter()) : undefined,
      status: statusFilter() || undefined,
    }),
    (f) => admisiAdminController.getApplications(f),
  );

  const loadDocs = async (applicationId: number) => {
    try {
      const { admisiController } = await import('../../controllers/admisiController');
      const res = await admisiController.getDocuments(applicationId);
      setAppDocs(res.data);
    } catch {
      setAppDocs([]);
    }
  };

  const handleSelectApp = async (app: any) => {
    if (selectedApp()?.id === app.id) {
      setSelectedApp(null);
      setAppDocs([]);
      return;
    }
    setSelectedApp(app);
    await loadDocs(app.id);
  };

  const handleVerify = async (docId: number, verified: boolean, rejectionNote?: string) => {
    try {
      await admisiAdminController.verifyDocument(docId, verified, rejectionNote);
      toast.showToast(verified ? 'Dokumen diverifikasi' : 'Dokumen ditolak', 'success');
      await loadDocs(selectedApp()?.id);
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
          <select
            value={sessionFilter()}
            onChange={(e) => { setSessionFilter(e.currentTarget.value); setSelectedApp(null); }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
          >
            <option value="">-- Semua Sesi --</option>
            <For each={sessions()?.data || []}>
              {(s: any) => <option value={s.id}>{s.nama}</option>}
            </For>
          </select>
          <select
            value={statusFilter()}
            onChange={(e) => { setStatusFilter(e.currentTarget.value); setSelectedApp(null); }}
            class="px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
          >
            <option value="">-- Semua Status --</option>
            <option value="submitted">Menunggu Verifikasi</option>
            <option value="documents_verified">Terverifikasi</option>
            <option value="documents_rejected">Ditolak</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <Show when={apps.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <div class="grid gap-3">
          <For each={apps()?.data || []}>
            {(app: any) => (
              <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <span class="font-mono text-xs text-secondary-400">{app.noPendaftar || '--'}</span>
                    <span class="font-semibold ml-2">{app.namaLengkap || app.nama || '-'}</span>
                  </div>
                  <span class={`text-xs px-2 py-0.5 rounded-full ${
                    app.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                    app.status === 'documents_verified' ? 'bg-green-100 text-green-700' :
                    app.status === 'documents_rejected' ? 'bg-red-100 text-red-700' :
                    app.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {app.status}
                  </span>
                </div>
                <div class="flex gap-2">
                  <Button size="sm" onClick={() => handleSelectApp(app)}>
                    {selectedApp()?.id === app.id ? 'Tutup' : 'Lihat Dokumen'}
                  </Button>
                </div>

                <Show when={selectedApp()?.id === app.id}>
                  <div class="mt-3 pt-3 border-t border-secondary-200 dark:border-secondary-700 space-y-2">
                    <Show when={appDocs().length === 0}>
                      <p class="text-xs text-secondary-400">Belum ada dokumen yang diupload.</p>
                    </Show>
                    <For each={appDocs()}>
                      {(doc: any) => {
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                        return (
                          <div class="flex items-center justify-between py-2 px-3 bg-secondary-50 dark:bg-secondary-800/60 rounded-lg text-sm">
                            <div class="flex items-center gap-2 min-w-0">
                              {doc.fileLink ? (
                                <a href={doc.fileLink} target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline truncate">
                                  🔗 {doc.originalName || 'Link'}
                                </a>
                              ) : (
                                <a href={`${apiUrl}/admisi/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer" class="text-brand-600 hover:underline truncate">
                                  📄 {doc.originalName || 'File'}
                                </a>
                              )}
                              <span class={`text-xs px-1.5 py-0.5 rounded-full ${doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {doc.isVerified ? 'Terverifikasi' : 'Menunggu'}
                              </span>
                            </div>
                            <Show when={!doc.isVerified}>
                              <div class="flex gap-1 ml-2">
                                <button onClick={() => handleVerify(doc.id, true)} class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Setujui</button>
                                <button onClick={() => {
                                  const note = prompt('Alasan penolakan:');
                                  if (note) handleVerify(doc.id, false, note);
                                }} class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">Tolak</button>
                              </div>
                            </Show>
                            <Show when={doc.rejectionNote}>
                              <span class="text-xs text-red-500 ml-2">Ditolak: {doc.rejectionNote}</span>
                            </Show>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </div>
            )}
          </For>
        </div>

        <Show when={!apps.loading && (!apps()?.data || apps()!.data.length === 0)}>
          <div class="text-center py-12 text-secondary-400 bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl">
            Tidak ada pendaftar dengan filter saat ini.
          </div>
        </Show>
      </div>
    </MainLayout>
  );
}
