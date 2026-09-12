import { createSignal, Show } from 'solid-js';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MarkdownViewer } from './MarkdownViewer';

interface RichMarkdownEditorProps {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  disabled?: boolean;
  class?: string;
  onUploadAttachment?: (file: File) => Promise<{ fileName: string; fileUrl: string } | null>;
  uploadingAttachment?: boolean;
  maxAttachmentMb?: number;
}

const TOOLBAR_BTN =
  'px-2 py-1 rounded-md text-fine font-bold text-secondary-600 hover:bg-secondary-100 active:scale-95 transition-all disabled:opacity-40 dark:text-secondary-300 dark:hover:bg-secondary-700';

export function RichMarkdownEditor(props: RichMarkdownEditorProps) {
  const [tab, setTab] = createSignal<'write' | 'preview'>('write');
  const [fullscreen, setFullscreen] = createSignal(false);
  let ref: HTMLTextAreaElement | undefined;

  const insert = (before: string, after = '', fallback = 'teks') => {
    const el = ref;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const value = props.value;
    const selected = value.slice(start, end) || fallback;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    props.onInput(next);
    queueMicrotask(() => {
      el.focus();
      const pos = start + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const prefixLine = (prefix: string) => {
    const el = ref;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const value = props.value;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineEndIdx = value.indexOf('\n', start);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const line = value.slice(lineStart, lineEnd);
    const nextLine = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
    props.onInput(value.slice(0, lineStart) + nextLine + value.slice(lineEnd));
  };

  const insertText = (text: string) => {
    const el = ref;
    if (!el) return;
    const start = el.selectionStart ?? props.value.length;
    const end = el.selectionEnd ?? start;
    props.onInput(props.value.slice(0, start) + text + props.value.slice(end));
    queueMicrotask(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const handleFileSelected = async (e: Event & { currentTarget: HTMLInputElement }) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    try {
      if (props.onUploadAttachment) {
        const res = await props.onUploadAttachment(file);
        if (res) {
          const fullUrl = getAbsoluteStorageUrl(res.fileUrl);
          insertText(`\n[📄 File ${res.fileName}](${fullUrl})\n`);
        }
      } else {
        const fallbackUrl = getAbsoluteStorageUrl('/storage/...');
        insertText(`\n[📄 File Namafile](${fallbackUrl})\n`);
      }
    } finally {
      e.currentTarget.value = '';
    }
  };

  const wrapClass = () =>
    'w-full bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl px-3 py-2.5 text-caption text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all';

  const renderToolbar = () => (
    <div class="flex items-center justify-between gap-1 px-2 py-1.5 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 shrink-0">
      <div class="flex items-center gap-0.5 flex-wrap">
        <button
          type="button"
          class={TOOLBAR_BTN}
          title="Bold"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            insert('**', '**');
          }}
        >
          B
        </button>
        <button
          type="button"
          class={`${TOOLBAR_BTN} italic`}
          title="Italic"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            insert('*', '*');
          }}
        >
          I
        </button>
        <button
          type="button"
          class={TOOLBAR_BTN}
          title="Heading"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            prefixLine('# ');
          }}
        >
          H
        </button>
        <button
          type="button"
          class={TOOLBAR_BTN}
          title="List"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            prefixLine('- ');
          }}
        >
          • List
        </button>
        <button
          type="button"
          class={TOOLBAR_BTN}
          title="Quote"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            prefixLine('> ');
          }}
        >
          ❝
        </button>
        <button
          type="button"
          class={`${TOOLBAR_BTN} font-mono`}
          title="Code"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            insert('`', '`', 'kode');
          }}
        >
          {'</>'}
        </button>
        <button
          type="button"
          class={TOOLBAR_BTN}
          title="Link"
          disabled={props.disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            insert('[', '](https://)', 'tautan');
          }}
        >
          🔗
        </button>
        <label
          class={`${TOOLBAR_BTN} cursor-pointer inline-flex items-center gap-1`}
          title={
            props.maxAttachmentMb
              ? `Sisipkan Lampiran Berkas (maks ${props.maxAttachmentMb} MB)`
              : 'Sisipkan Lampiran Berkas'
          }
        >
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            class="hidden"
            disabled={props.disabled || props.uploadingAttachment}
            onChange={handleFileSelected}
          />
          {props.uploadingAttachment ? '⏳' : '📎 File'}
        </label>
      </div>

      <div class="flex items-center gap-0.5">
        <button
          type="button"
          class={`px-2 py-1 rounded-md text-fine font-bold transition-all ${tab() === 'write' ? 'bg-brand-600 text-white' : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'}`}
          onClick={() => setTab('write')}
        >
          Tulis
        </button>
        <button
          type="button"
          class={`px-2 py-1 rounded-md text-fine font-bold transition-all ${tab() === 'preview' ? 'bg-brand-600 text-white' : 'text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700'}`}
          onClick={() => setTab('preview')}
        >
          Pratinjau
        </button>
        <button
          type="button"
          data-testid="rme-fullscreen-toggle"
          class={TOOLBAR_BTN}
          title={fullscreen() ? 'Keluar layar penuh' : 'Layar penuh'}
          aria-label={fullscreen() ? 'Keluar layar penuh' : 'Layar penuh'}
          onClick={() => setFullscreen(!fullscreen())}
        >
          {fullscreen() ? '✕' : '⛶'}
        </button>
      </div>
    </div>
  );

  const renderBody = () => (
    <Show
      when={tab() === 'write'}
      fallback={
        <div
          class={`px-3 py-2.5 bg-white dark:bg-secondary-900 ${fullscreen() ? 'flex-1 min-h-0 overflow-y-auto' : 'min-h-[72px]'}`}
        >
          <Show
            when={props.value.trim()}
            fallback={<span class="text-caption text-secondary-400 italic">Belum ada konten untuk dipratinjau.</span>}
          >
            <MarkdownViewer content={props.value} />
          </Show>
        </div>
      }
    >
      <textarea
        ref={ref}
        rows={fullscreen() ? undefined : props.rows || 4}
        disabled={props.disabled}
        value={props.value}
        onInput={(e) => props.onInput(e.currentTarget.value)}
        placeholder={
          props.placeholder ||
          'Tulis di sini... Mendukung **bold**, *italic*, - list, > quote, `code`, dan [tautan](https://...).'
        }
        class={
          fullscreen()
            ? 'w-full flex-1 min-h-0 resize-none bg-white dark:bg-secondary-900 px-3 py-2.5 text-caption text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none'
            : `${wrapClass()} border-0 rounded-none focus:ring-0 resize-y`
        }
      />
    </Show>
  );

  return (
    <>
      <Show
        when={fullscreen()}
        fallback={
          <div class={`flex flex-col gap-1.5 ${props.class || ''}`}>
            <Show when={props.label}>
              <label class="block text-caption font-semibold text-secondary-600 dark:text-secondary-300">
                {props.label}
              </label>
            </Show>
            <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
              {renderToolbar()}
              {renderBody()}
            </div>
          </div>
        }
      >
        <div
          data-testid="rme-fullscreen"
          class="fixed inset-0 z-[61] bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-8 print:hidden"
          onClick={() => setFullscreen(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              setFullscreen(false);
            }
          }}
        >
          <div
            class="flex flex-col w-full max-w-5xl h-full max-h-[92vh] bg-white dark:bg-secondary-900 rounded-2xl border border-secondary-200 dark:border-secondary-800 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <Show when={props.label}>
              <div class="px-4 pt-3 text-caption font-semibold text-secondary-600 dark:text-secondary-300 shrink-0">
                {props.label}
              </div>
            </Show>
            {renderToolbar()}
            {renderBody()}
          </div>
        </div>
      </Show>
    </>
  );
}
