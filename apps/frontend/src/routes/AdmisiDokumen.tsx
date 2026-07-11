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

  const [docs, { refetch: refetchDocs }] = createResource(() => Number(params.id), (id) =>
    admisiController.getDocuments(id).then((r) => r.data),
  );

  const [requirements] = createResource(
    () => app()?.sessionId,
    (sessionId) =>
      admisiController.getDocumentRequirements(sessionId).then((r) => r.data),
  );

  const handleUpload = async (requirementId: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('requirementId', String(requirementId));
      try {
        await admisiController.uploadDocument(Number(params.id), fd);
        toast.showToast('Dokumen berhasil diupload!', 'success');
        refetchDocs();
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
      refetchDocs();
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal', 'error');
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await admisiController.deleteDocument(documentId);
      toast.showToast('Dokumen dihapus', 'success');
      refetchDocs();
    } catch (err: any) {
      toast.showToast(err.message || 'Gagal hapus', 'error');
    }
  };

  const uploadedDocsFor = (requirementId: number) =>
    docs()?.filter((d: any) => d.requirementId === requirementId) || [];

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-3xl mx-auto">
        <button onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)} class="text-sm text-brand-600 hover:text-brand-700 mb-4">
          ← Kembali ke Detail
        </button>

        <h1 class="text-2xl font-bold mb-2">Kelola Dokumen</h1>
        <p class="text-sm text-secondary-500 mb-6">Upload dokumen persyaratan sesuai sesi admisi.</p>

        <Show when={!requirements() && !app()}>
          <div class="text-center py-8 text-secondary-400">Memuat...</div>
        </Show>

        <Show when={requirements() && requirements()!.length === 0}>
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center text-sm text-amber-700 dark:text-amber-400">
            Belum ada syarat dokumen yang ditetapkan untuk sesi ini. Silakan hubungi admin.
          </div>
        </Show>

        <div class="space-y-4">
          <For each={requirements() || []}>
            {(req: any) => {
              const uploaded = uploadedDocsFor(req.id);
              const latest = uploaded[uploaded.length - 1];
              return (
                <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm">{req.namaDokumen}</span>
                        {req.isWajib ? <span class="text-xs text-red-500 font-semibold">*wajib</span> : <span class="text-xs text-secondary-400">opsional</span>}
                        {latest && (
                          <span class={`text-xs px-1.5 py-0.5 rounded-full ${latest.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {latest.isVerified ? 'Terverifikasi' : 'Menunggu'}
                          </span>
                        )}
                      </div>
                      <Show when={req.deskripsi}>
                        <div class="text-xs text-secondary-400 mt-0.5">{req.deskripsi}</div>
                      </Show>
                      <div class="text-xs text-secondary-400 mt-0.5">
                        Format: <span class="font-mono">{req.formatFile || 'semua format'}</span> — Maks: {req.maxSizeKb}KB
                      </div>

                      {/* Uploaded files */}
                      <Show when={uploaded.length > 0}>
                        <div class="mt-2 space-y-1">
                          <For each={uploaded}>
                            {(doc: any) => (
                              <div class="flex items-center justify-between text-xs pl-3 border-l-2 border-secondary-300 dark:border-secondary-600 py-1">
                                <div class="flex items-center gap-2 min-w-0">
                                  {doc.uploadMethod === 'link' && doc.fileLink ? (
                                    <a
                                      href={doc.fileLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      class="text-brand-600 hover:text-brand-700 underline truncate"
                                    >
                                      🔗 Buka Link Google Drive
                                    </a>
                                  ) : doc.filePath ? (
                                    <div class="flex items-center gap-2">
                                      <a
                                        href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/admisi/documents/${doc.id}/file`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="text-brand-600 hover:text-brand-700 underline truncate"
                                      >
                                        📄 {doc.originalName || 'Lihat File'}
                                      </a>
                                      <span class="text-secondary-400">({doc.fileSizeKb || '?'}KB)</span>
                                    </div>
                                  ) : (
                                    <span>{doc.originalName || 'Dokumen'} ({doc.fileSizeKb || '?'}KB)</span>
                                  )}
                                  <Show when={doc.rejectionNote}>
                                    <span class="text-red-500">— {doc.rejectionNote}</span>
                                  </Show>
                                </div>
                                <button onClick={() => handleDelete(doc.id)} class="text-red-500 hover:text-red-700 flex-shrink-0 ml-2">
                                  Hapus
                                </button>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>

                    <div class="flex gap-2 ml-4 flex-shrink-0">
                      <Button size="sm" onClick={() => handleUpload(req.id)}>
                        {latest ? 'Upload Ulang' : 'Upload File'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowLinkInput(showLinkInput() === req.id ? null : req.id)}
                      >
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
                        class="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
                      />
                      <Button size="sm" onClick={() => handleLinkSubmit(req.id)} disabled={!linkValue()}>
                        Kirim
                      </Button>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <div class="mt-6 flex gap-3">
          <Button onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}>Selesai</Button>
          <Button variant="secondary" onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}>
            Kembali
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
