import {
  type CreateTugasAkhirInput,
  type ReviewTopikInput,
  TugasAkhirService,
  type UpdateTugasAkhirInput,
} from '../services/tugas-akhir.service';
import {
  type AccSidangInput,
  type CreateLogbookInput,
  type ReviewLogbookInput,
  TugasAkhirBimbinganService,
  type UpdateLogbookInput,
} from '../services/tugas-akhir-bimbingan.service';
import {
  type DaftarSidangInput,
  type FinalisasiSidangInput,
  type InputNilaiSidangInput,
  type JadwalSidangInput,
  TugasAkhirSidangService,
} from '../services/tugas-akhir-sidang.service';
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
  static async delete({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const res = await TugasAkhirService.delete(id, user);
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus tugas akhir' };
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getLogbooks({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const logbooks = await TugasAkhirBimbinganService.getLogbooks(id, user);
      return { data: logbooks };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil logbook bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async createLogbook({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const created = await TugasAkhirBimbinganService.createLogbook(id, body as CreateLogbookInput, user);
      set.status = 201;
      return { message: 'Logbook bimbingan berhasil dicatat', data: created };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mencatat logbook bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async updateLogbook({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const logbookId = parseInt(params.logbookId, 10);
      if (isNaN(id) || isNaN(logbookId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const updated = await TugasAkhirBimbinganService.updateLogbook(id, logbookId, body as UpdateLogbookInput, user);
      return { message: 'Logbook bimbingan berhasil diperbarui', data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui logbook bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async deleteLogbook({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const logbookId = parseInt(params.logbookId, 10);
      if (isNaN(id) || isNaN(logbookId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const res = await TugasAkhirBimbinganService.deleteLogbook(id, logbookId, user);
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menghapus logbook bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async reviewLogbook({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const logbookId = parseInt(params.logbookId, 10);
      if (isNaN(id) || isNaN(logbookId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const updated = await TugasAkhirBimbinganService.reviewLogbook(id, logbookId, body as ReviewLogbookInput, user);
      return { message: 'Review logbook bimbingan berhasil disimpan', data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mereview logbook bimbingan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async accSidang({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const res = await TugasAkhirBimbinganService.berikanAccSidang(id, body as AccSidangInput, user);
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memperbarui status ACC sidang' };
    }
  }

  // Milestone 3: Sidang Proposal & Sidang Akhir
  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getSidangList({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const sidangs = await TugasAkhirSidangService.getSidangList(id);
      return { data: sidangs };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil data sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async daftarSidang({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const created = await TugasAkhirSidangService.daftarSidang(id, body as DaftarSidangInput, user);
      set.status = 201;
      return { message: 'Pendaftaran sidang berhasil diajukan', data: created };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mendaftar sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async jadwalkanSidang({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const sidangId = parseInt(params.sidangId, 10);
      if (isNaN(id) || isNaN(sidangId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const scheduled = await TugasAkhirSidangService.jadwalkanSidang(id, sidangId, body as JadwalSidangInput, user);
      return { message: 'Jadwal sidang dan dewan penguji berhasil ditetapkan', data: scheduled };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menjadwalkan sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRubrikKriteria({ params, query, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
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

      const jenis = (query as Record<string, string | undefined>).jenis || 'proposal';
      const kriteria = await TugasAkhirSidangService.getRubrikKriteria(id, jenis);
      return { data: kriteria };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengambil kriteria rubrik' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async inputNilaiSidang({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const sidangId = parseInt(params.sidangId, 10);
      if (isNaN(id) || isNaN(sidangId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const res = await TugasAkhirSidangService.inputNilaiPenguji(id, sidangId, body as InputNilaiSidangInput, user);
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal menginput nilai sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async finalisasiSidang({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const sidangId = parseInt(params.sidangId, 10);
      if (isNaN(id) || isNaN(sidangId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const finalized = await TugasAkhirSidangService.finalisasiSidang(
        id,
        sidangId,
        body as FinalisasiSidangInput,
        user,
      );
      return { message: 'Hasil sidang berhasil difinalisasi', data: finalized };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memfinalisasi sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRekapNilaiSidang({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const sidangId = parseInt(params.sidangId, 10);
      if (isNaN(id) || isNaN(sidangId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const data = await TugasAkhirSidangService.getRekapNilaiSidang(id, sidangId);
      return { data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memuat rekap nilai sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async getRekapKolektifSidang({ query, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const q = query as {
        periodeId?: string;
        programStudiId?: string;
        jenisSidang?: 'proposal' | 'kemajuan' | 'akhir' | 'semua';
        statusHasil?: string;
      };

      const prodiId = q.programStudiId ? parseInt(q.programStudiId, 10) : undefined;

      const data = await TugasAkhirSidangService.getRekapKolektifSidang(
        {
          periodeId: q.periodeId,
          programStudiId: isNaN(prodiId as number) ? undefined : prodiId,
          jenisSidang: q.jenisSidang,
          statusHasil: q.statusHasil,
        },
        user,
      );

      return { data };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memuat rekap kolektif sidang' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async submitRevisiSidang({ params, body, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const sidangId = parseInt(params.sidangId, 10);
      if (isNaN(id) || isNaN(sidangId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const res = await TugasAkhirSidangService.submitRevisiNaskah(
        id,
        sidangId,
        body as { fileRevisiUrl: string; catatanMahasiswa?: string },
        user,
      );
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal mengirim berkas revisi' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement
  static async accRevisiPenguji({ params, set, getCurrentUser }: AuthContext<any, any, any>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Sesi tidak valid' };
      }

      const id = parseInt(params.id, 10);
      const sidangId = parseInt(params.sidangId, 10);
      const pengujiId = parseInt(params.pengujiId, 10);
      if (isNaN(id) || isNaN(sidangId) || isNaN(pengujiId)) {
        set.status = 400;
        return { error: 'Parameter ID tidak valid' };
      }

      const res = await TugasAkhirSidangService.accRevisiPenguji(id, sidangId, pengujiId, user);
      return res;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memverifikasi revisi penguji' };
    }
  }
}
