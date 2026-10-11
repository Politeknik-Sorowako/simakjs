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
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_]+)_/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
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
      class={`markdown-content markdown-viewer prose dark:prose-invert max-w-none text-secondary-800 dark:text-secondary-100 text-[15px] leading-relaxed break-words ${props.class || ''}`}
      innerHTML={renderedHtml()}
    />
  );
}
