import { mkdir } from 'node:fs/promises';
import { eq } from 'drizzle-orm';
import { programStudi, reRegistrationPayments } from '../models/schema';
import { AdmisiAdminService } from '../services/admisi-admin.service';
import { db } from '../utils/db';
import { AuthContext } from '../utils/types';

export class AdmisiAdminController {
  // ─── SESSIONS ────────────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createSession({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const session = await AdmisiAdminService.createSession(body);
      set.status = 201;
      return { message: 'Sesi admisi berhasil dibuat', sessionId: session.id };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateSession({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.updateSession(Number(params.id), body);
      return { message: 'Sesi admisi berhasil diperbarui' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async getAllSessions() {
    const sessions = await AdmisiAdminService.getAllSessions();
    return { data: sessions };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getSessionDetail({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const detail = await AdmisiAdminService.getSessionDetail(Number(params.id));
    return { data: detail };
  }

  // ─── SESSION PRODIS ──────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async addProdiToSession({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.addProdiToSession(Number(params.id), body);
      set.status = 201;
      return { message: 'Program studi berhasil ditambahkan ke sesi' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateSesiProdi({ params, body, set }: AuthContext<any, any, { id: string; prodiId: string }>) {
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async removeProdiFromSession({
    params,
    set,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, any, { id: string; prodiId: string }>): Promise<any> {
    try {
      await AdmisiAdminService.removeProdiFromSession(Number(params.id), Number(params.prodiId));
      return { message: 'Program studi berhasil dihapus dari sesi' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async toggleProdiActive({
    params,
    set,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, any, { id: string; prodiId: string }>): Promise<any> {
    try {
      const result = await AdmisiAdminService.toggleProdiActive(Number(params.id), Number(params.prodiId));
      return { message: result.isActive ? 'Prodi diaktifkan' : 'Prodi dinonaktifkan', isActive: result.isActive };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── DOCUMENT REQUIREMENTS ───────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createDocumentRequirement({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const req = await AdmisiAdminService.createDocumentRequirement(body);
      set.status = 201;
      return { message: 'Syarat dokumen berhasil dibuat', requirementId: req.id };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateDocumentRequirement({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.updateDocumentRequirement(Number(params.id), body);
      return { message: 'Syarat dokumen berhasil diperbarui' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteDocumentRequirement({ params, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.deleteDocumentRequirement(Number(params.id));
      return { message: 'Syarat dokumen berhasil dihapus' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── APPLICATIONS ────────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateAppBiodata({ params, body, set }: AuthContext<any, any, { id: string }>) {
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
      // biome-ignore lint/suspicious/noExplicitAny: Dynamic update object built from allowed fields
      const data: Record<string, any> = {};
      for (const key of allowed) {
        if (body[key] !== undefined) data[key] = body[key];
      }
      await AdmisiAdminService.updateAppBiodata(Number(params.id), data);
      return { message: 'Biodata berhasil diperbarui' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateAppProdi({ params, body, set }: AuthContext<any, any, { id: string }>) {
    try {
      const updated = await AdmisiAdminService.updateAppProdi(
        Number(params.id),
        body.prodiPilihan1,
        body.prodiPilihan2,
      );
      return { message: 'Pilihan prodi berhasil diubah', data: updated };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getApplications({ query }: AuthContext<any, any>) {
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async adminUploadDocument({ params, request, set }: AuthContext<any, any, { id: string }>) {
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async verifyDocument({
    body,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<{ documentId: number; isVerified: boolean; rejectionNote?: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.verifyDocument(body.documentId, user!.id, body.isVerified, body.rejectionNote);
      return { message: body.isVerified ? 'Dokumen berhasil diverifikasi' : 'Dokumen ditolak' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async verifyAllDocuments({
    params,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.verifyAllDocuments(Number(params.id), user!.id);
      return {
        message: `${result.verifiedCount} dokumen diverifikasi. Status: Terverifikasi`,
        verifiedCount: result.verifiedCount,
      };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async markDocsVerified({ params, set, getCurrentUser }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.markDocsVerified(Number(params.id), user!.id);
      return result;
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  static async updateApplicationStatus({
    params,
    body,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<{ status: string; notes?: string }, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.updateApplicationStatus(Number(params.id), body.status, user!.id, body.notes);
      return { message: `Status diubah ke ${body.status}` };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── SELECTION COMPONENTS ────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createSelectionComponent({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const comp = await AdmisiAdminService.createSelectionComponent(body);
      set.status = 201;
      return { message: 'Komponen penilaian berhasil dibuat', componentId: comp.id };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getSelectionComponents({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const comps = await AdmisiAdminService.getSelectionComponents(Number(params.id));
    return { data: comps };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteSelectionComponent({ params, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      await AdmisiAdminService.deleteSelectionComponent(Number(params.id));
      return { message: 'Komponen penilaian berhasil dihapus' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── SCORES ──────────────────────────────────────────────────────

  static async inputScore({
    body,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<{ applicationId: number; componentId: number; score: number; notes?: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.inputScore(body.applicationId, body.componentId, body.score, user!.id, body.notes);
      set.status = 201;
      return { message: 'Nilai berhasil disimpan' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── EXAM SCHEDULES ──────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createExamSchedule({ body, set }: AuthContext<any>): Promise<any> {
    try {
      const schedule = await AdmisiAdminService.createExamSchedule(body);
      set.status = 201;
      return { message: 'Jadwal ujian berhasil dibuat', scheduleId: schedule.id };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getExamSchedules({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const schedules = await AdmisiAdminService.getExamSchedules(Number(params.id));
    return { data: schedules };
  }

  // ─── RE-REGISTRATION ─────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getPayments({ params }: AuthContext<any, any>) {
    const appId = params?.applicationId ? Number(params.applicationId) : undefined;
    const payments = await AdmisiAdminService.getReRegistrationPayments(appId);
    return { data: payments };
  }

  static async verifyPayment({
    body,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── NIM ─────────────────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async generateNIMBulk({ params }: AuthContext<any, any, { id: string; prodiId: string }>): Promise<any> {
    const results = await AdmisiAdminService.generateNIMBulk(Number(params.id), Number(params.prodiId));
    return { data: results };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async validateNIM({ query }: AuthContext<any, any>): Promise<any> {
    const available = await AdmisiAdminService.validateNIM(query.nim as string);
    return { available };
  }

  static async issueNIM({
    params,
    body,
    set,
    getCurrentUser,
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  }: AuthContext<{ nim: string }, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.issueNIM(Number(params.id), body.nim, user!.id);
      return { message: 'NIM berhasil diterbitkan', nim: result.nim };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async editNIM({ params, body, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const result = await AdmisiAdminService.editNIM(Number(params.id), (body as { nim: string }).nim);
      return { message: 'NIM berhasil diedit', nim: result.nimDiterbitkan };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── VA BANKS ──────────────────────────────────────────────────

  static async getAllVABanks() {
    const banks = await AdmisiAdminService.getAllVABanks();
    return { data: banks };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createVABank({ body, set }: AuthContext<any>) {
    try {
      const bank = await AdmisiAdminService.createVABank(body);
      set.status = 201;
      return { message: 'Bank VA ditambahkan', bankId: bank.id };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateVABank({ params, body, set }: AuthContext<any, any, { id: string }>) {
    try {
      await AdmisiAdminService.updateVABank(Number(params.id), body);
      return { message: 'Bank VA diperbarui' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteVABank({ params, set }: AuthContext<any, any, { id: string }>) {
    try {
      await AdmisiAdminService.deleteVABank(Number(params.id));
      return { message: 'Bank VA dihapus' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── PAYMENT VERIFICATION ──────────────────────────────────────

  static async getPendingPayments() {
    const data = await AdmisiAdminService.getPendingPayments();
    return { data };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async verifyPaymentVA({ params, set, getCurrentUser }: AuthContext<any, any, { id: string }>) {
    try {
      const user = await getCurrentUser();
      await AdmisiAdminService.verifyVAPayment(Number(params.id), user!.id);
      return { message: 'Pembayaran diverifikasi' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // ─── ANNOUNCEMENT ────────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async announceResults({ params, set, getCurrentUser }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      const result = await AdmisiAdminService.announceResults(Number(params.id), user!.id);
      return { message: `Pengumuman diterbitkan: ${result.passed} lulus, ${result.failed} tidak lulus` };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
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
    // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
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

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async createAnnouncement({ request, getCurrentUser, set }: AuthContext<any>) {
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
        const body = (await request.json()) as Record<string, unknown>;
        judul = body.judul as string;
        isi = body.isi as string;
        isPinned = (body.isPinned as boolean) || false;
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async getAnnouncements({ query }: AuthContext<any, any>) {
    const data = await AdmisiAdminService.getAnnouncements(query.sessionId ? Number(query.sessionId) : undefined);
    return { data };
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async updateAnnouncement({ params, request, set }: AuthContext<any, any, { id: string }>) {
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
        const body = typeof request.body === 'object' ? ((await request.json()) as Record<string, unknown>) : {};
        judul = body.judul as string | undefined;
        isi = body.isi as string | undefined;
        isPinned = body.isPinned as boolean | undefined;
      }

      // biome-ignore lint/suspicious/noExplicitAny: Dynamic update object built from optional fields
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
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }

  // biome-ignore lint/suspicious/noExplicitAny: Elysia framework requirement — route inference needs any
  static async deleteAnnouncement({ params, set }: AuthContext<any, any, { id: string }>) {
    try {
      await AdmisiAdminService.deleteAnnouncement(Number(params.id));
      return { message: 'Pengumuman berhasil dihapus' };
    } catch (e: unknown) {
      set.status = 400;
      return { error: e instanceof Error ? e.message : 'Gagal memproses permintaan' };
    }
  }
}
