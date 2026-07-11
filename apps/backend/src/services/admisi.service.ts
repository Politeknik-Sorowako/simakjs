import { db } from '../utils/db';
import { users, admissionSessions, admissionSessionProdis, applications, applicationLogs, documentRequirements, applicantDocuments, reRegistrationPayments, programStudi } from '../models/schema';
import { eq, and, lt, gt, sql } from 'drizzle-orm';
import { createHash } from 'crypto';

export class AdmisiService {
  static async register(email: string, password: string, nama: string) {
    const hashed = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
    const [user] = await db
      .insert(users)
      .values({ email, password: hashed, nama, role: 'calon_mahasiswa', isActive: false })
      .returning({ id: users.id, email: users.email, nama: users.nama, role: users.role });
    return user;
  }

  static async verifyEmailToken(token: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const [reset] = await db
      .select()
      .from(users)

    return null;
  }

  static async activateUser(userId: number) {
    const [user] = await db
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, userId))
      .returning({ id: users.id, email: users.email, role: users.role });
    return user;
  }

  static async generateNoPendaftar(sessionId: number): Promise<string> {
    const session = await db
      .select({ kode: admissionSessions.kode, tahun: sql`EXTRACT(YEAR FROM ${admissionSessions.tanggalMulai})` })
      .from(admissionSessions)
      .where(eq(admissionSessions.id, sessionId))
      .limit(1);

    if (!session.length) throw new Error('Sesi tidak ditemukan');

    const tahun = String(session[0].tahun);
    const prefix = `PMB${tahun}`;

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(sql`${applications.noPendaftar} LIKE ${prefix + '%'}`);

    const nextNum = (result.count + 1).toString().padStart(4, '0');
    return `${prefix}${nextNum}`;
  }

  static async getActiveSessions() {
    return db
      .select({
        id: admissionSessions.id,
        kode: admissionSessions.kode,
        nama: admissionSessions.nama,
        deskripsi: admissionSessions.deskripsi,
        tanggalMulai: admissionSessions.tanggalMulai,
        tanggalTutup: admissionSessions.tanggalTutup,
        tanggalVerif: admissionSessions.tanggalVerif,
        tanggalUjian: admissionSessions.tanggalUjian,
        tanggalPengumuman: admissionSessions.tanggalPengumuman,
        kuota: admissionSessions.kuota,
      })
      .from(admissionSessions)
      .where(
        and(
          eq(admissionSessions.isActive, true),
          sql`${admissionSessions.tanggalMulai} <= CURRENT_DATE`,
          sql`${admissionSessions.tanggalTutup} >= CURRENT_DATE`,
        ),
      );
  }

  static async getSessionProdis(sessionId: number) {
    return db
      .select({
        id: admissionSessionProdis.id,
        prodiId: admissionSessionProdis.prodiId,
        kodeProdi: programStudi.kode,
        namaProdi: programStudi.nama,
        jenjang: programStudi.jenjang,
        kuota: admissionSessionProdis.kuota,
        passingGrade: admissionSessionProdis.passingGrade,
        biayaDaftar: admissionSessionProdis.biayaDaftar,
      })
      .from(admissionSessionProdis)
      .leftJoin(programStudi, eq(admissionSessionProdis.prodiId, programStudi.id))
      .where(eq(admissionSessionProdis.sessionId, sessionId));
  }

  static async createApplication(userId: number, data: { sessionId: number; prodiPilihan1: number; prodiPilihan2?: number }) {
    const noPendaftar = await this.generateNoPendaftar(data.sessionId);

    // Check session is active
    const [session] = await db
      .select()
      .from(admissionSessions)
      .where(and(eq(admissionSessions.id, data.sessionId), eq(admissionSessions.isActive, true)))
      .limit(1);

    if (!session) throw new Error('Sesi admisi tidak ditemukan atau tidak aktif');
    if (session.tanggalMulai > new Date().toISOString().split('T')[0]) throw new Error('Sesi admisi belum dimulai');
    if (session.tanggalTutup < new Date().toISOString().split('T')[0]) throw new Error('Sesi admisi sudah ditutup');

    // Check prodi is available for this session
    const [prodi] = await db
      .select()
      .from(admissionSessionProdis)
      .where(
        and(
          eq(admissionSessionProdis.sessionId, data.sessionId),
          eq(admissionSessionProdis.prodiId, data.prodiPilihan1),
        ),
      )
      .limit(1);

    if (!prodi) throw new Error('Program studi pilihan 1 tidak tersedia di sesi ini');

    const [app] = await db
      .insert(applications)
      .values({
        userId,
        sessionId: data.sessionId,
        noPendaftar,
        prodiPilihan1: data.prodiPilihan1,
        prodiPilihan2: data.prodiPilihan2 || null,
        status: 'draft',
      })
      .returning({ id: applications.id, noPendaftar: applications.noPendaftar, status: applications.status });

    // Log
    await db.insert(applicationLogs).values({
      applicationId: app.id,
      statusTo: 'draft',
      message: 'Pendaftaran dibuat',
      createdBy: userId,
    });

    return app;
  }

  static async updateApplication(applicationId: number, userId: number, data: Record<string, any>) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft') throw new Error('Pendaftaran sudah disubmit, tidak bisa diubah');

    const [updated] = await db
      .update(applications)
      .set(data)
      .where(eq(applications.id, applicationId))
      .returning();

    return updated;
  }

  static async submitApplication(applicationId: number, userId: number) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft') throw new Error('Pendaftaran sudah disubmit sebelumnya');

    // Validate required fields
    if (!app.namaLengkap || !app.nik || !app.tanggalLahir || !app.jenisKelamin || !app.namaIbuKandung) {
      throw new Error('Lengkapi biodata terlebih dahulu (nama, NIK, tanggal lahir, jenis kelamin, ibu kandung)');
    }

    const [updated] = await db
      .update(applications)
      .set({ status: 'submitted' })
      .where(eq(applications.id, applicationId))
      .returning({ id: applications.id, status: applications.status });

    await db.insert(applicationLogs).values({
      applicationId: applicationId,
      statusFrom: 'draft',
      statusTo: 'submitted',
      message: 'Pendaftaran disubmit',
      createdBy: userId,
    });

    return updated;
  }

  static async getUserApplications(userId: number) {
    return db
      .select({
        id: applications.id,
        noPendaftar: applications.noPendaftar,
        status: applications.status,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        sessionId: applications.sessionId,
        prodiPilihan1: applications.prodiPilihan1,
        prodiPilihan2: applications.prodiPilihan2,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(sql`${applications.createdAt} DESC`);
  }

  static async getApplicationDetail(applicationId: number, userId: number) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    return app;
  }

  static async getDocuments(applicationId: number) {
    return db
      .select()
      .from(applicantDocuments)
      .where(eq(applicantDocuments.applicationId, applicationId))
      .orderBy(applicantDocuments.createdAt);
  }

  static async uploadDocument(applicationId: number, requirementId: number, userId: number, file: { path: string; name: string; size: number; type: string }) {
    // Verify ownership
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft' && app.status !== 'documents_rejected') {
      throw new Error('Tidak bisa upload dokumen pada status saat ini');
    }

    // Increment version if re-upload
    const [existing] = await db
      .select({ version: applicantDocuments.version })
      .from(applicantDocuments)
      .where(and(eq(applicantDocuments.applicationId, applicationId), eq(applicantDocuments.requirementId, requirementId)))
      .orderBy(sql`${applicantDocuments.version} DESC`)
      .limit(1);

    const newVersion = existing ? existing.version + 1 : 1;

    const [doc] = await db
      .insert(applicantDocuments)
      .values({
        applicationId,
        requirementId,
        filePath: file.path,
        originalName: file.name,
        fileSizeKb: Math.round(file.size / 1024),
        mimeType: file.type,
        uploadMethod: 'upload',
        isVerified: false,
        version: newVersion,
      })
      .returning({ id: applicantDocuments.id });

    return doc;
  }

  static async submitDocumentLink(applicationId: number, requirementId: number, userId: number, fileLink: string) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');

    const [existing] = await db
      .select({ version: applicantDocuments.version })
      .from(applicantDocuments)
      .where(and(eq(applicantDocuments.applicationId, applicationId), eq(applicantDocuments.requirementId, requirementId)))
      .orderBy(sql`${applicantDocuments.version} DESC`)
      .limit(1);

    const newVersion = existing ? existing.version + 1 : 1;

    const [doc] = await db
      .insert(applicantDocuments)
      .values({
        applicationId,
        requirementId,
        fileLink,
        uploadMethod: 'link',
        isVerified: false,
        version: newVersion,
      })
      .returning({ id: applicantDocuments.id });

    return doc;
  }

  static async deleteDocument(documentId: number, userId: number) {
    const [doc] = await db
      .select({ applicationId: applicantDocuments.applicationId })
      .from(applicantDocuments)
      .where(eq(applicantDocuments.id, documentId))
      .limit(1);

    if (!doc) throw new Error('Dokumen tidak ditemukan');

    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, doc.applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');

    await db.delete(applicantDocuments).where(eq(applicantDocuments.id, documentId));
  }

  static async submitPaymentProof(applicationId: number, userId: number, data: { nominal: number; bankAsal?: string; namaPengirim?: string; buktiBayarPath: string }) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'passed') throw new Error('Status harus lulus untuk daftar ulang');

    const [payment] = await db
      .insert(reRegistrationPayments)
      .values({
        applicationId,
        nominal: data.nominal,
        buktiBayar: data.buktiBayarPath,
        bankAsal: data.bankAsal || null,
        namaPengirim: data.namaPengirim || null,
      })
      .returning({ id: reRegistrationPayments.id });

    await db
      .update(applications)
      .set({ status: 're_registration', buktiBayarPath: data.buktiBayarPath })
      .where(eq(applications.id, applicationId));

    await db.insert(applicationLogs).values({
      applicationId,
      statusFrom: 'passed',
      statusTo: 're_registration',
      message: 'Upload bukti bayar daftar ulang',
      createdBy: userId,
    });

    return payment;
  }

  static async getApplicationLogs(applicationId: number) {
    return db
      .select()
      .from(applicationLogs)
      .where(eq(applicationLogs.applicationId, applicationId))
      .orderBy(applicationLogs.createdAt);
  }
}
