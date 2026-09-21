const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  ok: boolean;
  error?: string;
}

/**
 * Verifikasi token Cloudflare Turnstile dari frontend.
 *
 * - Test: selalu lolos (tidak ada fetch eksternal).
 * - Token kosong → gagal (fail-closed) selama secret dikonfigurasi; di
 *   production, secret kosong pun gagal eksplisit (jangan bypass diam-diam).
 * - Di luar production tanpa secret, verifikasi dilewati agar development/
 *   staging tidak terblokir sebelum key diisi.
 */
export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<TurnstileVerifyResult> {
  if (process.env.NODE_ENV === 'test') return { ok: true };

  const secret = process.env.TURNSTILE_SECRET_KEY;
  const tokenTrimmed = token?.trim() ?? '';

  if (!tokenTrimmed) {
    return { ok: false, error: 'Verifikasi keamanan belum diselesaikan. Silakan selesaikan captcha lalu coba lagi.' };
  }

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      return { ok: false, error: 'Layanan verifikasi keamanan (Turnstile) belum dikonfigurasi pada server.' };
    }
    return { ok: true };
  }

  try {
    const params = new URLSearchParams({ secret, response: tokenTrimmed });
    if (ip) params.set('remoteip', ip);
    const res = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success === true) return { ok: true };
    console.error('[Turnstile] Verify rejected:', JSON.stringify(data['error-codes'] ?? []));
    return { ok: false, error: 'Verifikasi keamanan gagal. Silakan coba lagi.' };
  } catch (e: unknown) {
    console.error('[Turnstile] Verify error:', e instanceof Error ? e.message : e);
    return { ok: false, error: 'Layanan verifikasi keamanan sedang bermasalah. Silakan coba lagi.' };
  }
}
