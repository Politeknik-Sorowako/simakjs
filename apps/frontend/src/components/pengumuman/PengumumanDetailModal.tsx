import { For, Show } from 'solid-js';
import { LampiranItem, PengumumanItem } from '../../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MarkdownViewer } from '../ui/MarkdownViewer';

interface PengumumanDetailModalProps {
  item: PengumumanItem | null;
  onClose: () => void;
}

export function PengumumanDetailModal(props: PengumumanDetailModalProps) {
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

  return (
    <Show when={props.item}>
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
        <div class="bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div class="border-b border-secondary-200 dark:border-secondary-800 px-6 py-4 flex items-center justify-between bg-secondary-50/50 dark:bg-secondary-800/20">
            <div class="flex items-center gap-2">
              <Show when={p()?.isPinned}>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
                  📌 Disematkan
                </span>
              </Show>
              <span class="text-xs text-secondary-500">
                Diterbitkan: {formatDate(p()?.publishedAt || p()?.createdAt)}
              </span>
            </div>
            <button
              type="button"
              onClick={props.onClose}
              class="p-1.5 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-200 rounded-xl hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div class="flex-1 overflow-y-auto p-6 space-y-5">
            <h1 class="text-2xl font-bold text-secondary-900 dark:text-white tracking-tight">{p()?.judul}</h1>

            <div class="flex items-center gap-2 text-xs text-secondary-500 pb-3 border-b border-secondary-100 dark:border-secondary-800">
              <span>
                Oleh:{' '}
                <strong class="text-secondary-700 dark:text-secondary-200">{p()?.authorNama || 'Pengelola'}</strong>
              </span>
              <span>•</span>
              <span class="uppercase tracking-wider font-semibold text-[10px] px-1.5 py-0.5 rounded bg-secondary-100 dark:bg-secondary-800">
                {p()?.authorRole}
              </span>
            </div>

            {/* Thumbnail Banner */}
            <Show when={p()?.thumbnailUrl}>
              <div class="w-full max-h-72 rounded-2xl overflow-hidden bg-secondary-100 dark:bg-secondary-800">
                <img
                  src={getAbsoluteStorageUrl(p()!.thumbnailUrl!)}
                  alt={p()?.judul}
                  class="w-full h-full object-cover"
                />
              </div>
            </Show>

            {/* Markdown Content */}
            <MarkdownViewer content={p()?.konten || ''} />

            {/* Lampiran & Berkas */}
            <Show when={p()?.lampiran && p()!.lampiran!.length > 0}>
              <div class="border-t border-secondary-100 dark:border-secondary-800 pt-5 mt-6">
                <h4 class="text-xs font-bold uppercase tracking-wider text-secondary-600 dark:text-secondary-400 mb-3">
                  Lampiran & Berkas Terkait:
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <For each={p()?.lampiran}>
                    {(l: LampiranItem) => (
                      <a
                        href={getAbsoluteStorageUrl(l.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center justify-between p-3 rounded-xl border border-secondary-200 dark:border-secondary-700 bg-secondary-50 dark:bg-secondary-800/40 hover:bg-secondary-100 dark:hover:bg-secondary-800 text-xs transition-colors group"
                      >
                        <div class="flex items-center gap-2.5 truncate">
                          <span class="text-base">{l.tipe === 'link' ? '🔗' : l.tipe === 'gambar' ? '🖼️' : '📄'}</span>
                          <span class="font-semibold text-secondary-800 dark:text-secondary-200 truncate group-hover:text-[#0066cc] dark:group-hover:text-[#2997ff]">
                            {l.nama}
                          </span>
                        </div>
                        <span class="text-[11px] text-secondary-400 group-hover:translate-x-0.5 transition-transform">
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
          <div class="border-t border-secondary-200 dark:border-secondary-800 px-6 py-3.5 flex justify-end bg-secondary-50/50 dark:bg-secondary-800/20">
            <button
              type="button"
              onClick={props.onClose}
              class="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-secondary-800 hover:bg-secondary-900 dark:bg-secondary-700 dark:hover:bg-secondary-600 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </Show>
  );
}
