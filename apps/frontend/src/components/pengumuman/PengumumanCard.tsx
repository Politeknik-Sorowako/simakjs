import { For, Show } from 'solid-js';
import { LampiranItem, PengumumanItem } from '../../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MarkdownViewer } from '../ui/MarkdownViewer';

interface PengumumanCardProps {
  item: PengumumanItem;
  isManageMode?: boolean;
  onEdit?: (item: PengumumanItem) => void;
  onWithdraw?: (id: number) => void;
  onPublishAgain?: (item: PengumumanItem) => void;
  onDelete?: (id: number) => void;
  onClick?: () => void;
}

export function PengumumanCard(props: PengumumanCardProps) {
  const p = () => props.item;

  const formatDate = (dStr?: string | null) => {
    if (!dStr) return '-';
    try {
      return new Date(dStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dStr;
    }
  };

  const statusBadge = () => {
    const s = p().status;
    switch (s) {
      case 'published':
        return (
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            Live
          </span>
        );
      case 'scheduled':
        return (
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300">
            Terjadwal
          </span>
        );
      case 'draft':
        return (
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-300">
            Draf
          </span>
        );
      case 'withdrawn':
        return (
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            Ditarik
          </span>
        );
      case 'archived':
        return (
          <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary-200 text-secondary-700 dark:bg-secondary-800 dark:text-secondary-400">
            Arsip
          </span>
        );
      default:
        return null;
    }
  };

  const targetBadge = () => {
    const r = p().targetRole;
    const scope = p().targetScopeType;
    let text = 'Semua Sivitas';

    if (scope === 'kelas') {
      text = 'Kelas Tertentu';
    } else if (scope === 'rombel') {
      text = 'Rombel Tertentu';
    } else if (p().targetProdiType === 'spesifik') {
      text = 'Prodi Tertentu';
    } else if (r === 'mahasiswa') {
      text = 'Seluruh Mahasiswa';
    } else if (r === 'dosen') {
      text = 'Seluruh Dosen';
    } else if (r === 'admin') {
      text = 'Khusus Admin/Staf';
    }

    return (
      <span class="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
        🎯 {text}
      </span>
    );
  };

  return (
    <div
      class={`bg-white dark:bg-secondary-900 border rounded-2xl p-5 shadow-xs transition-all hover:shadow-md ${
        p().isPinned
          ? 'border-amber-300 dark:border-amber-600/50 bg-amber-50/15'
          : 'border-secondary-200 dark:border-secondary-800'
      }`}
    >
      {/* Top Header meta */}
      <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <Show when={p().isPinned}>
            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300">
              📌 Disematkan
            </span>
          </Show>

          <Show when={props.isManageMode}>{statusBadge()}</Show>

          {targetBadge()}

          <Show when={!props.isManageMode && p().isRead === false}>
            <span class="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500 text-white animate-pulse">
              BARU
            </span>
          </Show>
        </div>

        <div class="text-xs text-secondary-500 dark:text-secondary-400">
          <Show
            when={p().status === 'scheduled'}
            fallback={<span>Rilis: {formatDate(p().publishedAt || p().createdAt)}</span>}
          >
            <span class="text-sky-600 dark:text-sky-400 font-medium">Tayang: {formatDate(p().publishedAt)}</span>
          </Show>
        </div>
      </div>

      {/* Judul */}
      <h3
        onClick={() => props.onClick?.()}
        class={`text-lg font-bold text-secondary-900 dark:text-white tracking-tight mb-2 hover:text-[#0066cc] dark:hover:text-[#2997ff] transition-colors ${
          props.onClick ? 'cursor-pointer' : ''
        }`}
      >
        {p().judul}
      </h3>

      {/* Author & Context info */}
      <div class="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400 mb-4">
        <span>
          Oleh: <strong class="text-secondary-700 dark:text-secondary-200">{p().authorNama || 'Pengelola'}</strong>
        </span>
        <span>•</span>
        <span class="uppercase tracking-wide font-semibold text-[10px] px-1.5 py-0.2 rounded bg-secondary-100 dark:bg-secondary-800">
          {p().authorRole}
        </span>
        <Show when={p().viewCount > 0}>
          <span>•</span>
          <span>👁️ {p().viewCount} dibaca</span>
        </Show>
      </div>

      {/* Content Preview / Viewer */}
      <div class="mb-4">
        <MarkdownViewer content={p().konten} class="line-clamp-4" />
      </div>

      {/* Lampiran List (if any) */}
      <Show when={p().lampiran && p().lampiran!.length > 0}>
        <div class="border-t border-secondary-100 dark:border-secondary-800/80 pt-3 mb-3">
          <div class="text-xs font-semibold text-secondary-600 dark:text-secondary-400 mb-2">Lampiran & Berkas:</div>
          <div class="flex flex-wrap gap-2">
            <For each={p().lampiran}>
              {(l: LampiranItem) => (
                <a
                  href={getAbsoluteStorageUrl(l.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 dark:hover:bg-secondary-700 text-secondary-800 dark:text-secondary-200 transition-colors"
                >
                  <span>{l.tipe === 'link' ? '🔗' : l.tipe === 'gambar' ? '🖼️' : '📄'}</span>
                  <span class="max-w-[200px] truncate">{l.nama}</span>
                </a>
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Manage Action Buttons */}
      <Show when={props.isManageMode}>
        <div class="border-t border-secondary-100 dark:border-secondary-800/80 pt-3 flex items-center justify-end gap-2 flex-wrap">
          <Show when={p().status === 'published' || p().status === 'scheduled'}>
            <button
              type="button"
              onClick={() => props.onWithdraw?.(p().id)}
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
            >
              Tarik Pengumuman
            </button>
          </Show>

          <Show when={p().status === 'withdrawn'}>
            <button
              type="button"
              onClick={() => props.onPublishAgain?.(p())}
              class="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors"
            >
              Publikasikan Ulang
            </button>
          </Show>

          <button
            type="button"
            onClick={() => props.onEdit?.(p())}
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 dark:bg-secondary-800 dark:text-secondary-200 transition-colors"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => props.onDelete?.(p().id)}
            class="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            Hapus
          </button>
        </div>
      </Show>
    </div>
  );
}
