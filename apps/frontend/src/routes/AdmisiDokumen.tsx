import { createResource, createSignal, For, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { MainLayout } from '../components/MainLayout';
import { Button } from '../components/ui/Button';
import { useToast } from '../contexts/ToastContext';
import { admisiController } from '../controllers/admisiController';

export default function AdmisiDokumen() {
  const params = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [showLinkInput, setShowLinkInput] = createSignal<number | null>(null);
  const [linkValue, setLinkValue] = createSignal('');

  const [app] = createResource(() => Number(params.id), (id) =>
    admisiController.getApplicationDetail(id).then((r) => r.data),
  );

  const [docs, { refetch }] = createResource(() => Number(params.id), (id) =>
    admisiController.getDocuments(id).then((r) => r.data),
  );

  const handleUpload = async (requirementId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('requirementId', String(requirementId));
      try {
        await admisiController.uploadDocument(Number(params.id), fd);
        toast.showToast('Dokumen berhasil diupload!', 'success');
        refetch();
      } catch (err: any) {
        toast.showToast(err.message || 'Gagal upload', 'error');
      }
    };
    input.click();
  };

  const handleLinkSubmit = async (requirementId: number) => {
    if (!linkValue()) return;
    try {
      await admisiController.submitDocumentLink(Number(params.id), {
        requirementId,
        fileLink: linkValue(),
      });
      toast.showToast('Link berhasil dikirim!', 'success');
      setShowLinkInput(null);
      setLinkValue('');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal', 'error');
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await admisiController.deleteDocument(documentId);
      toast.showToast('Dokumen dihapus', 'success');
      refetch();
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal hapus', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)} class="text-sm text-brand-600 hover:text-brand-700 mb-4">
          ← Kembali ke Detail
        </button>

        <h1 class="text-2xl font-bold mb-2">Kelola Dokumen</h1>
        <p class="text-sm text-secondary-500 mb-6">Upload dokumen persyaratan sesuai sesi admisi.</p>

        <Show when={app.loading}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show when={app()}>
          <div class="space-y-3">
            <For each={[] as any[]}>
              {(req: any) => (
                <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-medium text-sm">{req.namaDokumen}</div>
                      <Show when={req.deskripsi}>
                        <div class="text-xs text-secondary-400">{req.deskripsi}</div>
                      </Show>
                    </div>
                    <div class="flex gap-2">
                      <Button size="sm" onClick={() => handleUpload(req.id)}>Upload File</Button>
                      <Button size="sm" variant="secondary" onClick={() => setShowLinkInput(showLinkInput() === req.id ? null : req.id)}>
                        Link
                      </Button>
                    </div>
                  </div>

                  <Show when={showLinkInput() === req.id}>
                    <div class="mt-3 flex gap-2">
                      <input
                        type="url"
                        placeholder="Tempel link Google Drive..."
                        value={linkValue()}
                        onInput={(e) => setLinkValue(e.currentTarget.value)}
                        class="flex-1 px-3 py-2 border border-secondary-300 rounded-lg text-sm"
                      />
                      <Button size="sm" onClick={() => handleLinkSubmit(req.id)}>Kirim</Button>
                    </div>
                  </Show>

                  {/* Uploaded docs for this requirement */}
                  <For each={docs()?.filter((d: any) => d.requirementId === req.id) || []}>
                    {(doc: any) => (
                      <div class="mt-2 pl-4 border-l-2 border-secondary-200 dark:border-secondary-600">
                        <div class="flex items-center justify-between text-xs">
                          <div class="flex items-center gap-2">
                            <span>{doc.originalName || 'Link'}</span>
                            <span class={`px-1.5 py-0.5 rounded-full ${doc.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {doc.isVerified ? 'OK' : 'Verifikasi'}
                            </span>
                          </div>
                          <button onClick={() => handleDelete(doc.id)} class="text-red-500 hover:text-red-700">Hapus</button>
                        </div>
                        <Show when={doc.rejectionNote}>
                          <div class="text-xs text-red-500 mt-0.5">Alasan: {doc.rejectionNote}</div>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </Show>

        <div class="mt-6">
          <Button onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}>Selesai</Button>
        </div>
      </div>
    </MainLayout>
  );
}
