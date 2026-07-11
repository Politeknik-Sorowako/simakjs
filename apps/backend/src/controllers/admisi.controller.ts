import { AdmisiService } from '../services/admisi.service';
import { AuthContext } from '../utils/types';

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

      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const requirementId = Number(formData.get('requirementId'));

      if (!file || !requirementId) {
        set.status = 400;
        return { error: 'File dan requirementId wajib diisi' };
      }

      const uploadDir = `storage/applications/${params.id}`;
      await Bun.write(`${uploadDir}/${file.name}`, file);

      const doc = await AdmisiService.uploadDocument(
        Number(params.id),
        requirementId,
        user.id,
        { path: `${uploadDir}/${file.name}`, name: file.name, size: file.size, type: file.type },
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

  static async submitPayment({ params, request, getCurrentUser, set }: any) {
    try {
      const user = await getCurrentUser();
      if (!user) { set.status = 401; return { error: 'Unauthorized' }; }

      const formData = await request.formData();
      const file = formData.get('bukti_bayar') as File | null;
      const nominal = Number(formData.get('nominal'));
      const bankAsal = formData.get('bankAsal') as string | null;
      const namaPengirim = formData.get('namaPengirim') as string | null;

      if (!nominal || nominal <= 0) {
        set.status = 400;
        return { error: 'Nominal wajib diisi' };
      }

      let buktiBayarPath = '';
      if (file) {
        const uploadDir = `storage/applications/${params.id}/payment`;
        await Bun.write(`${uploadDir}/${file.name}`, file);
        buktiBayarPath = `${uploadDir}/${file.name}`;
      }

      const payment = await AdmisiService.submitPaymentProof(Number(params.id), user.id, {
        nominal,
        bankAsal: bankAsal || undefined,
        namaPengirim: namaPengirim || undefined,
        buktiBayarPath,
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
}
