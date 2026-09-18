function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Mendekode klaim `exp` (epoch detik) dari JWT tanpa memvalidasi signature. */
export function decodeTokenExp(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

/**
 * Menyimpan token hasil sliding refresh (X-Refresh-Token) ke localStorage
 * dan memberitahu AuthContext agar sinyal token diperbarui & timer idle dijadwalkan ulang.
 */
export function persistRefreshedToken(token: string): void {
  const current = localStorage.getItem('token');
  if (current === token) return;
  localStorage.setItem('token', token);
  window.dispatchEvent(new CustomEvent('simak:token-refresh', { detail: { token } }));
}

/** Membaca header respons X-Refresh-Token dan menerapkannya bila ada (hanya untuk respons OK). */
export function applyRefreshedToken(response: Response): void {
  if (!response.ok) return;
  const refreshed = response.headers.get('X-Refresh-Token');
  if (refreshed) persistRefreshedToken(refreshed);
}
