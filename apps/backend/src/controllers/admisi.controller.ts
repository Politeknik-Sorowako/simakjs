import { AdmisiService } from '../services/admisi.service';
import { AuthContext } from '../utils/types';
import { resolve } from 'path';

const STORAGE_DIR = resolve(import.meta.dir!, '../../storage/applications');

export class AdmisiController {
  static async register({ body, set }: AuthContext<{ email: string; password: string; nama: string }>) {
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

  static async verifyEmail({ body, set }: AuthContext<{ token: string }>) {
    try {
      set.status = 200;
      return { message: 'Email berhasil diverifikasi' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message || 'Token tidak valid' };
    }
  }

  static async getActiveSessions() {
    const sessions = await AdmisiService.getActiveSessions();
    return { data: sessions };
  }

  static async getSessionProdis({ params }: AuthContext<any, { id: string }>) {
    const prodis = await AdmisiService.getSessionProdis(Number(params.id));
    return { data: prodis };
  }

  static async createApplication({ body, getCurrentUser, set }: AuthContext<{ sessionId: number; prodiPilihan1: number; prodiPilihan2?: number }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

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

  static async updateApplication({ params, body, getCurrentUser, set }: AuthContext<any, { id: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      await AdmisiService.updateApplication(Number(params.id), user.id, body);
      return { message: 'Data pendaftaran berhasil diperbarui' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async submitApplication({ params, getCurrentUser, set }: AuthContext<any, { id: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      const result = await AdmisiService.submitApplication(Number(params.id), user.id);
      return { message: 'Pendaftaran berhasil disubmit', status: result.status };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getMyApplications({ getCurrentUser, set }: AuthContext) {
    const user = await getCurrentUser();
    if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

    const apps = await AdmisiService.getUserApplications(user.id);
    return { data: apps };
  }

  static async getApplicationDetail({ params, getCurrentUser, set }: AuthContext<any, { id: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

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
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

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

      const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

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
      await Bun.$`mkdir -p ${uploadDir}`.quiet();
      const fullPath = `${uploadDir}/${newFileName}`;
      await Bun.write(fullPath, file);

      const doc = await AdmisiService.uploadDocument(
        Number(params.id),
        requirementId,
        user.id,
        { path: fullPath, name: newFileName, size: file.size, type: file.type },
      );

      set.status = 201;
      return { message: 'Dokumen berhasil diupload', documentId: doc.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async submitDocumentLink({ params, body, getCurrentUser, set }: AuthContext<{ requirementId: number; fileLink: string }, { id: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      const doc = await AdmisiService.submitDocumentLink(
        Number(params.id),
        body.requirementId,
        user.id,
        body.fileLink,
      );

      set.status = 201;
      return { message: 'Link dokumen berhasil dikirim', documentId: doc.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async deleteDocument({ params, getCurrentUser, set }: AuthContext<any, { id: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      await AdmisiService.deleteDocument(Number(params.id), user.id);
      return { message: 'Dokumen berhasil dihapus' };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async submitPayment({ params, body, getCurrentUser, set }: AuthContext<{ nominal: number; bankAsal?: string; namaPengirim?: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      if (!body.nominal || body.nominal <= 0) {
        set.status = 400;
        return { error: 'Nominal wajib diisi' };
      }

      const payment = await AdmisiService.submitPaymentProof(Number(params.id), user.id, {
        nominal: body.nominal,
        bankAsal: body.bankAsal || undefined,
        namaPengirim: body.namaPengirim || undefined,
        buktiBayarPath: '',
      });

      set.status = 201;
      return { message: 'Bukti pembayaran berhasil dikirim', paymentId: payment.id };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getDocuments({ params, getCurrentUser, set }: AuthContext<any, { id: string }>) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      const docs = await AdmisiService.getDocuments(Number(params.id));
      return { data: docs };
    } catch (e: any) {
      set.status = 400;
      return { error: e.message };
    }
  }

  static async getDocumentRequirements({ query }: AuthContext<any, any, { sessionId: string; prodiId?: string }>) {
    const { sessionId } = query;
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

  static async downloadFile({ params, set }: any) {
    try {
      const { db } = await import('../utils/db');
      const { applicantDocuments } = await import('../models/schema');
      const { eq } = await import('drizzle-orm');

      const [doc] = await db
        .select()
        .from(applicantDocuments)
        .where(eq(applicantDocuments.id, Number(params.id)))
        .limit(1);

      if (!doc || !doc.filePath) {
        set.status = 404;
        return { error: 'File tidak ditemukan' };
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
}
