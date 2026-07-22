import { mkdir } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { programStudi, reRegistrationPayments } from '../models/schema';
import { AdmisiAdminService } from '../services/admisi-admin.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class AdmisiAdminController {
  // ─── SESSIONS ────────────────────────────────────────────────────

  static async createSession({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const session = await AdmisiAdminService.createSession(body);
      set.status = 201;
      return { message: 'Sesi admisi berhasil dibuat', sessionId: session.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateSession({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
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

  static async getSessionDetail({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const detail = await AdmisiAdminService.getSessionDetail(Number(params.id));
    return { data: detail };
  }

  // ─── SESSION PRODIS ──────────────────────────────────────────────

  static async addProdiToSession({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.addProdiToSession(Number(params.id), body);
      set.status = 201;
      return { message: 'Program studi berhasil ditambahkan ke sesi' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateSesiProdi({ params, body, set }: any) {
    try {
      const { db } = await import('../utils/db');
      const { admissionSessionProdis } = await import('../models/schema');
      const { eq, and } = await import('drizzle-orm');
      await db
        .update(admissionSessionProdis)
        .set(body)
        .where(
          and(
            eq(admissionSessionProdis.sessionId, Number(params.id)),
            eq(admissionSessionProdis.prodiId, Number(params.prodiId)),
          ),
        );
      return { message: 'Prodi diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async removeProdiFromSession({
    params,
    set,
  }: AuthContext<any, any, { id: string; prodiId: string }>): Promise<any> {
    try {
      await AdmisiAdminService.removeProdiFromSession(Number(params.id), Number(params.prodiId));
      return { message: 'Program studi berhasil dihapus dari sesi' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async toggleProdiActive({
    params,
    set,
  }: AuthContext<any, any, { id: string; prodiId: string }>): Promise<any> {
    try {
      const result = await AdmisiAdminService.toggleProdiActive(Number(params.id), Number(params.prodiId));
      return { message: result.isActive ? 'Prodi diaktifkan' : 'Prodi dinonaktifkan', isActive: result.isActive };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── DOCUMENT REQUIREMENTS ───────────────────────────────────────

  static async createDocumentRequirement({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const req = await AdmisiAdminService.createDocumentRequirement(body);
      set.status = 201;
      return { message: 'Syarat dokumen berhasil dibuat', requirementId: req.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateDocumentRequirement({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.updateDocumentRequirement(Number(params.id), body);
      return { message: 'Syarat dokumen berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async deleteDocumentRequirement({ params, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.deleteDocumentRequirement(Number(params.id));
      return { message: 'Syarat dokumen berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── APPLICATIONS ────────────────────────────────────────────────

  static async updateAppBiodata({ params, body, set }: any) {
    try {
      const allowed = [
        'nik',
        'namaLengkap',
        'tempatLahir',
        'tanggalLahir',
        'jenisKelamin',
        'namaIbuKandung',
        'asalSekolah',
        'telepon',
        'jalan',
      ];
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (body[key] !== undefined) data[key] = body[key];
      }
      await AdmisiAdminService.updateAppBiodata(Number(params.id), data);
      return { message: 'Biodata berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateAppProdi({ params, body, set }: any) {
    try {
      const updated = await AdmisiAdminService.updateAppProdi(
        Number(params.id),
        body.prodiPilihan1,
        body.prodiPilihan2,
      );
      return { message: 'Pilihan prodi berhasil diubah', data: updated };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getApplications({ query }: any) {
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

  static async adminUploadDocument({ params, request, set }: any) {
    try {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const requirementId = Number(formData.get('requirementId'));
      if (!file || !requirementId) {
        set.status = 400;
        return { error: 'File dan requirementId wajib' };
      }

      const { db } = await import('../utils/db');
      const { documentRequirements, applicantDocuments } = await import('../models/schema');
      const { eq, and, sql } = await import('drizzle-orm');
      const { AdmisiAdminService } = await import('../services/admisi-admin.service');

      const [req] = await db
        .select({ namaDokumen: documentRequirements.namaDokumen })
        .from(documentRequirements)
        .where(eq(documentRequirements.id, requirementId))
        .limit(1);

      const slug = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');
      const baseName = req ? slug(req.namaDokumen) : `req_${requirementId}`;
      const now = new Date();
      const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const ext = file.name.split('.').pop() || 'file';
      const newName = `admin_${params.id}_${baseName}-${ts}.${ext}`;

      const { STORAGE_DIR } = await import('./admisi.controller');
      const dir = `${STORAGE_DIR}/${params.id}`;
      await mkdir(dir, { recursive: true });
      const fullPath = `${dir}/${newName}`;
      await Bun.write(fullPath, file);

      const [verResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(applicantDocuments)
        .where(
          and(
            eq(applicantDocuments.applicationId, Number(params.id)),
            eq(applicantDocuments.requirementId, requirementId),
          ),
        );

      const version = (verResult?.count || 0) + 1;
      const doc = await AdmisiAdminService.adminUploadDocument(Number(params.id), requirementId, {
        path: fullPath,
        name: newName,
        size: file.size,
        type: file.type,
      });

      set.status = 201;
      return { message: `Dokumen berhasil diupload oleh admin`, documentId: doc.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async verifyDocument({
    body,
    set,
    getCurrentUser,
  }: AuthContext<{ documentId: number; isVerified: boolean; rejectionNote?: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.verifyDocument(body.documentId, user!.id, body.isVerified, body.rejectionNote);
      return { message: body.isVerified ? 'Dokumen berhasil diverifikasi' : 'Dokumen ditolak' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async verifyAllDocuments({
    params,
    set,
    getCurrentUser,
  }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.verifyAllDocuments(Number(params.id), user!.id);
      return {
        message: `${result.verifiedCount} dokumen diverifikasi. Status: Terverifikasi`,
        verifiedCount: result.verifiedCount,
      };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async markDocsVerified({ params, set, getCurrentUser }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.markDocsVerified(Number(params.id), user!.id);
      return result;
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateApplicationStatus({
    params,
    body,
    set,
    getCurrentUser,
  }: AuthContext<{ status: string; notes?: string }, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.updateApplicationStatus(Number(params.id), body.status, user!.id, body.notes);
      return { message: `Status diubah ke ${body.status}` };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async reopenApplication({ params, set, getCurrentUser }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.updateApplicationStatus(
        Number(params.id),
        'returned',
        user!.id,
        'Admin membuka akses untuk melengkapi berkas',
      );
      return { message: 'Akses dibuka, peserta dapat melengkapi berkas dan memperbaiki biodata' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── SELECTION COMPONENTS ────────────────────────────────────────

  static async createSelectionComponent({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const comp = await AdmisiAdminService.createSelectionComponent(body);
      set.status = 201;
      return { message: 'Komponen penilaian berhasil dibuat', componentId: comp.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getSelectionComponents({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const comps = await AdmisiAdminService.getSelectionComponents(Number(params.id));
    return { data: comps };
  }

  static async deleteSelectionComponent({ params, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.deleteSelectionComponent(Number(params.id));
      return { message: 'Komponen penilaian berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── SCORES ──────────────────────────────────────────────────────

  static async inputScore({
    body,
    set,
    getCurrentUser,
  }: AuthContext<{ applicationId: number; componentId: number; score: number; notes?: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.inputScore(body.applicationId, body.componentId, body.score, user!.id, body.notes);
      set.status = 201;
      return { message: 'Nilai berhasil disimpan' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── EXAM SCHEDULES ──────────────────────────────────────────────

  static async createExamSchedule({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const schedule = await AdmisiAdminService.createExamSchedule(body);
      set.status = 201;
      return { message: 'Jadwal ujian berhasil dibuat', scheduleId: schedule.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getExamSchedules({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const schedules = await AdmisiAdminService.getExamSchedules(Number(params.id));
    return { data: schedules };
  }

  // ─── RE-REGISTRATION ─────────────────────────────────────────────

  static async getPayments({ params }: any) {
    const appId = params?.applicationId ? Number(params.applicationId) : undefined;
    const payments = await AdmisiAdminService.getReRegistrationPayments(appId);
    return { data: payments };
  }

  static async verifyPayment({
    body,
    set,
    getCurrentUser,
  }: AuthContext<{ paymentId: number; isVerified: boolean; rejectionNote?: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.verifyPayment(body.paymentId, user!.id, body.isVerified, body.rejectionNote);

      if (body.isVerified) {
        const [payment] = await db
          .select()
          .from(reRegistrationPayments)
          .where(eq(reRegistrationPayments.id, body.paymentId))
          .limit(1);
        if (payment) {
          await AdmisiAdminService.updateApplicationStatus(
            payment.applicationId,
            're_registration',
            user!.id,
            'Pembayaran diverifikasi',
          );
        }
      }

      return { message: body.isVerified ? 'Pembayaran berhasil diverifikasi' : 'Pembayaran ditolak' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── NIM ─────────────────────────────────────────────────────────

  static async generateNIMBulk({ params }: AuthContext<any, any, { id: string; prodiId: string }>): Promise<any> {
    const results = await AdmisiAdminService.generateNIMBulk(Number(params.id), Number(params.prodiId));
    return { data: results };
  }

  static async validateNIM({ query }: AuthContext<any, any>): Promise<any> {
    const available = await AdmisiAdminService.validateNIM(query.nim as string);
    return { available };
  }

  static async issueNIM({
    params,
    body,
    set,
    getCurrentUser,
  }: AuthContext<{ nim: string }, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.issueNIM(Number(params.id), body.nim, user!.id);
      return { message: 'NIM berhasil diterbitkan', nim: result.nim };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async editNIM({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const result = await AdmisiAdminService.editNIM(Number(params.id), (body as { nim: string }).nim);
      return { message: 'NIM berhasil diedit', nim: result.nimDiterbitkan };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── VA BANKS ──────────────────────────────────────────────────

  static async getAllVABanks() {
    const banks = await AdmisiAdminService.getAllVABanks();
    return { data: banks };
  }

  static async createVABank({ body, set }: any) {
    try {
      const bank = await AdmisiAdminService.createVABank(body);
      set.status = 201;
      return { message: 'Bank VA ditambahkan', bankId: bank.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateVABank({ params, body, set }: any) {
    try {
      await AdmisiAdminService.updateVABank(Number(params.id), body);
      return { message: 'Bank VA diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async deleteVABank({ params, set }: any) {
    try {
      await AdmisiAdminService.deleteVABank(Number(params.id));
      return { message: 'Bank VA dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── PAYMENT VERIFICATION ──────────────────────────────────────

  static async getPendingPayments() {
    const data = await AdmisiAdminService.getPendingPayments();
    return { data };
  }

  static async verifyPaymentVA({ params, set, getCurrentUser }: any) {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.verifyVAPayment(Number(params.id), user!.id);
      return { message: 'Pembayaran diverifikasi' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  // ─── ANNOUNCEMENT ────────────────────────────────────────────────

  static async announceResults({ params, set, getCurrentUser }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.announceResults(Number(params.id), user!.id);
      return { message: `Pengumuman diterbitkan: ${result.passed} lulus, ${result.failed} tidak lulus` };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getPassedCandidates({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const result = await AdmisiAdminService.getPassedCandidates(Number(params.id));
    return result;
  }

  // ─── STATISTICS & EXPORT ─────────────────────────────────────────

  static async getDashboardStats() {
    const stats = await AdmisiAdminService.getDashboardStats();
    return stats;
  }

  static async exportApplications({
    query,
  }: AuthContext<any, { sessionId?: string; prodiId?: string; status?: string }>): Promise<any> {
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
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

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
          await mkdir(dir, { recursive: true });
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

      if (!judul || !isi) {
        set.status = 400;
        return { error: 'Judul dan isi wajib diisi' };
      }

      const a = await AdmisiAdminService.createAnnouncement({
        judul,
        isi,
        isPinned,
        createdBy: user.id,
        filePath,
        fileName,
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

  static async updateAnnouncement({ params, request, set }: any) {
    try {
      const ct = request.headers.get('content-type') || '';
      let judul: string | undefined, isi: string | undefined, isPinned: boolean | undefined;
      let filePath: string | undefined, fileName: string | undefined;

      if (ct.includes('multipart')) {
        const fd = await request.formData();
        judul = fd.get('judul') as string;
        isi = fd.get('isi') as string;
        isPinned = fd.get('isPinned') === 'true' ? true : fd.get('isPinned') === 'false' ? false : undefined;
        const file = fd.get('file') as File | null;
        if (file) {
          const dir = 'storage/announcements';
          await mkdir(dir, { recursive: true });
          fileName = `${Date.now()}_${file.name}`;
          filePath = `${dir}/${fileName}`;
          await Bun.write(filePath, file);
        }
      } else {
        const body = typeof request.body === 'object' ? await request.json() : {};
        judul = body.judul;
        isi = body.isi;
        isPinned = body.isPinned;
      }

      const data: Record<string, any> = {};
      if (judul !== undefined) data.judul = judul;
      if (isi !== undefined) data.isi = isi;
      if (isPinned !== undefined) data.isPinned = isPinned;
      if (filePath !== undefined) {
        data.filePath = filePath;
        data.fileName = fileName;
      }

      await AdmisiAdminService.updateAnnouncement(Number(params.id), data);
      return { message: 'Pengumuman berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
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
