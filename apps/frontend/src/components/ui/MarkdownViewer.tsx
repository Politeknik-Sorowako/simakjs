import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { createMemo } from 'solid-js';

export interface MarkdownViewerProps {
  content?: string | null;
  class?: string;
}

export function stripMarkdown(markdown?: string | null): string {
  if (!markdown) return '';
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function renderMarkdown(markdown: string): string {
  try {
    const parsed = marked.parse(markdown, {
      async: false,
      gfm: true,
      breaks: true,
    }) as string;
    return DOMPurify.sanitize(parsed, {
      ADD_ATTR: ['target', 'rel'],
    });
  } catch {
    return markdown;
  }
}

export function MarkdownViewer(props: MarkdownViewerProps) {
  const renderedHtml = createMemo(() => {
    const raw = props.content || '';
    if (!raw.trim()) return '';
    return renderMarkdown(raw);
  });

  return (
    <div
      class={`prose dark:prose-invert max-w-none text-secondary-800 dark:text-secondary-100 text-[15px] leading-relaxed break-words
        prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-secondary-900 dark:prose-headings:text-white
        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:my-2.5
        prose-a:text-[#0066cc] dark:prose-a:text-[#2997ff] prose-a:underline hover:prose-a:opacity-80
        prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:bg-secondary-100 dark:prose-code:bg-secondary-800 prose-code:text-[13px]
        prose-pre:bg-secondary-900 prose-pre:text-white prose-pre:p-3 prose-pre:rounded-xl
        prose-blockquote:border-l-4 prose-blockquote:border-[#0066cc] prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-secondary-600 dark:prose-blockquote:text-secondary-400
        prose-img:rounded-xl prose-img:shadow-sm prose-img:max-h-96 prose-img:object-contain
        prose-table:border-collapse prose-th:border-b prose-th:border-secondary-200 dark:prose-th:border-secondary-700 prose-th:p-2 prose-td:p-2 prose-td:border-b prose-td:border-secondary-100 dark:prose-td:border-secondary-800
        ${props.class || ''}`}
      innerHTML={renderedHtml()}
    />
  );
}
