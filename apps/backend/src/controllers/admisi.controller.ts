import { mkdir } from 'node:fs/promises';
import { resolve } from 'path';
import { AdmisiService } from '../services/admisi.service';
import { AuthContext } from '../utils/types';

export const STORAGE_DIR = resolve(import.meta.dir!, '../../storage/applications');

export class AdmisiController {
  static async register({ body, set }: AuthContext<{ email: string; password: string; nama: string }>): Promise<any> {
    try {
      const user = await AdmisiService.register(body.email, body.password, body.nama);
      set.status = 201;
      return { message: 'Akun berhasil dibuat. Silakan cek email untuk verifikasi.', userId: user.id };
    } catch (e: any) {
      if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
        set.status = 400;
        return { error: 'Email sudah terdaftar' };
      }
      set.status = 400;
      return { error: e.message || 'Gagal mendaftar' };
    }
  }

  static async verifyEmail({ body, set }: AuthContext<{ token: string }>): Promise<any> {
    try {
      const user = await AdmisiService.verifyEmailToken(body.token);
      if (!user) {
        set.status = 400;
        return { error: 'Token tidak valid atau sudah kedaluwarsa' };
      }
      set.status = 200;
      return { message: 'Email berhasil diverifikasi', userId: user.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Token tidak valid' };
    }
  }

  static async getActiveSessions() {
    const sessions = await AdmisiService.getActiveSessions();
    return { data: sessions };
  }

  static async getSessionProdis({ params }: AuthContext<any, any, { id: string }>): Promise<any> {
    const prodis = await AdmisiService.getSessionProdis(Number(params.id));
    return { data: prodis };
  }

  static async createApplication({
    body,
    getCurrentUser,
    set,
  }: AuthContext<{ sessionId: number; prodiPilihan1: number; prodiPilihan2?: number }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const app = await AdmisiService.createApplication(user.id, {
        sessionId: body.sessionId,
        prodiPilihan1: body.prodiPilihan1,
        prodiPilihan2: body.prodiPilihan2,
      });

      set.status = 201;
      return { message: 'Pendaftaran berhasil dibuat', applicationId: app.id, noPendaftar: app.noPendaftar };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async updateApplication({
    params,
    body,
    getCurrentUser,
    set,
  }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      await AdmisiService.updateApplication(Number(params.id), user.id, body);
      return { message: 'Data pendaftaran berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async submitApplication({ params, getCurrentUser, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const result = await AdmisiService.submitApplication(Number(params.id), user.id);
      return { message: 'Pendaftaran berhasil disubmit', status: result.status };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getMyApplications({ getCurrentUser, set }: AuthContext): Promise<any> {
    const user = await getCurrentUser();
    if (!user) {
      set.status = 401;
      return { error: 'Unauthorized' };
    }

    const apps = await AdmisiService.getUserApplications(user.id);
    return { data: apps };
  }

  static async getApplicationDetail({
    params,
    getCurrentUser,
    set,
  }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const app = await AdmisiService.getApplicationDetail(Number(params.id), user.id);
      const docs = await AdmisiService.getDocuments(Number(params.id));
      const logs = await AdmisiService.getApplicationLogs(Number(params.id));
      return { data: { ...app, documents: docs, logs } };
    } catch (e: any) {
      set.status = 404;
      return { error: e.message };
    }
  }

  static async uploadDocument({ params, request, getCurrentUser, set }: any) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { db } = await import('../utils/db');
      const { documentRequirements, applicantDocuments, applications } = await import('../models/schema');
      const { eq, and, sql } = await import('drizzle-orm');

      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const requirementId = Number(formData.get('requirementId'));

      if (!file || !requirementId) {
        set.status = 400;
        return { error: 'File dan requirementId wajib diisi' };
      }

      // Fetch application + requirement info for naming
      const [[app], [req]] = await Promise.all([
        db
          .select({ noPendaftar: applications.noPendaftar, namaLengkap: applications.namaLengkap })
          .from(applications)
          .where(eq(applications.id, Number(params.id)))
          .limit(1),
        db
          .select({ namaDokumen: documentRequirements.namaDokumen })
          .from(documentRequirements)
          .where(eq(documentRequirements.id, requirementId))
          .limit(1),
      ]);

      const slug = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');

      const noPendaftar = app?.noPendaftar || `app_${params.id}`;
      const namaSlug = slug(app?.namaLengkap || 'unknown');
      const berkasSlug = req ? slug(req.namaDokumen) : `req_${requirementId}`;
      const now = new Date();
      const timestamp =
        `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}` +
        `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

      const ext = file.name.split('.').pop() || 'file';
      const newFileName = `${noPendaftar}_${namaSlug}_${berkasSlug}-${timestamp}.${ext}`;

      const uploadDir = `${STORAGE_DIR}/${params.id}`;
      await mkdir(uploadDir, { recursive: true });
      const fullPath = `${uploadDir}/${newFileName}`;
      await Bun.write(fullPath, file);

      const doc = await AdmisiService.uploadDocument(Number(params.id), requirementId, user.id, {
        path: fullPath,
        name: newFileName,
        size: file.size,
        type: file.type,
      });

      set.status = 201;
      return { message: 'Dokumen berhasil diupload', documentId: doc.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async submitDocumentLink({
    params,
    body,
    getCurrentUser,
    set,
  }: AuthContext<{ requirementId: number; fileLink: string }, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const doc = await AdmisiService.submitDocumentLink(Number(params.id), body.requirementId, user.id, body.fileLink);

      set.status = 201;
      return { message: 'Link dokumen berhasil dikirim', documentId: doc.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async deleteDocument({ params, getCurrentUser, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      await AdmisiService.deleteDocument(Number(params.id), user.id);
      return { message: 'Dokumen berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async submitPayment({
    params,
    body,
    getCurrentUser,
    set,
  }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const paymentBody = body as { nominal: number; bankAsal?: string; namaPengirim?: string };
      if (!paymentBody.nominal || paymentBody.nominal <= 0) {
        set.status = 400;
        return { error: 'Nominal wajib diisi' };
      }

      const payment = await AdmisiService.submitPaymentProof(Number(params.id), user.id, {
        nominal: paymentBody.nominal,
        bankAsal: paymentBody.bankAsal || undefined,
        namaPengirim: paymentBody.namaPengirim || undefined,
        buktiBayarPath: '',
      });

      set.status = 201;
      return { message: 'Bukti pembayaran berhasil dikirim', paymentId: payment.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getDocuments({ params, getCurrentUser, set }: AuthContext<any, any, { id: string }>): Promise<any> {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const docs = await AdmisiService.getDocuments(Number(params.id));
      return { data: docs };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getDocumentRequirements({ query }: AuthContext<any, any>): Promise<any> {
    const sessionId = query.sessionId as string | undefined;
    if (!sessionId) return { data: [] };
    const { db } = await import('../utils/db');
    const { documentRequirements } = await import('../models/schema');
    const { eq } = await import('drizzle-orm');
    const reqs = await db
      .select()
      .from(documentRequirements)
      .where(eq(documentRequirements.sessionId, Number(sessionId)))
      .orderBy(documentRequirements.urutan);
    return { data: reqs };
  }

  static async downloadFile({ params, set, getCurrentUser }: any) {
    try {
      const { db } = await import('../utils/db');
      const { applicantDocuments, applications } = await import('../models/schema');
      const { eq, and } = await import('drizzle-orm');

      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const [doc] = await db
        .select()
        .from(applicantDocuments)
        .where(eq(applicantDocuments.id, Number(params.id)))
        .limit(1);

      if (!doc || !doc.filePath) {
        set.status = 404;
        return { error: 'File tidak ditemukan' };
      }

      // Ownership check: verify user owns the application
      const [app] = await db
        .select()
        .from(applications)
        .where(and(eq(applications.id, doc.applicationId), eq(applications.userId, user.id)))
        .limit(1);

      if (!app && user.role !== 'admin') {
        set.status = 403;
        return { error: 'Akses ditolak' };
      }

      const file = Bun.file(doc.filePath);
      const exists = await file.exists();
      if (!exists) {
        set.status = 404;
        return { error: 'File fisik tidak ditemukan di server' };
      }

      set.headers['Content-Type'] = doc.mimeType || 'application/octet-stream';
      set.headers['Content-Disposition'] = `inline; filename="${doc.originalName || 'file'}"`;
      return file;
    } catch (e: any) {
      set.status = 500;
      return { error: 'Gagal mengunduh file' };
    }
  }

  static async downloadAnnouncementFile({ params, set, getCurrentUser }: any) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }

      const { db } = await import('../utils/db');
      const { announcements } = await import('../models/schema');
      const { eq } = await import('drizzle-orm');

      const [ann] = await db
        .select()
        .from(announcements)
        .where(eq(announcements.id, Number(params.id)))
        .limit(1);

      if (!ann || !ann.filePath) {
        set.status = 404;
        return { error: 'File tidak ditemukan' };
      }

      const file = Bun.file(ann.filePath);
      const exists = await file.exists();
      if (!exists) {
        set.status = 404;
        return { error: 'File fisik tidak ditemukan di server' };
      }

      const ext = ann.fileName?.split('.').pop()?.toLowerCase() || '';
      const mimeMap: Record<string, string> = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };
      set.headers['Content-Type'] = mimeMap[ext] || 'application/octet-stream';
      set.headers['Content-Disposition'] = `attachment; filename="${ann.fileName || 'file'}"`;
      return file;
    } catch (e: any) {
      set.status = 500;
      return { error: 'Gagal mengunduh file' };
    }
  }

  // ─── VA PAYMENT ────────────────────────────────────────────────

  static async getActiveBanks() {
    const banks = await AdmisiService.getActiveBanks();
    return { data: banks };
  }

  static async generateVA({ params, body, getCurrentUser, set }: any) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const va = await AdmisiService.generateVA(Number(params.id), user.id, body.vaBankId);
      set.status = 201;
      return { message: 'VA berhasil digenerate', data: va };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getPaymentStatus({ params, getCurrentUser, set }: any) {
    try {
      const user = await getCurrentUser();
      if (!user) {
        set.status = 401;
        return { error: 'Unauthorized' };
      }
      const data = await AdmisiService.getPaymentStatus(Number(params.id));
      return { data };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }
}
