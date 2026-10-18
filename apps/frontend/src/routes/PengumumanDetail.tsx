import { A, useNavigate, useParams } from '@solidjs/router';
import { createResource, createSignal, For, Show } from 'solid-js';
import { MainLayout } from '../components/MainLayout';
import { PengumumanFormModal } from '../components/pengumuman/PengumumanFormModal';
import { MarkdownViewer } from '../components/ui/MarkdownViewer';
import { useAuth } from '../contexts/AuthContext';
import { LampiranItem, PengumumanItem, pengumumanController } from '../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../utils/api';

export default function PengumumanDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [copied, setCopied] = createSignal(false);
  const [isEditOpen, setIsEditOpen] = createSignal(false);

  const announcementId = () => Number(params.id);

  // Fetch detail data
  const [announcement, { refetch }] = createResource(
    () => announcementId(),
    async (id) => {
      if (isNaN(id)) throw new Error('ID pengumuman tidak valid');
      return await pengumumanController.getDetail(id);
    },
  );

  // Fetch target options in case edit modal is opened
  const [targetOptions] = createResource(() => pengumumanController.getTargetOptions());

  const canManage = () => {
    const item = announcement();
    if (!item) return false;
    const isSuperOrAdmin = auth.hasRole(['admin', 'super_admin']);
    const isAuthor = auth.user()?.id === item.authorId;
    return isSuperOrAdmin || isAuthor;
  };

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dStr;
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert(`Tautan: ${window.location.href}`);
    }
  };

  const handleDelete = async () => {
    const item = announcement();
    if (!item) return;
    if (confirm('Hapus permanen pengumuman ini? Tindakan tidak dapat dibatalkan.')) {
      try {
        await pengumumanController.delete(item.id);
        navigate('/pengumuman');
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus pengumuman');
      }
    }
  };

  return (
    <MainLayout>
      <div class="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Actions Top Bar */}
        <div class="flex items-center justify-between gap-4 border-b border-secondary-200 dark:border-secondary-800 pb-4">
          <A
            href="/pengumuman"
            class="inline-flex items-center gap-2 text-xs font-semibold text-secondary-600 dark:text-secondary-300 hover:text-[#0066cc] dark:hover:text-[#2997ff] transition-colors"
          >
            <span>←</span>
            <span>Kembali ke Semua Pengumuman</span>
          </A>

          <div class="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-white dark:bg-secondary-900 text-xs font-medium text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-800 shadow-2xs transition-colors cursor-pointer"
            >
              <span>{copied() ? '✓' : '🔗'}</span>
              <span>{copied() ? 'Tautan Disalin!' : 'Salin Tautan'}</span>
            </button>

            <Show when={canManage()}>
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                class="px-3 py-1.5 rounded-xl text-xs font-medium bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-200 text-secondary-700 transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                class="px-3 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                Hapus
              </button>
            </Show>
          </div>
        </div>

        {/* Loading / Error States */}
        <Show when={announcement.loading}>
          <div class="py-20 text-center text-sm text-secondary-400">
            <div class="inline-block w-6 h-6 border-2 border-action border-t-transparent rounded-full animate-spin mb-2" />
            <p>Memuat pengumuman...</p>
          </div>
        </Show>

        <Show when={announcement.error}>
          <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-3xl p-8 text-center space-y-3">
            <span class="text-3xl">⚠️</span>
            <h2 class="text-base font-bold text-rose-700 dark:text-rose-300">Pengumuman Tidak Ditemukan</h2>
            <p class="text-xs text-rose-600/80 dark:text-rose-400 max-w-md mx-auto">
              Pengumuman mungkin telah ditarik, dihapus, atau Anda tidak memiliki akses ke pengumuman ini.
            </p>
            <A
              href="/pengumuman"
              class="inline-block mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700"
            >
              Kembali ke Beranda Pengumuman
            </A>
          </div>
        </Show>

        {/* Content Body */}
        <Show when={announcement()}>
          {(item) => (
            <article class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl p-6 sm:p-10 space-y-8">
              {/* Badges & Meta */}
              <div class="space-y-4">
                <div class="flex items-center gap-2 flex-wrap">
                  <Show when={item().isPinned}>
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                      📌 Disematkan
                    </span>
                  </Show>
                  <Show when={item().status === 'scheduled'}>
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
                      Terjadwal
                    </span>
                  </Show>
                  <Show when={item().status === 'withdrawn'}>
                    <span class="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                      Ditarik
                    </span>
                  </Show>
                  <span class="px-3 py-1 rounded-full text-xs font-medium bg-action-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                    🎯 Sasaran: {item().targetRole === 'semua' ? 'Semua Sivitas' : item().targetRole}
                  </span>
                </div>

                <h1 class="text-2xl sm:text-4xl font-extrabold text-secondary-900 dark:text-white tracking-tight leading-tight">
                  {item().judul}
                </h1>

                <div class="flex items-center gap-3 text-xs sm:text-sm text-secondary-500 pt-2 pb-4 border-b border-secondary-100 dark:border-secondary-800 flex-wrap">
                  <span>
                    Diterbitkan oleh:{' '}
                    <strong class="text-secondary-800 dark:text-secondary-100">
                      {item().authorNama || 'Pengelola'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span class="uppercase font-semibold text-[11px] px-2 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800">
                    {item().authorRole}
                  </span>
                  <span>•</span>
                  <span>{formatDate(item().publishedAt || item().createdAt)}</span>
                  <Show when={item().expiresAt}>
                    <span>•</span>
                    <span class="font-medium text-amber-600 dark:text-amber-400">
                      Batas Tayang: {formatDate(item().expiresAt)}
                    </span>
                  </Show>
                  <Show when={item().viewCount > 0}>
                    <span>•</span>
                    <span>👁️ {item().viewCount} kali dibaca</span>
                  </Show>
                </div>
              </div>

              {/* High-res Thumbnail Banner if available */}
              <Show when={item().thumbnailUrl}>
                <div class="w-full max-h-[460px] rounded-2xl overflow-hidden bg-secondary-100 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-800">
                  <img
                    src={getAbsoluteStorageUrl(item().thumbnailUrl!)}
                    alt={item().judul}
                    class="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.parentElement?.classList.add('hidden');
                    }}
                  />
                </div>
              </Show>

              {/* Rich Markdown Content */}
              <div class="pt-2 pb-4">
                <MarkdownViewer content={item().konten} />
              </div>

              {/* Lampiran & Berkas */}
              <Show when={item().lampiran && item().lampiran!.length > 0}>
                <div class="border-t border-secondary-200 dark:border-secondary-800 pt-8 mt-8">
                  <h3 class="text-sm font-bold uppercase tracking-wider text-secondary-700 dark:text-secondary-300 mb-4 flex items-center gap-2">
                    <span>📎</span>
                    <span>Lampiran & Berkas Terkait ({item().lampiran!.length})</span>
                  </h3>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <For each={item().lampiran}>
                      {(l: LampiranItem) => (
                        <a
                          href={getAbsoluteStorageUrl(l.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="flex items-center justify-between p-4 rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-secondary-50/70 dark:bg-secondary-800/40 hover:bg-secondary-100 dark:hover:bg-secondary-800 text-xs transition-colors group shadow-2xs"
                        >
                          <div class="flex items-center gap-3 truncate">
                            <span class="text-xl">{l.tipe === 'link' ? '🔗' : l.tipe === 'gambar' ? '🖼️' : '📄'}</span>
                            <div class="truncate">
                              <div class="font-semibold text-secondary-900 dark:text-secondary-100 truncate group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]">
                                {l.nama}
                              </div>
                              <div class="text-[11px] text-secondary-400 capitalize">{l.tipe}</div>
                            </div>
                          </div>
                          <span class="text-sm text-secondary-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                            ↗
                          </span>
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </article>
          )}
        </Show>

        {/* Edit Modal if triggered from standalone page */}
        <Show when={announcement()}>
          {(item) => (
            <PengumumanFormModal
              isOpen={isEditOpen()}
              onClose={() => setIsEditOpen(false)}
              onSuccess={() => {
                refetch();
              }}
              initialData={item()}
              targetOptions={targetOptions() || { prodi: [], kelas: [], rombel: [] }}
            />
          )}
        </Show>
      </div>
    </MainLayout>
  );
}
