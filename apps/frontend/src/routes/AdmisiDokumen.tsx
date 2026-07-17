import { useNavigate, useParams } from '@solidjs/router';
import { createMemo, createResource, createSignal, For, Show } from 'solid-js';
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

  const [app] = createResource(
    () => Number(params.id),
    (id) => admisiController.getApplicationDetail(id).then((r) => r.data),
  );

  const [docs, { refetch: refetchDocs }] = createResource(
    () => Number(params.id),
    (id) => admisiController.getDocuments(id).then((r) => r.data),
  );

  const [requirements] = createResource(
    () => app()?.sessionId,
    (sessionId) => admisiController.getDocumentRequirements(sessionId).then((r) => r.data),
  );

  // Gabung requirements + docs jadi satu array reaktif
  const reqWithDocs = createMemo(() =>
    (requirements() || []).map(
      (req: {
        id: number;
        namaDokumen: string;
        isWajib: boolean;
        formatFile?: string;
        maxSizeKb: number;
        deskripsi?: string;
      }) => ({
        ...req,
        uploaded: docs()?.filter((d: { requirementId: number }) => d.requirementId === req.id) || [],
        latest: (docs()?.filter((d: { requirementId: number }) => d.requirementId === req.id) || []).slice(-1)[0],
      }),
    ),
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
      } catch (err: unknown) {
        toast.showToast((err as Error).message || 'Gagal upload', 'error');
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
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal', 'error');
    }
  };

  const handleDelete = async (documentId: number) => {
    try {
      await admisiController.deleteDocument(documentId);
      toast.showToast('Dokumen dihapus', 'success');
      refetchDocs();
    } catch (err: unknown) {
      toast.showToast((err as Error).message || 'Gagal hapus', 'error');
    }
  };

  return (
    <MainLayout>
      <div class="p-4 md:p-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/admisi/pendaftaran/${params.id}`)}
          class="text-sm text-brand-600 hover:text-brand-700 mb-4"
        >
          ← Kembali ke Detail
        </button>

        <h1 class="text-2xl font-bold mb-2">Kelola Dokumen</h1>
        <p class="text-sm text-secondary-500 mb-6">Upload dokumen persyaratan sesuai sesi admisi.</p>

        <Show when={app()?.status === 'draft' && !app()?.isFree}>
          <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center text-sm text-amber-700 dark:text-amber-400 mb-6">
            ⏳ Pembayaran belum diverifikasi. Silakan lakukan pembayaran terlebih dahulu untuk dapat mengupload dokumen.
            <div class="mt-3">
              <Button onClick={() => navigate(`/admisi/pembayaran/${params.id}`)}>Bayar Sekarang</Button>
            </div>
          </div>
        </Show>

        <Show when={app()?.status !== 'draft' || app()?.isFree}>
          <Show when={!requirements() && !app()}>
            <div class="text-center py-8 text-secondary-400">Memuat...</div>
          </Show>

          <Show when={requirements() && requirements()!.length === 0}>
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 text-center text-sm text-amber-700 dark:text-amber-400">
              Belum ada syarat dokumen yang ditetapkan untuk sesi ini. Silakan hubungi admin.
            </div>
          </Show>

          <div class="space-y-4">
            <For each={reqWithDocs()}>
              {(item: {
                id: number;
                namaDokumen: string;
                isWajib: boolean;
                latest?: { isVerified: boolean };
                uploaded: { id: number }[];
                deskripsi?: string;
                formatFile?: string;
                maxSizeKb: number;
              }) => (
                <div class="bg-white dark:bg-secondary-800/40 border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <span class="font-medium text-sm">{item.namaDokumen}</span>
                        {item.isWajib ? (
                          <span class="text-xs text-red-500 font-semibold">*wajib</span>
                        ) : (
                          <span class="text-xs text-secondary-400">opsional</span>
                        )}
                        {item.latest && (
                          <span
                            class={`text-xs px-1.5 py-0.5 rounded-full ${item.latest.isVerified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}
                          >
                            {item.latest.isVerified ? 'Terverifikasi' : 'Menunggu'}
                          </span>
                        )}
                      </div>
                      <Show when={item.deskripsi}>
                        <div class="text-xs text-secondary-400 mt-0.5">{item.deskripsi}</div>
                      </Show>
                      <div class="text-xs text-secondary-400 mt-0.5">
                        Format: <span class="font-mono">{item.formatFile || 'semua format'}</span> — Maks:{' '}
                        {item.maxSizeKb}KB
                      </div>

                      <Show when={item.uploaded.length > 0}>
                        <div class="mt-2 space-y-1">
                          <For each={item.uploaded}>
                            {(doc: {
                              id: number;
                              uploadMethod?: string;
                              fileLink?: string;
                              filePath?: string;
                              originalName?: string;
                              fileSizeKb?: number;
                              rejectionNote?: string;
                            }) => (
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
                                    <span>
                                      {doc.originalName || 'Dokumen'} ({doc.fileSizeKb || '?'}KB)
                                    </span>
                                  )}
                                  <Show when={doc.rejectionNote}>
                                    <span class="text-red-500">— {doc.rejectionNote}</span>
                                  </Show>
                                </div>
                                <button
                                  onClick={() => handleDelete(doc.id)}
                                  class="text-red-500 hover:text-red-700 flex-shrink-0 ml-2"
                                >
                                  Hapus
                                </button>
                              </div>
                            )}
                          </For>
                        </div>
                      </Show>
                    </div>

                    <div class="flex gap-2 ml-4 flex-shrink-0">
                      <Button size="sm" onClick={() => handleUpload(item.id)}>
                        {item.latest ? 'Upload Ulang' : 'Upload File'}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setShowLinkInput(showLinkInput() === item.id ? null : item.id)}
                      >
                        Link
                      </Button>
                    </div>
                  </div>

                  <Show when={showLinkInput() === item.id}>
                    <div class="mt-3 flex gap-2">
                      <input
                        type="url"
                        placeholder="Tempel link Google Drive..."
                        value={linkValue()}
                        onInput={(e) => setLinkValue(e.currentTarget.value)}
                        class="flex-1 px-3 py-2 border border-secondary-300 dark:border-secondary-600 rounded-lg text-sm bg-white dark:bg-secondary-800"
                      />
                      <Button size="sm" onClick={() => handleLinkSubmit(item.id)} disabled={!linkValue()}>
                        Kirim
                      </Button>
                    </div>
                  </Show>
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
