/**
 * Escape untrusted text for safe interpolation into an HTML template.
 * Used by outbound email templates (reset password & account activation) to
 * prevent HTML/attribute injection from user-controlled values (e.g. nama, URLs).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
