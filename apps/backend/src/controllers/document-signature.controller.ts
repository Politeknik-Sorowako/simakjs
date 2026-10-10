import { DocumentSignatureService } from '../services/document-signature.service';
import { MahasiswaService } from '../services/mahasiswa.service';
import { ProdiScopeService } from '../services/prodi-scope.service';
import { hasRole } from '../utils/role';
import { type AuthContext } from '../utils/types';

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
      return await DocumentSignatureService.signKhs({ mhsId, periodeId, requestedByUserId: user.id });
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
        verifyUrl: `${process.env.VERIFY_BASE_URL || 'https://verify.politekniksorowako.ac.id'}/v/${row.verifyUuid}`,
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async verify({ params, set }: { params: { uuid: string }; set: any }): Promise<any> {
    try {
      const result = await DocumentSignatureService.verify(params.uuid);
      set.headers['Cache-Control'] = 'public, max-age=60';
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
