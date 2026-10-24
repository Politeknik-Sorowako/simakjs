import { DocumentSignatureService } from '../services/document-signature.service';
import { PelanggaranTindakLanjutService } from '../services/pelanggaran-tindak-lanjut.service';
import { isStaff } from '../utils/role';
import type { AuthContext } from '../utils/types';

export class PelanggaranTindakLanjutController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async list({ query, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }
      if (!isStaff(user)) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      return await PelanggaranTindakLanjutService.list(user, {
        status: query?.status,
        tingkat: query?.tingkat,
        periodeId: query?.periodeId,
        page: query?.page ? parseInt(query.page, 10) : 1,
        limit: query?.limit ? parseInt(query.limit, 10) : 20,
      });
    } catch (e: unknown) {
      console.error('[PelanggaranTindakLanjutController.list] Error:', e);
      set.status = 500;
      return { error: e instanceof Error ? e.message : 'Terjadi kesalahan sistem.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getById({ params, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }
      if (!isStaff(user)) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID kasus tidak valid.' };
      }

      return await PelanggaranTindakLanjutService.getById(user, id);
    } catch (e: unknown) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : 'Terjadi kesalahan sistem.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async submitForm({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }
      if (!isStaff(user)) {
        set.status = 403;
        return { error: 'Akses ditolak.' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID kasus tidak valid.' };
      }

      return await PelanggaranTindakLanjutService.submitForm(user, id, body);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menyimpan formulir.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async approve({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID kasus tidak valid.' };
      }

      const metode: 'TTE' | 'MANUAL' = body.metode || body.tipe || 'TTE';
      let signatureUuid: string | undefined = body.signatureUuid;

      // Jika metode TTE, tanda tangani dokumen snapshot
      if (metode === 'TTE') {
        const detail = await PelanggaranTindakLanjutService.getById(user, id);
        const docType =
          detail.tingkat === 'LEVEL_4'
            ? 'TL_BA_KOMDIS'
            : detail.tingkat === 'LEVEL_2'
              ? 'TL_PEMANGGILAN_ORTU'
              : 'TL_COACHING';

        const activeStep = detail.persetujuanList.find((p) => p.status === 'MENUNGGU');
        const approverRole = activeStep?.approverRole || user.role;

        const signerJabatan =
          approverRole === 'direktur'
            ? 'Direktur'
            : approverRole === 'wadir1'
              ? 'Wakil Direktur 1'
              : approverRole === 'wadir3'
                ? 'Wakil Direktur 3'
                : approverRole === 'kaprodi'
                  ? `Kaprodi ${detail.prodiNama || ''}`
                  : approverRole;

        const signRes = await DocumentSignatureService.signTindakLanjut(
          id,
          docType,
          approverRole,
          {
            userId: user.id,
            nama: user.nama,
            jabatan: signerJabatan,
          },
          {
            mahasiswaId: detail.mahasiswaId,
            nim: detail.nim,
            nama: detail.namaMahasiswa,
            prodi: detail.prodiNama,
            tingkat: detail.tingkat,
            periodeId: detail.periodeId,
            formCoaching: detail.formCoaching,
            suratPemanggilanOrtu: detail.suratPemanggilanOrtu,
            beritaAcaraSidang: detail.beritaAcaraSidang,
          },
        );

        signatureUuid = signRes.verifyUuid;
      }

      return await PelanggaranTindakLanjutService.approve(user, id, {
        metode,
        catatan: body.catatan,
        signatureUuid,
        dokumenScanUrl: body.dokumenScanUrl,
      });
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memberikan persetujuan.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async reject({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID kasus tidak valid.' };
      }

      const catatan = body.catatan || body.alasan || 'Permintaan revisi berkas';
      return await PelanggaranTindakLanjutService.reject(user, id, catatan);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menolak/meminta revisi.' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async batal({ params, body, set, getCurrentUser }: AuthContext<any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Silakan login terlebih dahulu.' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID kasus tidak valid.' };
      }

      return await PelanggaranTindakLanjutService.batal(user, id, body.alasan);
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal membatalkan kasus.' };
    }
  }
}
