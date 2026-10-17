import { A, useNavigate } from '@solidjs/router';
import { createSignal, For, Show } from 'solid-js';
import { LampiranItem, PengumumanItem } from '../../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MarkdownViewer } from '../ui/MarkdownViewer';

interface PengumumanDetailModalProps {
  item: PengumumanItem | null;
  onClose: () => void;
  onEdit?: (item: PengumumanItem) => void;
}

export function PengumumanDetailModal(props: PengumumanDetailModalProps) {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = createSignal(false);
  const p = () => props.item;

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

  const handleOpenStandalone = () => {
    if (!p()) return;
    props.onClose();
    navigate(`/pengumuman/${p()!.id}`);
  };

  return (
    <Show when={props.item}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <div
          class={`bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl w-full flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 transition-all ${
            isExpanded() ? 'max-w-5xl h-[94vh]' : 'max-w-3xl max-h-[90vh]'
          }`}
        >
          {/* Header */}
          <div class="border-b border-secondary-200 dark:border-secondary-800 px-6 py-4 flex items-center justify-between shrink-0 bg-secondary-50/50 dark:bg-secondary-800/20">
            <div class="flex items-center gap-2 flex-wrap">
              <Show when={p()?.isPinned}>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  📌 Disematkan
                </span>
              </Show>
              <span class="text-xs text-secondary-500">
                Diterbitkan: {formatDate(p()?.publishedAt || p()?.createdAt)}
              </span>
              <Show when={p()?.expiresAt}>
                <span class="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  • Berakhir: {formatDate(p()?.expiresAt)}
                </span>
              </Show>
            </div>

            {/* Action Buttons: Open Standalone, Expand/Minimize, Close */}
            <div class="flex items-center gap-1.5 text-secondary-500">
              <button
                type="button"
                onClick={handleOpenStandalone}
                class="px-2.5 py-1.5 text-xs font-medium text-[#0066cc] dark:text-[#2997ff] hover:bg-action-50 dark:hover:bg-brand-950/40 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                title="Buka pada halaman terpisah"
              >
                <span>↗</span>
                <span class="hidden sm:inline">Buka Halaman Penuh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded())}
                class="p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors cursor-pointer"
                title={isExpanded() ? 'Perkecil tampilan modal' : 'Perbesar ke layar penuh'}
              >
                {isExpanded() ? '⤡' : '⤢'}
              </button>

              <button
                type="button"
                onClick={props.onClose}
                class="p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors cursor-pointer"
                title="Tutup"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body: with min-h-0 and overflow-y-auto to allow continuous scrolling */}
          <div class="flex-1 min-h-0 overflow-y-auto p-6 sm:p-8 space-y-6 overscroll-contain scrollbar-thin">
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-secondary-900 dark:text-white tracking-tight leading-tight">
                {p()?.judul}
              </h1>

              <div class="flex items-center gap-2 text-xs text-secondary-500 pt-3 pb-4 border-b border-secondary-100 dark:border-secondary-800 flex-wrap">
                <span>
                  Oleh:{' '}
                  <strong class="text-secondary-700 dark:text-secondary-200">{p()?.authorNama || 'Pengelola'}</strong>
                </span>
                <span>•</span>
                <span class="uppercase tracking-wider font-semibold text-[10px] px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800">
                  {p()?.authorRole}
                </span>
                <Show when={p()?.viewCount !== undefined && p()!.viewCount > 0}>
                  <span>•</span>
                  <span>👁️ {p()?.viewCount} kali dibaca</span>
                </Show>
              </div>
            </div>

            {/* Thumbnail Banner */}
            <Show when={p()?.thumbnailUrl}>
              <div class="w-full max-h-96 rounded-2xl overflow-hidden bg-secondary-100 dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-800">
                <img
                  src={getAbsoluteStorageUrl(p()!.thumbnailUrl!)}
                  alt={p()?.judul}
                  class="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.parentElement?.classList.add('hidden');
                  }}
                />
              </div>
            </Show>

            {/* Markdown Content (Formatted rich view) */}
            <div class="pt-1">
              <MarkdownViewer content={p()?.konten || ''} />
            </div>

            {/* Lampiran & Berkas */}
            <Show when={p()?.lampiran && p()!.lampiran!.length > 0}>
              <div class="border-t border-secondary-100 dark:border-secondary-800 pt-6 mt-6">
                <h4 class="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400 mb-3 flex items-center gap-1.5">
                  <span>📎</span>
                  <span>Lampiran & Berkas Terkait ({p()!.lampiran!.length})</span>
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <For each={p()?.lampiran}>
                    {(l: LampiranItem) => (
                      <a
                        href={getAbsoluteStorageUrl(l.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center justify-between p-3.5 rounded-2xl border border-secondary-200 dark:border-secondary-700 bg-secondary-50/60 dark:bg-secondary-800/40 hover:bg-secondary-100 dark:hover:bg-secondary-800 text-xs transition-colors group shadow-2xs"
                      >
                        <div class="flex items-center gap-2.5 truncate">
                          <span class="text-lg">{l.tipe === 'link' ? '🔗' : l.tipe === 'gambar' ? '🖼️' : '📄'}</span>
                          <span class="font-semibold text-secondary-800 dark:text-secondary-200 truncate group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]">
                            {l.nama}
                          </span>
                        </div>
                        <span class="text-xs text-secondary-400 group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                          ↗
                        </span>
                      </a>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          {/* Footer */}
          <div class="border-t border-secondary-200 dark:border-secondary-800 px-6 py-3.5 flex items-center justify-between shrink-0 bg-secondary-50/50 dark:bg-secondary-800/20">
            <button
              type="button"
              onClick={handleOpenStandalone}
              class="text-xs font-semibold text-[#0066cc] dark:text-[#2997ff] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>↗</span>
              <span>Buka di Halaman Penuh</span>
            </button>

            <div class="flex items-center gap-2">
              <Show when={props.onEdit && p()}>
                <button
                  type="button"
                  onClick={() => {
                    const item = p();
                    props.onClose();
                    if (item) props.onEdit?.(item);
                  }}
                  class="px-4 py-2 rounded-xl text-xs font-semibold text-secondary-700 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-200 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              </Show>

              <button
                type="button"
                onClick={props.onClose}
                class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-secondary-800 hover:bg-secondary-900 dark:bg-secondary-700 dark:hover:bg-secondary-600 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </Show>
  );
}
