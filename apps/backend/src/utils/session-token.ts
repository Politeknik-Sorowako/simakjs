import { SystemParameterService } from '../services/system-parameter.service';

export interface SessionClaims {
  exp?: number;
  sessEpoch?: number;
}

/**
 * Fail-closed validasi klaim sesi:
 * - wajib memuat `exp` numerik yang belum lewat,
 * - wajib memuat `sessEpoch` >= epoch aktif (kill-switch).
 * Dipakai bersama oleh middleware, hook sliding-refresh, WS, dan endpoint storage.
 */
export async function isSessionClaimsValid(claims: SessionClaims | null | undefined | false): Promise<boolean> {
  if (!claims) return false;
  if (typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return false;
  const currentEpoch = await SystemParameterService.getSessionEpoch();
  if (typeof claims.sessEpoch !== 'number' || claims.sessEpoch < currentEpoch) return false;
  return true;
}
