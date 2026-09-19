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
 * Cookie-only: token JWT tidak lagi disimpan di client. Sliding refresh tetap
 * berlangsung di backend via cookie; event `simak:token-refresh` hanya membawa
 * `exp` (epoch detik) agar AuthContext bisa menjadwalkan ulang timer idle.
 */
export function emitTokenRefresh(exp: number): void {
  window.dispatchEvent(new CustomEvent('simak:token-refresh', { detail: { exp } }));
}

/**
 * Membaca header respons X-Refresh-Token dan membagikan `exp`-nya (bila ada,
 * hanya untuk respons OK) agar timer idle bisa dijadwalkan ulang tanpa
 * menyimpan token di localStorage.
 */
export function applyRefreshedToken(response: Response): void {
  if (!response.ok) return;
  const refreshed = response.headers.get('X-Refresh-Token');
  if (!refreshed) return;
  const exp = decodeTokenExp(refreshed);
  if (typeof exp === 'number' && Number.isFinite(exp)) emitTokenRefresh(exp);
}
