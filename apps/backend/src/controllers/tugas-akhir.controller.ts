import {
  type CreateTugasAkhirInput,
  type ReviewTopikInput,
  TugasAkhirService,
  type UpdateTugasAkhirInput,
} from '../services/tugas-akhir.service';
import type { AuthContext } from '../utils/types';

export class TugasAkhirController {
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getAll({ query, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const q = query as Record<string, string | undefined>;
      const result = await TugasAkhirService.getAll(
        {
          page: q.page ? parseInt(q.page, 10) : undefined,
          limit: q.limit ? parseInt(q.limit, 10) : undefined,
          search: q.search,
          status: q.status,
          programStudiId: q.programStudiId ? parseInt(q.programStudiId, 10) : undefined,
          periodeId: q.periodeId,
          tipe: q.tipe,
          dosenId: q.dosenId ? parseInt(q.dosenId, 10) : undefined,
        },
        user,
      );

      return result;
    } catch (e: unknown) {
      set.status = 500;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil data tugas akhir' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getById({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID tugas akhir tidak valid' };
      }

      const ta = await TugasAkhirService.getById(id, user);
      return { data: ta };
    } catch (e: unknown) {
      set.status = 404;
      return { error: e instanceof Error ? e.message : 'Tugas akhir tidak ditemukan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async create({ body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const created = await TugasAkhirService.create(body as CreateTugasAkhirInput, user);
      set.status = 201;
      return { message: 'Pengusulan topik tugas akhir berhasil diajukan', data: created };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengajukan topik tugas akhir' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async update({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID tugas akhir tidak valid' };
      }

      const updated = await TugasAkhirService.update(id, body as UpdateTugasAkhirInput, user);
      return { message: 'Data tugas akhir berhasil diperbarui', data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui data tugas akhir' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async reviewTopik({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID tugas akhir tidak valid' };
      }

      const reviewed = await TugasAkhirService.reviewTopik(id, body as ReviewTopikInput, user);
      return { message: `Status topik tugas akhir berhasil diubah menjadi: ${reviewed.status}`, data: reviewed };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mereview topik tugas akhir' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async overrideStatus({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID tugas akhir tidak valid' };
      }

      const b = body as { keStatus: string; alasan: string };
      const overridden = await TugasAkhirService.overrideStatus(id, b.keStatus, b.alasan, user);
      return { message: `Status tugas akhir berhasil di-override ke: ${overridden.status}`, data: overridden };
    } catch (e: unknown) {
      set.status = 403;
      return { error: e instanceof Error ? e.message : 'Gagal melakukan override status tugas akhir' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async responUndangan({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      if (isNaN(id)) {
        set.status = 400;
        return { error: 'ID tugas akhir tidak valid' };
      }

      const b = body as { statusKonfirmasi: 'diterima' | 'ditolak' };
      const res = await TugasAkhirService.responUndangan(id, b.statusKonfirmasi, user);
      return { message: `Undangan anggota tim berhasil direspon: ${b.statusKonfirmasi}`, data: res };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal merespon undangan' };
    }
  }
}
