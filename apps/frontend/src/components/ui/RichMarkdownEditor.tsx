import { createSignal, Show } from 'solid-js';
import { API_URL } from '../../utils/api';
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
        if (res) insertText(`\n[📄 File ${res.fileName}](${API_URL}${res.fileUrl})\n`);
      } else {
        insertText('\n[📄 File Namafile](/api/storage/...)\n');
      }
    } finally {
      e.currentTarget.value = '';
    }
  };

  const wrapClass = () =>
    'w-full bg-white dark:bg-secondary-900 border border-secondary-200 dark:border-secondary-700 rounded-xl px-3 py-2.5 text-caption text-secondary-900 dark:text-white placeholder:text-secondary-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all';

  return (
    <div class={`flex flex-col gap-1.5 ${props.class || ''}`}>
      <Show when={props.label}>
        <label class="block text-caption font-semibold text-secondary-600 dark:text-secondary-300">{props.label}</label>
      </Show>

      <div class="rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div class="flex items-center justify-between gap-1 px-2 py-1.5 bg-secondary-50 dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700">
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
          </div>
        </div>

        <Show
          when={tab() === 'write'}
          fallback={
            <div class="min-h-[72px] px-3 py-2.5 bg-white dark:bg-secondary-900">
              <Show
                when={props.value.trim()}
                fallback={
                  <span class="text-caption text-secondary-400 italic">Belum ada konten untuk dipratinjau.</span>
                }
              >
                <MarkdownViewer content={props.value} />
              </Show>
            </div>
          }
        >
          <textarea
            ref={ref}
            rows={props.rows || 4}
            disabled={props.disabled}
            value={props.value}
            onInput={(e) => props.onInput(e.currentTarget.value)}
            placeholder={
              props.placeholder ||
              'Tulis di sini... Mendukung **bold**, *italic*, - list, > quote, `code`, dan [tautan](https://...).'
            }
            class={`${wrapClass()} border-0 rounded-none focus:ring-0 resize-y`}
          />
        </Show>
      </div>
    </div>
  );
}
