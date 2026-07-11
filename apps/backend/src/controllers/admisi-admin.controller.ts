import { AdmisiAdminService } from '../services/admisi-admin.service';
import { programStudi, reRegistrationPayments } from '../models/schema';
import { db } from '../utils/db';
import { eq } from 'drizzle-orm';
import { AuthContext } from '../utils/types';

export class AdmisiAdminController {
  // ─── SESSIONS ────────────────────────────────────────────────────

  static async createSession({ body, set }: AuthContext<any>) {
    try {
      const session = await AdmisiAdminService.createSession(body);
      set.status = 201;
      return { message: 'Sesi admisi berhasil dibuat', sessionId: session.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateSession({ params, body, set }: AuthContext<any, { id: string }>) {
    try {
      await AdmisiAdminService.updateSession(Number(params.id), body);
      return { message: 'Sesi admisi berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getAllSessions() {
    const sessions = await AdmisiAdminService.getAllSessions();
    return { data: sessions };
  }

  static async getSessionDetail({ params }: AuthContext<any, { id: string }>) {
    const detail = await AdmisiAdminService.getSessionDetail(Number(params.id));
    return { data: detail };
  }

  // ─── SESSION PRODIS ──────────────────────────────────────────────

  static async addProdiToSession({ params, body, set }: AuthContext<any, { id: string }>) {
    try {
      await AdmisiAdminService.addProdiToSession(Number(params.id), body);
      set.status = 201;
      return { message: 'Program studi berhasil ditambahkan ke sesi' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async removeProdiFromSession({ params, set }: AuthContext<any, { id: string; prodiId: string }>) {
    try {
      await AdmisiAdminService.removeProdiFromSession(Number(params.id), Number(params.prodiId));
      return { message: 'Program studi berhasil dihapus dari sesi' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async toggleProdiActive({ params, set }: AuthContext<any, { id: string; prodiId: string }>) {
    try {
      const result = await AdmisiAdminService.toggleProdiActive(Number(params.id), Number(params.prodiId));
      return { message: result.isActive ? 'Prodi diaktifkan' : 'Prodi dinonaktifkan', isActive: result.isActive };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── DOCUMENT REQUIREMENTS ───────────────────────────────────────

  static async createDocumentRequirement({ body, set }: AuthContext<any>) {
    try {
      const req = await AdmisiAdminService.createDocumentRequirement(body);
      set.status = 201;
      return { message: 'Syarat dokumen berhasil dibuat', requirementId: req.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateDocumentRequirement({ params, body, set }: AuthContext<any, { id: string }>) {
    try {
      await AdmisiAdminService.updateDocumentRequirement(Number(params.id), body);
      return { message: 'Syarat dokumen berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async deleteDocumentRequirement({ params, set }: AuthContext<any, { id: string }>) {
    try {
      await AdmisiAdminService.deleteDocumentRequirement(Number(params.id));
      return { message: 'Syarat dokumen berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── APPLICATIONS ────────────────────────────────────────────────

  static async getApplications({ query }: AuthContext<any, any, { sessionId?: string; prodiId?: string; status?: string; search?: string; page?: string; limit?: string }>) {
    const result = await AdmisiAdminService.getApplications({
      sessionId: query.sessionId ? Number(query.sessionId) : undefined,
      prodiId: query.prodiId ? Number(query.prodiId) : undefined,
      status: query.status,
      search: query.search,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
    return result;
  }

  static async verifyDocument({ body, set }: AuthContext<{ documentId: number; isVerified: boolean; rejectionNote?: string }>) {
    try {
      // In real impl, adminId from context
      await AdmisiAdminService.verifyDocument(body.documentId, 1, body.isVerified, body.rejectionNote);
      return { message: body.isVerified ? 'Dokumen berhasil diverifikasi' : 'Dokumen ditolak' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateApplicationStatus({ params, body, set }: AuthContext<{ status: string; notes?: string }, { id: string }>) {
    try {
      await AdmisiAdminService.updateApplicationStatus(Number(params.id), body.status, 1, body.notes);
      return { message: `Status diubah ke ${body.status}` };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async reopenApplication({ params, set }: AuthContext<any, { id: string }>) {
    try {
      await AdmisiAdminService.updateApplicationStatus(Number(params.id), 'returned', 1, 'Admin membuka akses untuk melengkapi berkas');
      return { message: 'Akses dibuka, peserta dapat melengkapi berkas dan memperbaiki biodata' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── SELECTION COMPONENTS ────────────────────────────────────────

  static async createSelectionComponent({ body, set }: AuthContext<any>) {
    try {
      const comp = await AdmisiAdminService.createSelectionComponent(body);
      set.status = 201;
      return { message: 'Komponen penilaian berhasil dibuat', componentId: comp.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getSelectionComponents({ params }: AuthContext<any, { id: string }>) {
    const comps = await AdmisiAdminService.getSelectionComponents(Number(params.id));
    return { data: comps };
  }

  static async deleteSelectionComponent({ params, set }: AuthContext<any, { id: string }>) {
    try {
      await AdmisiAdminService.deleteSelectionComponent(Number(params.id));
      return { message: 'Komponen penilaian berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── SCORES ──────────────────────────────────────────────────────

  static async inputScore({ body, set }: AuthContext<{ applicationId: number; componentId: number; score: number; notes?: string }>) {
    try {
      await AdmisiAdminService.inputScore(body.applicationId, body.componentId, body.score, 1, body.notes);
      set.status = 201;
      return { message: 'Nilai berhasil disimpan' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── EXAM SCHEDULES ──────────────────────────────────────────────

  static async createExamSchedule({ body, set }: AuthContext<any>) {
    try {
      const schedule = await AdmisiAdminService.createExamSchedule(body);
      set.status = 201;
      return { message: 'Jadwal ujian berhasil dibuat', scheduleId: schedule.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getExamSchedules({ params }: AuthContext<any, { id: string }>) {
    const schedules = await AdmisiAdminService.getExamSchedules(Number(params.id));
    return { data: schedules };
  }

  // ─── RE-REGISTRATION ─────────────────────────────────────────────

  static async getPayments({ params }: any) {
    const appId = params?.applicationId ? Number(params.applicationId) : undefined;
    const payments = await AdmisiAdminService.getReRegistrationPayments(appId);
    return { data: payments };
  }

  static async verifyPayment({ body, set }: AuthContext<{ paymentId: number; isVerified: boolean; rejectionNote?: string }>) {
    try {
      await AdmisiAdminService.verifyPayment(body.paymentId, 1, body.isVerified, body.rejectionNote);

      if (body.isVerified) {
        const [payment] = await db
          .select()
          .from(reRegistrationPayments)
          .where(eq(reRegistrationPayments.id, body.paymentId))
          .limit(1);
        if (payment) {
          await AdmisiAdminService.updateApplicationStatus(payment.applicationId, 're_registration', 1, 'Pembayaran diverifikasi');
        }
      }

      return { message: body.isVerified ? 'Pembayaran berhasil diverifikasi' : 'Pembayaran ditolak' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── NIM ─────────────────────────────────────────────────────────

  static async generateNIMBulk({ params }: AuthContext<any, { id: string; prodiId: string }>) {
    const results = await AdmisiAdminService.generateNIMBulk(Number(params.id), Number(params.prodiId));
    return { data: results };
  }

  static async validateNIM({ query }: AuthContext<any, any, { nim: string }>) {
    const available = await AdmisiAdminService.validateNIM(query.nim);
    return { available };
  }

  static async issueNIM({ params, body, set }: AuthContext<{ nim: string }, { id: string }>) {
    try {
      const result = await AdmisiAdminService.issueNIM(Number(params.id), body.nim, 1);
      return { message: 'NIM berhasil diterbitkan', nim: result.nim };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async editNIM({ params, body, set }: AuthContext<{ nim: string }, { id: string }>) {
    try {
      const result = await AdmisiAdminService.editNIM(Number(params.id), body.nim);
      return { message: 'NIM berhasil diedit', nim: result.nimDiterbitkan };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── ANNOUNCEMENT ────────────────────────────────────────────────

  static async announceResults({ params, set }: AuthContext<any, { id: string }>) {
    try {
      const result = await AdmisiAdminService.announceResults(Number(params.id), 1);
      return { message: `Pengumuman diterbitkan: ${result.passed} lulus, ${result.failed} tidak lulus` };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getPassedCandidates({ params }: AuthContext<any, { id: string }>) {
    const result = await AdmisiAdminService.getPassedCandidates(Number(params.id));
    return result;
  }

  // ─── STATISTICS & EXPORT ─────────────────────────────────────────

  static async getDashboardStats() {
    const stats = await AdmisiAdminService.getDashboardStats();
    return stats;
  }

  static async exportApplications({ query }: AuthContext<any, any, { sessionId?: string; prodiId?: string; status?: string }>) {
    const data = await AdmisiAdminService.exportApplications({
      sessionId: query.sessionId ? Number(query.sessionId) : undefined,
      prodiId: query.prodiId ? Number(query.prodiId) : undefined,
      status: query.status,
    });
    return { data };
  }

  // ─── PROGRAM STUDI ───────────────────────────────────────────────

  static async getAllProdi() {
    const prodis = await db.select().from(programStudi).orderBy(programStudi.nama);
    return { data: prodis };
  }

  // ─── ANNOUNCEMENTS ───────────────────────────────────────────────

  static async createAnnouncement({ request, getCurrentUser, set }: any) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      const ct = request.headers.get('content-type') || '';
      let judul: string, isi: string, isPinned: boolean, filePath: string | undefined, fileName: string | undefined;

      if (ct.includes('multipart')) {
        const fd = await request.formData();
        judul = fd.get('judul') as string;
        isi = fd.get('isi') as string;
        isPinned = fd.get('isPinned') === 'true';
        const file = fd.get('file') as File | null;
        if (file) {
          const dir = 'storage/announcements';
          await Bun.$`mkdir -p ${dir}`.quiet();
          fileName = `${Date.now()}_${file.name}`;
          filePath = `${dir}/${fileName}`;
          await Bun.write(filePath, file);
        }
      } else {
        const body = await request.json();
        judul = body.judul;
        isi = body.isi;
        isPinned = body.isPinned || false;
      }

      if (!judul || !isi) { set.status = 400; return { error: 'Judul dan isi wajib diisi' }; }

      const a = await AdmisiAdminService.createAnnouncement({
        judul, isi, isPinned, createdBy: user.id,
        filePath, fileName,
      });
      set.status = 201;
      return { message: 'Pengumuman berhasil dibuat', announcementId: a.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getAnnouncements({ query }: any) {
    const data = await AdmisiAdminService.getAnnouncements(query.sessionId ? Number(query.sessionId) : undefined);
    return { data };
  }

  static async deleteAnnouncement({ params, set }: any) {
    try {
      await AdmisiAdminService.deleteAnnouncement(Number(params.id));
      return { message: 'Pengumuman berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }
}
