import { DocumentSignatureService } from '../services/document-signature.service';
import { MahasiswaService } from '../services/mahasiswa.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { getVerifyBaseUrl } from '../utils/document-signing';
import { hasRole } from '../utils/role';
import { verifyTurnstile } from '../utils/turnstile';
import { type AuthContext } from '../utils/types';

// Rate limit verifikasi publik per-IP — proteksi tambahan terhadap enumerasi
// UUID brute-force. Ringan (30/menit) karena endpoint bersifat baca publik.
const VERIFY_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VERIFY_MAX_ATTEMPTS = 30;
const verifyRateLimit = new Map<string, { count: number; resetTime: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

function checkVerifyRateLimit(request: Request): { limited: boolean; retryAfter?: number } {
  if (process.env.NODE_ENV === 'test') return { limited: false };
  const key = getClientIp(request);
  const now = Date.now();
  const record = verifyRateLimit.get(key);
  if (!record || now >= record.resetTime) {
    verifyRateLimit.set(key, { count: 1, resetTime: now + VERIFY_RATE_LIMIT_WINDOW_MS });
    return { limited: false };
  }
  record.count++;
  if (record.count > VERIFY_MAX_ATTEMPTS) {
    return { limited: true, retryAfter: Math.max(1, Math.ceil((record.resetTime - now) / 1000)) };
  }
  return { limited: false };
}

// Bersihkan entri kedaluwarsa agar Map tidak bocor tak terbatas.
let verifyRateLimitSweepTimer: ReturnType<typeof setInterval> | undefined;
function ensureVerifyRateLimitSweep() {
  if (verifyRateLimitSweepTimer) return;
  verifyRateLimitSweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of verifyRateLimit) {
      if (now >= record.resetTime) verifyRateLimit.delete(key);
    }
  }, VERIFY_RATE_LIMIT_WINDOW_MS);
  if (verifyRateLimitSweepTimer.unref) verifyRateLimitSweepTimer.unref();
}

async function mahasiswaInScope(
  user: NonNullable<Awaited<ReturnType<AuthContext['getCurrentUser']>>>,
  mhsId: number,
): Promise<boolean> {
  if (hasRole(user, ['super_admin', 'admin'])) return true;
  const mhs = await MahasiswaService.getById(mhsId);
  if (!mhs?.programStudiId) return false;
  return ProdiScopeService.canAccessProdi(user, mhs.programStudiId);
}

export class DocumentSignatureController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async signKhs({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const mhsId = parseInt(params.mhsId);
    const periodeId = params.periodeId;
    if (Number.isNaN(mhsId) || !periodeId) {
      set.status = 400;
      return { error: 'ID Mahasiswa / Periode tidak valid.' };
    }

    // Otorisasi: mahasiswa hanya untuk dirinya sendiri; staf sesuai scope; admin bebas.
    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== mhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat menandatangani KHS Anda sendiri.' };
      }
    } else if (!(await mahasiswaInScope(user, mhsId))) {
      set.status = 403;
      return { error: 'Akses ditolak. Mahasiswa berada di luar scope Anda.' };
    }

    try {
      return await DocumentSignatureService.signKhs({ mhsId, periodeId });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menandatangani KHS.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getByRef({ params, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }

    const mhsId = parseInt(params.mhsId);
    const periodeId = params.periodeId;
    if (Number.isNaN(mhsId) || !periodeId) {
      set.status = 400;
      return { error: 'ID Mahasiswa / Periode tidak valid.' };
    }

    if (hasRole(user, ['mahasiswa'])) {
      const myMhsId = await MahasiswaService.getMahasiswaIdByEmail(user.email);
      if (!myMhsId || myMhsId !== mhsId) {
        set.status = 403;
        return { error: 'Akses ditolak. Anda hanya dapat melihat tanda tangan KHS Anda sendiri.' };
      }
    } else if (!(await mahasiswaInScope(user, mhsId))) {
      set.status = 403;
      return { error: 'Akses ditolak. Mahasiswa berada di luar scope Anda.' };
    }

    try {
      const row = await DocumentSignatureService.getByRef('KHS', `khs:${mhsId}:${periodeId}`);
      if (!row) return null;
      return {
        verifyUuid: row.verifyUuid,
        verifyUrl: `${getVerifyBaseUrl()}/v/${row.verifyUuid}`,
        docHash: row.docHash,
        kid: row.kid,
        signedAt: row.signedAt.toISOString(),
        signerNama: row.signerNama,
        signerJabatan: row.signerJabatan,
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil tanda tangan.' };
    }
  }

  static async verify({
    body,
    set,
    request,
  }: {
    body: { uuid: string; turnstileToken?: string };
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
    set: any;
    request: Request;
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }): Promise<any> {
    // Antibot + rate limit SEBELUM query DB: tolak mesin tanpa membocorkan
    // status dokumen apa pun.
    ensureVerifyRateLimitSweep();
    const rate = checkVerifyRateLimit(request);
    if (rate.limited) {
      set.status = 429;
      return {
        status: 'NOT_FOUND',
        error: `Terlalu banyak permintaan verifikasi. Coba lagi dalam ${rate.retryAfter} detik.`,
      };
    }

    const turnstile = await verifyTurnstile(body.turnstileToken, getClientIp(request));
    if (!turnstile.ok) {
      set.status = 400;
      return { status: 'NOT_FOUND', error: turnstile.error };
    }

    try {
      const result = await DocumentSignatureService.verify(body.uuid);
      if (result.status === 'NOT_FOUND') set.status = 404;
      if (result.status === 'REVOKED') set.status = 410;
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { status: 'NOT_FOUND', error: e instanceof Error ? e.message : 'Gagal memverifikasi dokumen.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async revoke({ params, body, set, getCurrentUser }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Silakan login terlebih dahulu.' };
    }
    if (!hasRole(user, ['admin', 'super_admin'])) {
      set.status = 403;
      return { error: 'Akses ditolak. Hanya Admin yang dapat mencabut tanda tangan.' };
    }
    try {
      await DocumentSignatureService.revoke(params.uuid, user.id, body.reason);
      return { success: true, message: 'Tanda tangan dokumen berhasil dicabut.' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mencabut tanda tangan.' };
    }
  }
}
