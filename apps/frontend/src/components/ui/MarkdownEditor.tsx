import { createSignal, Show } from 'solid-js';
import { pengumumanController } from '../../controllers/pengumumanController';
import { getAbsoluteStorageUrl } from '../../utils/api';
import { MarkdownViewer } from './MarkdownViewer';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}

export function MarkdownEditor(props: MarkdownEditorProps) {
  const [tab, setTab] = createSignal<'write' | 'preview'>('write');
  const [isUploading, setIsUploading] = createSignal(false);
  let textareaRef: HTMLTextAreaElement | undefined;
  let fileInputRef: HTMLInputElement | undefined;

  const insertText = (before: string, after = '') => {
    if (!textareaRef) return;
    const start = textareaRef.selectionStart;
    const end = textareaRef.selectionEnd;
    const current = props.value || '';
    const selected = current.substring(start, end);
    const replacement = `${before}${selected || 'teks'}${after}`;
    const next = current.substring(0, start) + replacement + current.substring(end);
    props.onChange(next);

    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
        textareaRef.setSelectionRange(start + before.length, start + before.length + (selected || 'teks').length);
      }
    }, 0);
  };

  const handleImageUpload = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await pengumumanController.uploadAttachment(file);
      const absUrl = getAbsoluteStorageUrl(res.url);
      insertText(`\n![${res.nama}](${absUrl})\n`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengunggah gambar');
    } finally {
      setIsUploading(false);
      if (input) input.value = '';
    }
  };

  return (
    <div class="border border-secondary-200 dark:border-secondary-700 rounded-xl overflow-hidden bg-white dark:bg-secondary-900 transition-colors">
      {/* Editor Header Toolbar */}
      <div class="flex items-center justify-between border-b border-secondary-200 dark:border-secondary-800 bg-secondary-50/70 dark:bg-secondary-800/40 px-3 py-2 flex-wrap gap-2">
        {/* Tab switchers */}
        <div class="flex items-center gap-1 bg-secondary-200/60 dark:bg-secondary-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('write')}
            class={`px-3 py-1 rounded-md transition-all ${
              tab() === 'write'
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-xs font-semibold'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
            }`}
          >
            Tulis
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            class={`px-3 py-1 rounded-md transition-all ${
              tab() === 'preview'
                ? 'bg-white dark:bg-secondary-700 text-secondary-900 dark:text-white shadow-xs font-semibold'
                : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-white'
            }`}
          >
            Pratinjau
          </button>
        </div>

        {/* Toolbar formatting buttons (visible in write mode) */}
        <Show when={tab() === 'write'}>
          <div class="flex items-center gap-1 flex-wrap text-secondary-600 dark:text-secondary-300">
            <button
              type="button"
              title="Tebal (Ctrl+B)"
              onClick={() => insertText('**', '**')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs font-bold"
            >
              B
            </button>
            <button
              type="button"
              title="Miring (Ctrl+I)"
              onClick={() => insertText('*', '*')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs italic"
            >
              I
            </button>
            <button
              type="button"
              title="Coret"
              onClick={() => insertText('~~', '~~')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs line-through"
            >
              S
            </button>
            <div class="h-4 w-px bg-secondary-300 dark:bg-secondary-700 mx-1" />
            <button
              type="button"
              title="Judul 1"
              onClick={() => insertText('# ')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs font-bold"
            >
              H1
            </button>
            <button
              type="button"
              title="Judul 2"
              onClick={() => insertText('## ')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs font-bold"
            >
              H2
            </button>
            <button
              type="button"
              title="Judul 3"
              onClick={() => insertText('### ')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs font-bold"
            >
              H3
            </button>
            <div class="h-4 w-px bg-secondary-300 dark:bg-secondary-700 mx-1" />
            <button
              type="button"
              title="Daftar Poin"
              onClick={() => insertText('- ')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs"
            >
              • List
            </button>
            <button
              type="button"
              title="Daftar Nomor"
              onClick={() => insertText('1. ')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs"
            >
              1. List
            </button>
            <button
              type="button"
              title="Kutipan"
              onClick={() => insertText('> ')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs"
            >
              " Quote
            </button>
            <button
              type="button"
              title="Kode"
              onClick={() => insertText('`', '`')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs font-mono"
            >
              &lt;/&gt;
            </button>
            <button
              type="button"
              title="Tabel"
              onClick={() => insertText('\n| Kolom 1 | Kolom 2 |\n| --- | --- |\n| Data 1 | Data 2 |\n')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs"
            >
              Tabel
            </button>
            <button
              type="button"
              title="Sisipkan Tautan"
              onClick={() => insertText('[Judul Link](', 'https://...)')}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs"
            >
              🔗 Link
            </button>

            {/* Inline image upload button */}
            <input type="file" ref={fileInputRef} accept="image/*" class="hidden" onChange={handleImageUpload} />
            <button
              type="button"
              disabled={isUploading()}
              title="Unggah & Sisipkan Gambar Inline"
              onClick={() => fileInputRef?.click()}
              class="p-1.5 hover:bg-secondary-200/60 dark:hover:bg-secondary-700 rounded text-xs flex items-center gap-1 text-[#0066cc] dark:text-[#2997ff]"
            >
              {isUploading() ? 'Mengunggah...' : '🖼️ Gambar'}
            </button>
          </div>
        </Show>
      </div>

      {/* Editor Body */}
      <div class="p-3">
        <Show
          when={tab() === 'write'}
          fallback={
            <div class="min-h-[220px] max-h-[480px] overflow-y-auto p-2 border border-dashed border-secondary-200 dark:border-secondary-800 rounded-lg">
              <Show
                when={props.value.trim()}
                fallback={
                  <p class="text-secondary-400 italic text-sm">
                    Belum ada teks markdown. Mulai ketik di tab "Tulis" untuk melihat pratinjau.
                  </p>
                }
              >
                <MarkdownViewer content={props.value} />
              </Show>
            </div>
          }
        >
          <textarea
            ref={textareaRef}
            rows={props.rows || 10}
            value={props.value}
            onInput={(e) => props.onChange(e.currentTarget.value)}
            placeholder={
              props.placeholder ||
              'Tuliskan isi pengumuman dalam format Markdown (gunakan toolbar di atas untuk memformat)...'
            }
            class="w-full bg-transparent border-0 focus:outline-hidden focus:ring-0 text-sm font-sans leading-relaxed text-secondary-900 dark:text-white resize-y placeholder:text-secondary-400"
          />
        </Show>
      </div>
    </div>
  );
}
