import { describe, expect, it } from 'bun:test';
import { escapeHtml } from '../utils/html-escape';

describe('escapeHtml', () => {
  it('escapes angle brackets, ampersands and quotes', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes ampersands first to avoid double-encoding issues', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('leaves safe plain text unchanged', () => {
    expect(escapeHtml('Hello, Nama Normal!')).toBe('Hello, Nama Normal!');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});
