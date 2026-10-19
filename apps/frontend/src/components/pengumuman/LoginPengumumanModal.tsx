import { useNavigate } from '@solidjs/router';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { type LampiranItem, type PengumumanItem, pengumumanController } from '../../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MarkdownViewer } from '../ui/MarkdownViewer';

export function LoginPengumumanModal() {
  const navigate = useNavigate();
  const [popups, setPopups] = createSignal<PengumumanItem[]>([]);
  const [currentIndex, setCurrentIndex] = createSignal(0);
  const [isOpen, setIsOpen] = createSignal(false);
  const [isMarkingRead, setIsMarkingRead] = createSignal(false);

  onMount(async () => {
    try {
      const items = await pengumumanController.getLoginPopups();
      if (!Array.isArray(items) || items.length === 0) return;

      // Filter out items that have already been dismissed in this browser session
      const undismissed = items.filter((item) => {
        try {
          return !sessionStorage.getItem(`simak_popup_dismissed_${item.id}`);
        } catch {
          return true;
        }
      });

      if (undismissed.length > 0) {
        setPopups(undismissed);
        setCurrentIndex(0);
        setIsOpen(true);
      }
    } catch {
      // Ignored: silent fail on non-critical modal
    }
  });

  const currentItem = () => popups()[currentIndex()];

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  const handleDismissCurrent = async () => {
    const item = currentItem();
    if (!item) return;

    // Record in sessionStorage to avoid repeating during this browser tab session
    try {
      sessionStorage.setItem(`simak_popup_dismissed_${item.id}`, 'true');
    } catch {
      // Best-effort
    }

    // Call backend to mark read
    setIsMarkingRead(true);
    try {
      await pengumumanController.markAsRead(item.id);
    } catch {
      // Best-effort
    } finally {
      setIsMarkingRead(false);
    }

    // If there are more popups, advance or close
    if (currentIndex() < popups().length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handleCloseAll = () => {
    // Dismiss all remaining in session
    for (const item of popups()) {
      try {
        sessionStorage.setItem(`simak_popup_dismissed_${item.id}`, 'true');
      } catch {
        // Best-effort
      }
    }
    setIsOpen(false);
  };

  const handleOpenStandalone = () => {
    const item = currentItem();
    if (!item) return;
    handleDismissCurrent();
    navigate(`/pengumuman/${item.id}`);
  };

  return (
    <Show when={isOpen() && currentItem()}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
          <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div class="border-b border-secondary-200 dark:border-secondary-800 px-6 py-4 flex items-center justify-between shrink-0 bg-secondary-50/70 dark:bg-secondary-850">
              <div class="flex items-center gap-2.5 flex-wrap">
                <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#0066cc]/10 text-[#0066cc] dark:bg-[#2997ff]/20 dark:text-[#2997ff]">
                  🔔 Pengumuman Penting
                </span>
                <Show when={currentItem()?.isPinned}>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                    📌 Disematkan
                  </span>
                </Show>
                <Show when={popups().length > 1}>
                  <span class="px-2.5 py-0.5 rounded-full text-xs font-medium text-secondary-600 dark:text-secondary-400 bg-secondary-200/60 dark:bg-secondary-800">
                    {currentIndex() + 1} dari {popups().length}
                  </span>
                </Show>
              </div>

              <button
                type="button"
                onClick={handleCloseAll}
                class="p-2 text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-200 rounded-full hover:bg-secondary-200/50 dark:hover:bg-secondary-800 transition-colors cursor-pointer"
                title="Tutup dialog"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div class="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6 overscroll-contain scrollbar-thin">
              {/* Thumbnail Banner (if present) */}
              <Show when={currentItem()?.thumbnailUrl}>
                <div class="w-full max-h-72 rounded-2xl overflow-hidden bg-secondary-100 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-800 shadow-xs">
                  <img
                    src={getAbsoluteStorageUrl(currentItem()!.thumbnailUrl!)}
                    alt={currentItem()!.judul}
                    class="w-full h-full object-cover"
                  />
                </div>
              </Show>

              {/* Title & Metadata */}
              <div>
                <h2 class="text-xl sm:text-2xl font-bold text-secondary-900 dark:text-white tracking-tight leading-snug mb-2">
                  {currentItem()!.judul}
                </h2>
                <div class="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400 flex-wrap">
                  <span>Diterbitkan: {formatDate(currentItem()!.publishedAt || currentItem()!.createdAt)}</span>
                  <Show when={currentItem()?.expiresAt}>
                    <span>•</span>
                    <span class="text-amber-600 dark:text-amber-400 font-medium">
                      Aktif hingga: {formatDate(currentItem()!.expiresAt)}
                    </span>
                  </Show>
                  <span>•</span>
                  <span>
                    Oleh:{' '}
                    <strong class="text-secondary-700 dark:text-secondary-200">
                      {currentItem()!.authorNama || 'Pengelola SIMAK'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Markdown Content */}
              <div class="border-t border-secondary-100 dark:border-secondary-800/80 pt-4 text-secondary-800 dark:text-secondary-200">
                <MarkdownViewer content={currentItem()!.konten} />
              </div>

              {/* Attachments */}
              <Show when={currentItem()?.lampiran && currentItem()!.lampiran!.length > 0}>
                <div class="border-t border-secondary-100 dark:border-secondary-800/80 pt-5 space-y-3">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                    Lampiran Berkas ({currentItem()!.lampiran!.length})
                  </h4>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <For each={currentItem()!.lampiran}>
                      {(file: LampiranItem) => (
                        <a
                          href={getAbsoluteStorageUrl(file.url)}
                          target="_blank"
                          rel="noreferrer"
                          class="flex items-center gap-3 p-3 rounded-2xl border border-secondary-200 dark:border-secondary-700 hover:border-[#0066cc] dark:hover:border-[#2997ff] bg-secondary-50/50 dark:bg-secondary-800/40 hover:bg-white dark:hover:bg-secondary-800 transition-all text-xs group"
                        >
                          <span class="text-xl">
                            {file.tipe === 'gambar' ? '🖼️' : file.tipe === 'link' ? '🔗' : '📄'}
                          </span>
                          <div class="flex-1 min-w-0">
                            <p class="font-semibold text-secondary-800 dark:text-secondary-200 truncate group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]">
                              {file.nama}
                            </p>
                            <p class="text-[11px] text-secondary-400 dark:text-secondary-500 uppercase">{file.tipe}</p>
                          </div>
                          <span class="text-secondary-400 group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]">
                            ↗
                          </span>
                        </a>
                      )}
                    </For>
                  </div>
                </div>
              </Show>
            </div>

            {/* Footer Navigation & Actions */}
            <div class="border-t border-secondary-200 dark:border-secondary-800 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 bg-secondary-50/70 dark:bg-secondary-850">
              {/* Carousel navigation controls if multiple */}
              <div class="flex items-center gap-2">
                <Show when={popups().length > 1}>
                  <button
                    type="button"
                    disabled={currentIndex() === 0}
                    onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                    class="px-3 py-1.5 rounded-full text-xs font-semibold border border-secondary-300 dark:border-secondary-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    type="button"
                    disabled={currentIndex() === popups().length - 1}
                    onClick={() => setCurrentIndex((prev) => Math.min(popups().length - 1, prev + 1))}
                    class="px-3 py-1.5 rounded-full text-xs font-semibold border border-secondary-300 dark:border-secondary-700 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
                  >
                    Selanjutnya →
                  </button>
                </Show>
              </div>

              {/* Action buttons */}
              <div class="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleOpenStandalone}
                  class="px-4 py-2 rounded-full text-xs font-semibold text-[#0066cc] dark:text-[#2997ff] hover:bg-[#0066cc]/10 dark:hover:bg-[#2997ff]/10 transition-colors cursor-pointer"
                >
                  Buka Halaman Penuh ↗
                </button>

                <button
                  type="button"
                  disabled={isMarkingRead()}
                  onClick={handleDismissCurrent}
                  class="px-5 py-2 rounded-full text-xs font-bold text-white bg-[#0066cc] hover:bg-[#0071e3] active:scale-95 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {popups().length > 1 && currentIndex() < popups().length - 1
                    ? 'Mengerti (Lanjut)'
                    : 'Mengerti & Tutup'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
