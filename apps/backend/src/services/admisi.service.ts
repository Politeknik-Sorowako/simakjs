import { createHash, randomBytes } from 'crypto';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import {
  admissionSessionProdis,
  admissionSessions,
  applicantDocuments,
  applicationLogs,
  applications,
  documentRequirements,
  passwordResets,
  paymentVirtualAccounts,
  programStudi,
  reRegistrationPayments,
  users,
  vaBanks,
} from '../models/schema';
import { db } from '../utils/db';

export class AdmisiService {
  static async register(email: string, password: string, nama: string) {
    const hashed = await Bun.password.hash(password, { algorithm: 'bcrypt', cost: 12 });
    const [user] = await db
      .insert(users)
      .values({ email, password: hashed, nama, role: 'calon_mahasiswa', isActive: false })
      .returning({ id: users.id, email: users.email, nama: users.nama, role: users.role });

    // Generate email verification token
    const token = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await db.insert(passwordResets).values({
      email,
      token: hashedToken,
      expiresAt,
    });

    // TODO: Send email with verification token
    // For now, return the token for testing purposes
    return { ...user, verificationToken: token };
  }

  static async verifyEmailToken(token: string) {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    // Find the token in passwordResets table
    const [reset] = await db
      .select()
      .from(passwordResets)
      .where(and(eq(passwordResets.token, hashedToken), gt(passwordResets.expiresAt, new Date())))
      .limit(1);

    if (!reset) {
      return null;
    }

    // Activate the user
    const [user] = await db
      .update(users)
      .set({ isActive: true })
      .where(eq(users.email, reset.email))
      .returning({ id: users.id, email: users.email, role: users.role });

    // Delete the token
    await db.delete(passwordResets).where(eq(passwordResets.id, reset.id));

    return user;
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
      .where(sql`${applications.noPendaftar} LIKE ${`${prefix}%`}`);

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
        isActive: admissionSessionProdis.isActive,
      })
      .from(admissionSessionProdis)
      .leftJoin(programStudi, eq(admissionSessionProdis.prodiId, programStudi.id))
      .where(eq(admissionSessionProdis.sessionId, sessionId));
  }

  static async createApplication(
    userId: number,
    data: { sessionId: number; prodiPilihan1: number; prodiPilihan2?: number },
  ) {
    const noPendaftar = await this.generateNoPendaftar(data.sessionId);

    // Check session is active
    const [session] = await db
      .select()
      .from(admissionSessions)
      .where(and(eq(admissionSessions.id, data.sessionId), eq(admissionSessions.isActive, true)))
      .limit(1);

    if (!session) throw new Error('Sesi admisi tidak ditemukan atau tidak aktif');
    const todayLocal = (() => {
      const n = new Date();
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    })();
    if (session.tanggalMulai > todayLocal) throw new Error('Sesi admisi belum dimulai');
    if (session.tanggalTutup < todayLocal) throw new Error('Sesi admisi sudah ditutup');

    // Prevent duplicate application in same session
    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.sessionId, data.sessionId)))
      .limit(1);

    if (existing) throw new Error('Anda sudah mendaftar di sesi ini. Tidak dapat mendaftar lagi.');

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

  static async updateApplication(applicationId: number, userId: number, data: Record<string, unknown>) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft' && app.status !== 'documents_rejected' && app.status !== 'returned') {
      throw new Error('Pendaftaran sudah disubmit, tidak bisa diubah');
    }

    const [updated] = await db.update(applications).set(data).where(eq(applications.id, applicationId)).returning();

    return updated;
  }

  static async submitApplication(applicationId: number, userId: number) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft' && app.status !== 'returned') throw new Error('Pendaftaran sudah disubmit sebelumnya');

    // Validate required fields
    if (!app.namaLengkap || !app.nik || !app.tanggalLahir || !app.jenisKelamin || !app.namaIbuKandung) {
      throw new Error('Lengkapi biodata terlebih dahulu (nama, NIK, tanggal lahir, jenis kelamin, ibu kandung)');
    }

    // Validate required documents are uploaded
    const requirements = await db
      .select({ id: documentRequirements.id, namaDokumen: documentRequirements.namaDokumen })
      .from(documentRequirements)
      .where(and(eq(documentRequirements.sessionId, app.sessionId), eq(documentRequirements.isWajib, true)));

    const uploadedDocs = await db
      .select({ requirementId: applicantDocuments.requirementId })
      .from(applicantDocuments)
      .where(eq(applicantDocuments.applicationId, applicationId));

    const uploadedReqIds = new Set(uploadedDocs.map((d) => d.requirementId));
    const missing = requirements.filter((r) => !uploadedReqIds.has(r.id));

    if (missing.length > 0) {
      const names = missing.map((r) => r.namaDokumen).join(', ');
      throw new Error(`Upload dokumen wajib terlebih dahulu: ${names}`);
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
        sessionNama: admissionSessions.nama,
        sessionKode: admissionSessions.kode,
        tanggalMulai: admissionSessions.tanggalMulai,
        tanggalTutup: admissionSessions.tanggalTutup,
        tanggalUjian: admissionSessions.tanggalUjian,
        tanggalPengumuman: admissionSessions.tanggalPengumuman,
        prodiPilihan1: applications.prodiPilihan1,
        prodiPilihan2: applications.prodiPilihan2,
      })
      .from(applications)
      .leftJoin(admissionSessions, eq(applications.sessionId, admissionSessions.id))
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

    // Attach session info
    const [session] = await db
      .select({
        nama: admissionSessions.nama,
        kode: admissionSessions.kode,
        tanggalMulai: admissionSessions.tanggalMulai,
        tanggalTutup: admissionSessions.tanggalTutup,
        tanggalVerif: admissionSessions.tanggalVerif,
        tanggalUjian: admissionSessions.tanggalUjian,
        tanggalPengumuman: admissionSessions.tanggalPengumuman,
      })
      .from(admissionSessions)
      .where(eq(admissionSessions.id, app.sessionId))
      .limit(1);

    // Check if registration fee is 0 (free)
    const [sp] = await db
      .select({ biayaDaftar: admissionSessionProdis.biayaDaftar })
      .from(admissionSessionProdis)
      .where(
        and(eq(admissionSessionProdis.sessionId, app.sessionId), eq(admissionSessionProdis.prodiId, app.prodiPilihan1)),
      )
      .limit(1);
    const isFree = !sp?.biayaDaftar || sp.biayaDaftar === 0;

    // Attach prodi names
    const [prodi1] = await db
      .select({ nama: programStudi.nama, jenjang: programStudi.jenjang })
      .from(programStudi)
      .where(eq(programStudi.id, app.prodiPilihan1))
      .limit(1);

    let prodi2 = null;
    if (app.prodiPilihan2) {
      const [p2] = await db
        .select({ nama: programStudi.nama, jenjang: programStudi.jenjang })
        .from(programStudi)
        .where(eq(programStudi.id, app.prodiPilihan2))
        .limit(1);
      prodi2 = p2;
    }

    return {
      ...app,
      session: session || null,
      prodiPilihan1Data: prodi1 || null,
      prodiPilihan2Data: prodi2,
      isFree,
    };
  }

  static async getDocuments(applicationId: number) {
    return db
      .select()
      .from(applicantDocuments)
      .where(eq(applicantDocuments.applicationId, applicationId))
      .orderBy(applicantDocuments.createdAt);
  }

  static async uploadDocument(
    applicationId: number,
    requirementId: number,
    userId: number,
    file: { path: string; name: string; size: number; type: string },
  ) {
    // Verify ownership
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft' && app.status !== 'documents_rejected' && app.status !== 'returned') {
      throw new Error('Tidak bisa upload dokumen pada status saat ini');
    }

    // Increment version if re-upload
    const [existing] = await db
      .select({ version: applicantDocuments.version })
      .from(applicantDocuments)
      .where(
        and(eq(applicantDocuments.applicationId, applicationId), eq(applicantDocuments.requirementId, requirementId)),
      )
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
      .where(
        and(eq(applicantDocuments.applicationId, applicationId), eq(applicantDocuments.requirementId, requirementId)),
      )
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

  static async submitPaymentProof(
    applicationId: number,
    userId: number,
    data: { nominal: number; bankAsal?: string; namaPengirim?: string; buktiBayarPath: string },
  ) {
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

  // ─── VA PAYMENT ────────────────────────────────────────────────

  static async getActiveBanks() {
    return db.select().from(vaBanks).where(eq(vaBanks.isActive, true)).orderBy(vaBanks.nama);
  }

  static async generateVA(applicationId: number, userId: number, vaBankId: number) {
    const [app] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, applicationId), eq(applications.userId, userId)))
      .limit(1);
    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 'draft') throw new Error('Status pendaftaran tidak memungkinkan pembayaran');

    // Get fee from session_prodi
    const [sp] = await db
      .select({ biayaDaftar: admissionSessionProdis.biayaDaftar })
      .from(admissionSessionProdis)
      .where(
        and(eq(admissionSessionProdis.sessionId, app.sessionId), eq(admissionSessionProdis.prodiId, app.prodiPilihan1)),
      )
      .limit(1);
    const nominal = sp?.biayaDaftar || 150000;

    // Get bank info
    const [bank] = await db.select({ kode: vaBanks.kode }).from(vaBanks).where(eq(vaBanks.id, vaBankId)).limit(1);
    if (!bank) throw new Error('Bank tidak ditemukan');

    // Generate VA number with retry to handle unique constraint
    let vaNumber: string;
    let attempts = 0;
    const maxAttempts = 5;

    do {
      const uniq = String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 100)).padStart(2, '0');
      vaNumber = `988${uniq}${String(applicationId).padStart(4, '0')}`;
      attempts++;

      // Check if VA number already exists
      const [existing] = await db
        .select()
        .from(paymentVirtualAccounts)
        .where(eq(paymentVirtualAccounts.vaNumber, vaNumber))
        .limit(1);

      if (!existing) break;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Gagal generate nomor VA, silakan coba lagi');
    }

    // Expire in 7 days
    const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const [va] = await db
      .insert(paymentVirtualAccounts)
      .values({ applicationId, vaBankId, vaNumber: vaNumber!, nominal, expiredAt })
      .returning();

    // Update app status
    await db.update(applications).set({ status: 'awaiting_payment' }).where(eq(applications.id, applicationId));

    await db.insert(applicationLogs).values({
      applicationId,
      statusTo: 'awaiting_payment',
      message: `VA dibuat: ${vaNumber} (${bank.kode})`,
      createdBy: userId,
    });

    return { ...va, bankKode: bank.kode };
  }

  static async getPaymentStatus(applicationId: number) {
    return db
      .select()
      .from(paymentVirtualAccounts)
      .where(eq(paymentVirtualAccounts.applicationId, applicationId))
      .orderBy(paymentVirtualAccounts.createdAt);
  }
}
