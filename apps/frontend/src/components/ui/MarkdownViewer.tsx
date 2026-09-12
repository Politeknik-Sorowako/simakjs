import { createMemo } from 'solid-js';

interface MarkdownViewerProps {
  content?: string | null;
  class?: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeUrl(url: string): string | null {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^\//i.test(trimmed)) return trimmed;
  return null;
}

function renderInline(text: string): string {
  let out = text;
  // Inline code first (protect from other formatting)
  out = out.replace(/`([^`]+)`/g, (_m, code) => `<code>${code}</code>`);
  // Bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // Links [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, url) => {
    const safe = sanitizeUrl(String(url));
    if (!safe) return label;
    return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${label}</a>`;
  });
  return out;
}

/**
 * Parser Markdown ringan & aman (escape HTML lebih dulu, hanya tag tepercaya yang dihasilkan).
 * Mendukung: heading, blockquote, list, code block, bold, italic, inline code, link.
 */
export function renderMarkdown(markdown: string): string {
  const escaped = escapeHtml(markdown.replace(/\r\n/g, '\n'));
  const lines = escaped.split('\n');
  const html: string[] = [];
  let inCode = false;
  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      html.push(`<p>${paragraph.map((l) => renderInline(l)).join('<br/>')}</p>`);
      paragraph = [];
    }
  };
  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };
  const closeQuote = () => {
    if (inQuote) {
      html.push('</blockquote>');
      inQuote = false;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      flushParagraph();
      closeLists();
      closeQuote();
      if (inCode) {
        html.push('</code></pre>');
        inCode = false;
      } else {
        html.push('<pre><code>');
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      html.push(`${line}\n`);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      closeLists();
      closeQuote();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      closeLists();
      closeQuote();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const quote = line.match(/^&gt;\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeLists();
      if (!inQuote) {
        html.push('<blockquote>');
        inQuote = true;
      }
      html.push(`<p>${renderInline(quote[1])}</p>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ul) {
      flushParagraph();
      closeQuote();
      if (!inUl) {
        closeLists();
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ol) {
      flushParagraph();
      closeQuote();
      if (!inOl) {
        closeLists();
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${renderInline(ol[1])}</li>`);
      continue;
    }

    closeLists();
    closeQuote();
    paragraph.push(line);
  }

  if (inCode) html.push('</code></pre>');
  flushParagraph();
  closeLists();
  closeQuote();

  return html.join('\n');
}

export function MarkdownViewer(props: MarkdownViewerProps) {
  const html = createMemo(() => (props.content ? renderMarkdown(props.content) : ''));
  return (
    <div class={`markdown-viewer text-caption leading-relaxed break-words ${props.class || ''}`} innerHTML={html()} />
  );
}
