import { and, eq, inArray, like, sql } from 'drizzle-orm';
import {
  admissionSessionProdis,
  admissionSessions,
  announcements,
  applicantDocuments,
  applicationLogs,
  applications,
  documentRequirements,
  examSchedules,
  mahasiswa,
  paymentVirtualAccounts,
  programStudi,
  reRegistrationPayments,
  selectionComponents,
  selectionScores,
  users,
  vaBanks,
} from '../models/schema';
import { db } from '../utils/db';

export class AdmisiAdminService {
  // ─── SESSION MANAGEMENT ──────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
  static async createSession(data: any) {
    const [session] = await db
      .insert(admissionSessions)
      .values({
        kode: data.kode,
        nama: data.nama,
        deskripsi: data.deskripsi,
        tanggalMulai: data.tanggalMulai,
        tanggalTutup: data.tanggalTutup,
        tanggalVerif: data.tanggalVerif || null,
        tanggalUjian: data.tanggalUjian || null,
        tanggalPengumuman: data.tanggalPengumuman || null,
        kuota: data.kuota || null,
      })
      .returning({ id: admissionSessions.id });

    return session;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
  static async updateSession(sessionId: number, data: any) {
    const [updated] = await db
      .update(admissionSessions)
      .set(data)
      .where(eq(admissionSessions.id, sessionId))
      .returning();

    return updated;
  }

  static async getAllSessions() {
    return db.select().from(admissionSessions).orderBy(sql`${admissionSessions.tanggalMulai} DESC`);
  }

  static async getSessionDetail(sessionId: number) {
    const [session] = await db.select().from(admissionSessions).where(eq(admissionSessions.id, sessionId)).limit(1);

    if (!session) throw new Error('Sesi tidak ditemukan');

    const prodis = await db
      .select({
        id: admissionSessionProdis.id,
        sessionId: admissionSessionProdis.sessionId,
        prodiId: admissionSessionProdis.prodiId,
        kuota: admissionSessionProdis.kuota,
        passingGrade: admissionSessionProdis.passingGrade,
        biayaDaftar: admissionSessionProdis.biayaDaftar,
        isActive: admissionSessionProdis.isActive,
        kodeProdi: programStudi.kode,
        namaProdi: programStudi.nama,
        jenjang: programStudi.jenjang,
      })
      .from(admissionSessionProdis)
      .leftJoin(programStudi, eq(admissionSessionProdis.prodiId, programStudi.id))
      .where(eq(admissionSessionProdis.sessionId, sessionId));

    const requirements = await db
      .select()
      .from(documentRequirements)
      .where(eq(documentRequirements.sessionId, sessionId))
      .orderBy(documentRequirements.urutan);

    return { ...session, prodis, requirements };
  }

  // ─── SESSION-PRODI MANAGEMENT ────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
  static async addProdiToSession(sessionId: number, data: any) {
    const [sp] = await db
      .insert(admissionSessionProdis)
      .values({
        sessionId,
        prodiId: data.prodiId,
        kuota: data.kuota || null,
        passingGrade: data.passingGrade || null,
        biayaDaftar: data.biayaDaftar || null,
      })
      .returning();

    return sp;
  }

  static async removeProdiFromSession(sessionId: number, prodiId: number) {
    await db
      .delete(admissionSessionProdis)
      .where(and(eq(admissionSessionProdis.sessionId, sessionId), eq(admissionSessionProdis.prodiId, prodiId)));
  }

  static async toggleProdiActive(sessionId: number, prodiId: number) {
    const [sp] = await db
      .select({ isActive: admissionSessionProdis.isActive })
      .from(admissionSessionProdis)
      .where(and(eq(admissionSessionProdis.sessionId, sessionId), eq(admissionSessionProdis.prodiId, prodiId)))
      .limit(1);

    if (!sp) throw new Error('Prodi tidak ditemukan di sesi ini');

    const [updated] = await db
      .update(admissionSessionProdis)
      .set({ isActive: !sp.isActive })
      .where(and(eq(admissionSessionProdis.sessionId, sessionId), eq(admissionSessionProdis.prodiId, prodiId)))
      .returning({ id: admissionSessionProdis.id, isActive: admissionSessionProdis.isActive });

    return updated;
  }

  // ─── DOCUMENT REQUIREMENTS ───────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
  static async createDocumentRequirement(data: any) {
    const [req] = await db
      .insert(documentRequirements)
      .values({
        sessionId: data.sessionId,
        prodiId: data.prodiId || null,
        namaDokumen: data.namaDokumen,
        deskripsi: data.deskripsi || null,
        isWajib: data.isWajib !== undefined ? data.isWajib : true,
        formatFile: data.formatFile || null,
        maxSizeKb: data.maxSizeKb || 2048,
        urutan: data.urutan || 0,
      })
      .returning();

    return req;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic update type
  static async updateDocumentRequirement(reqId: number, data: any) {
    const [updated] = await db
      .update(documentRequirements)
      .set(data)
      .where(eq(documentRequirements.id, reqId))
      .returning();

    return updated;
  }

  static async deleteDocumentRequirement(reqId: number) {
    await db.delete(documentRequirements).where(eq(documentRequirements.id, reqId));
  }

  // ─── APPLICATION / VERIFICATION ──────────────────────────────────

  static async adminUploadDocument(
    applicationId: number,
    requirementId: number,
    fileData: { path: string; name: string; size: number; type: string },
  ) {
    const [doc] = await db
      .insert(applicantDocuments)
      .values({
        applicationId,
        requirementId,
        filePath: fileData.path,
        originalName: fileData.name,
        fileSizeKb: Math.round(fileData.size / 1024),
        mimeType: fileData.type,
        uploadMethod: 'upload',
        isVerified: false,
        version: 1,
      })
      .returning({ id: applicantDocuments.id });
    return doc;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic update type
  static async updateAppBiodata(applicationId: number, data: Record<string, any>) {
    const [updated] = await db.update(applications).set(data).where(eq(applications.id, applicationId)).returning();
    return updated;
  }

  static async updateAppProdi(applicationId: number, prodiPilihan1: number, prodiPilihan2?: number | null) {
    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
    if (!app) throw new Error('Pendaftaran tidak ditemukan');

    const [updated] = await db
      .update(applications)
      .set({ prodiPilihan1, prodiPilihan2: prodiPilihan2 ?? null })
      .where(eq(applications.id, applicationId))
      .returning();

    return updated;
  }

  static async getApplications(filters: {
    sessionId?: number;
    prodiId?: number;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const conditions = [];

    if (filters.sessionId) conditions.push(eq(applications.sessionId, filters.sessionId));
    if (filters.prodiId) conditions.push(eq(applications.prodiPilihan1, filters.prodiId));
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
    if (filters.status) conditions.push(eq(applications.status, filters.status as any));
    if (filters.search) {
      conditions.push(
        sql`(${applications.namaLengkap} ILIKE ${`%${filters.search}%`} OR ${applications.noPendaftar} ILIKE ${`%${filters.search}%`} OR ${applications.nik} ILIKE ${`%${filters.search}%`})`,
      );
    }

    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 100);
    const offset = (page - 1) * limit;

    const data = await db
      .select()
      .from(applications)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${applications.createdAt} DESC`)
      .offset(offset)
      .limit(limit);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(conditions.length ? and(...conditions) : undefined);

    return {
      data,
      meta: {
        total: Number(countResult.count),
        page,
        limit,
        totalPages: Math.ceil(Number(countResult.count) / limit),
      },
    };
  }

  static async verifyDocument(documentId: number, adminId: number, isVerified: boolean, rejectionNote?: string) {
    const [doc] = await db
      .update(applicantDocuments)
      .set({
        isVerified,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionNote: rejectionNote || null,
      })
      .where(eq(applicantDocuments.id, documentId))
      .returning();

    if (!doc) throw new Error('Dokumen tidak ditemukan');

    return doc;
  }

  static async verifyAllDocuments(applicationId: number, adminId: number) {
    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
    if (!app) throw new Error('Pendaftaran tidak ditemukan');

    const reqs = await db
      .select({ id: documentRequirements.id })
      .from(documentRequirements)
      .where(and(eq(documentRequirements.sessionId, app.sessionId), eq(documentRequirements.isWajib, true)));

    const reqIds = reqs.map((r) => r.id);
    let pendingDocs: { id: number }[] = [];
    if (reqIds.length > 0) {
      pendingDocs = await db
        .select({ id: applicantDocuments.id })
        .from(applicantDocuments)
        .where(
          and(
            eq(applicantDocuments.applicationId, applicationId),
            eq(applicantDocuments.isVerified, false),
            inArray(applicantDocuments.requirementId, reqIds),
          ),
        );
    }

    for (const doc of pendingDocs) {
      await this.verifyDocument(doc.id, adminId, true);
    }

    await this.updateApplicationStatus(applicationId, 'documents_verified', adminId, 'Semua dokumen terverifikasi');

    return { verifiedCount: pendingDocs.length };
  }

  static async markDocsVerified(applicationId: number, adminId: number) {
    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);
    if (!app) throw new Error('Pendaftaran tidak ditemukan');

    const reqs = await db
      .select({ id: documentRequirements.id, namaDokumen: documentRequirements.namaDokumen })
      .from(documentRequirements)
      .where(and(eq(documentRequirements.sessionId, app.sessionId), eq(documentRequirements.isWajib, true)));

    if (reqs.length === 0) throw new Error('Tidak ada persyaratan dokumen untuk sesi ini');

    for (const req of reqs) {
      const [verified] = await db
        .select({ id: applicantDocuments.id })
        .from(applicantDocuments)
        .where(
          and(
            eq(applicantDocuments.applicationId, applicationId),
            eq(applicantDocuments.requirementId, req.id),
            eq(applicantDocuments.isVerified, true),
          ),
        )
        .limit(1);
      if (!verified) throw new Error(`Dokumen "${req.namaDokumen}" belum terverifikasi`);
    }

    await this.updateApplicationStatus(
      applicationId,
      'documents_verified',
      adminId,
      'Semua dokumen telah terverifikasi',
    );

    return { message: 'Status diubah ke Terverifikasi' };
  }

  static async updateApplicationStatus(applicationId: number, status: string, adminId: number, notes?: string) {
    const [app] = await db
      .select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');

    const [updated] = await db
      .update(applications)
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
      .set({ status: status as any, notes: notes || null })
      .where(eq(applications.id, applicationId))
      .returning();

    await db.insert(applicationLogs).values({
      applicationId,
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
      statusFrom: app.status as any,
      // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
      statusTo: status as any,
      message: notes || `Status diubah dari ${app.status} ke ${status}`,
      createdBy: adminId,
    });

    return updated;
  }

  // ─── SELECTION COMPONENTS ────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
  static async createSelectionComponent(data: any) {
    const [comp] = await db
      .insert(selectionComponents)
      .values({
        sessionId: data.sessionId,
        prodiId: data.prodiId || null,
        namaKomponen: data.namaKomponen,
        bobot: data.bobot,
        tipePenilai: data.tipePenilai || 'admin',
        urutan: data.urutan || 0,
      })
      .returning();

    return comp;
  }

  static async getSelectionComponents(sessionId: number, prodiId?: number) {
    const conditions = [eq(selectionComponents.sessionId, sessionId)];
    if (prodiId) conditions.push(eq(selectionComponents.prodiId, prodiId));

    return db
      .select()
      .from(selectionComponents)
      .where(and(...conditions))
      .orderBy(selectionComponents.urutan);
  }

  static async deleteSelectionComponent(componentId: number) {
    await db.delete(selectionComponents).where(eq(selectionComponents.id, componentId));
  }

  // ─── SCORES ──────────────────────────────────────────────────────

  static async inputScore(applicationId: number, componentId: number, score: number, scoredBy: number, notes?: string) {
    const [existing] = await db
      .select()
      .from(selectionScores)
      .where(and(eq(selectionScores.applicationId, applicationId), eq(selectionScores.componentId, componentId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(selectionScores)
        .set({ score: String(score), notes: notes || null, scoredBy })
        .where(eq(selectionScores.id, existing.id))
        .returning();
      return updated;
    }

    const [newScore] = await db
      .insert(selectionScores)
      .values({ applicationId, componentId, score: String(score), scoredBy, notes: notes || null })
      .returning();

    return newScore;
  }

  static async calculateFinalScore(applicationId: number) {
    const scores = await db
      .select({
        score: selectionScores.score,
        bobot: selectionComponents.bobot,
      })
      .from(selectionScores)
      .innerJoin(selectionComponents, eq(selectionScores.componentId, selectionComponents.id))
      .where(eq(selectionScores.applicationId, applicationId));

    if (!scores.length) return null;

    let finalScore = 0;
    for (const s of scores) {
      finalScore += Number(s.score) * (Number(s.bobot) / 100);
    }

    await db
      .update(applications)
      .set({ finalScore: String(finalScore) })
      .where(eq(applications.id, applicationId));

    return finalScore;
  }

  // ─── EXAM SCHEDULES ──────────────────────────────────────────────

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic insert type
  static async createExamSchedule(data: any) {
    const [schedule] = await db
      .insert(examSchedules)
      .values({
        applicationId: data.applicationId,
        sessionId: data.sessionId,
        reviewerId: data.reviewerId || null,
        tipeUjian: data.tipeUjian,
        tanggal: data.tanggal,
        waktuMulai: data.waktuMulai,
        waktuSelesai: data.waktuSelesai || null,
        lokasiType: data.lokasiType || 'kampus',
        lokasiDetail: data.lokasiDetail || null,
        catatan: data.catatan || null,
      })
      .returning();

    return schedule;
  }

  static async getExamSchedules(sessionId: number) {
    return db.select().from(examSchedules).where(eq(examSchedules.sessionId, sessionId)).orderBy(examSchedules.tanggal);
  }

  // ─── RE-REGISTRATION ─────────────────────────────────────────────

  static async getReRegistrationPayments(applicationId?: number) {
    const conditions = [];
    if (applicationId) conditions.push(eq(reRegistrationPayments.applicationId, applicationId));

    return db
      .select()
      .from(reRegistrationPayments)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${reRegistrationPayments.paidAt} DESC`);
  }

  static async verifyPayment(paymentId: number, adminId: number, isVerified: boolean, rejectionNote?: string) {
    const [payment] = await db
      .update(reRegistrationPayments)
      .set({
        isVerified,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        rejectionNote: rejectionNote || null,
      })
      .where(eq(reRegistrationPayments.id, paymentId))
      .returning();

    if (!payment) throw new Error('Pembayaran tidak ditemukan');
    return payment;
  }

  // ─── NIM GENERATION ──────────────────────────────────────────────

  static async generateNIMBulk(sessionId: number, prodiId: number) {
    const apps = await db
      .select({ id: applications.id, namaLengkap: applications.namaLengkap })
      .from(applications)
      .where(
        and(
          eq(applications.sessionId, sessionId),
          eq(applications.prodiPilihan1, prodiId),
          eq(applications.status, 're_registration'),
        ),
      )
      .orderBy(applications.namaLengkap);

    const [prodi] = await db
      .select({ kode: programStudi.kode })
      .from(programStudi)
      .where(eq(programStudi.id, prodiId))
      .limit(1);

    if (!prodi) throw new Error('Prodi tidak ditemukan');

    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const prefix = `2${yearSuffix}${prodi.kode}`;

    // Find highest existing NIM with this prefix
    const [existing] = await db
      .select({ nim: applications.nimDiterbitkan })
      .from(applications)
      .where(and(like(applications.nimDiterbitkan, `${prefix}%`), eq(applications.sessionId, sessionId)))
      .orderBy(sql`${applications.nimDiterbitkan} DESC NULLS LAST`)
      .limit(1);

    let startNum = 1;
    if (existing?.nim) {
      const numPart = existing.nim.slice(prefix.length);
      startNum = parseInt(numPart, 10) + 1;
    }

    const results = [];
    for (let i = 0; i < apps.length; i++) {
      const nim = `${prefix}${(startNum + i).toString().padStart(3, '0')}`;
      results.push({ applicationId: apps[i].id, nama: apps[i].namaLengkap, nim });
    }

    return results;
  }

  static async validateNIM(nim: string): Promise<boolean> {
    const [existing] = await db.select().from(mahasiswa).where(eq(mahasiswa.nim, nim)).limit(1);

    return !existing;
  }

  static async issueNIM(applicationId: number, nim: string, adminId: number) {
    // Validate NIM is unique
    if (!(await this.validateNIM(nim))) {
      throw new Error(`NIM ${nim} sudah terdaftar`);
    }

    const [app] = await db.select().from(applications).where(eq(applications.id, applicationId)).limit(1);

    if (!app) throw new Error('Pendaftaran tidak ditemukan');
    if (app.status !== 're_registration') throw new Error('Status harus daftar ulang untuk menerbitkan NIM');

    // Fetch user email before transaction
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, app.userId)).limit(1);
    if (!user) throw new Error('User tidak ditemukan');

    return db.transaction(async (tx) => {
      // Update application
      await tx
        .update(applications)
        .set({
          nimDiterbitkan: nim,
          status: 'nim_issued',
          isReRegistered: true,
          reRegisteredAt: new Date(),
        })
        .where(eq(applications.id, applicationId));

      // Insert into mahasiswa with user email directly
      const [mhs] = await tx
        .insert(mahasiswa)
        .values({
          nim,
          nama: app.namaLengkap || '',
          email: user.email,
          angkatan: String(new Date().getFullYear()),
          programStudiId: app.prodiPilihan1,
          status: 'aktif',
          namaIbuKandung: app.namaIbuKandung || '',
          nik: app.nik || '',
          jenisKelamin: app.jenisKelamin || 'L',
          tanggalLahir: app.tanggalLahir || '2000-01-01',
          tempatLahir: app.tempatLahir || '',
          idAgama: app.idAgama || null,
          jalan: app.jalan || null,
          rt: app.rt || null,
          rw: app.rw || null,
          kodePos: app.kodePos || null,
          kewarganegaraan: app.kewarganegaraan || 'ID',
        })
        .returning({ id: mahasiswa.id });

      // Update user role to mahasiswa
      await tx.update(users).set({ role: 'mahasiswa', isActive: true }).where(eq(users.id, app.userId));

      // Log
      await tx.insert(applicationLogs).values({
        applicationId,
        statusFrom: 're_registration',
        statusTo: 'nim_issued',
        message: `NIM ${nim} diterbitkan`,
        createdBy: adminId,
      });

      return { nim, mahasiswaId: mhs.id };
    });
  }

  static async editNIM(applicationId: number, nim: string) {
    if (!(await this.validateNIM(nim))) {
      throw new Error(`NIM ${nim} sudah terdaftar`);
    }

    const [updated] = await db
      .update(applications)
      .set({ nimDiterbitkan: nim })
      .where(eq(applications.id, applicationId))
      .returning({ nimDiterbitkan: applications.nimDiterbitkan });

    return updated;
  }

  // ─── ANNOUNCEMENT ────────────────────────────────────────────────

  static async getPassedCandidates(sessionId: number, prodiId?: number) {
    const conditions = [eq(applications.sessionId, sessionId), eq(applications.status, 'exam_completed')];
    if (prodiId) conditions.push(eq(applications.prodiPilihan1, prodiId));

    const candidates = await db
      .select({
        id: applications.id,
        noPendaftar: applications.noPendaftar,
        namaLengkap: applications.namaLengkap,
        finalScore: applications.finalScore,
        prodiPilihan1: applications.prodiPilihan1,
      })
      .from(applications)
      .where(and(...conditions));

    // Get passing grades
    const prodis = await db
      .select({
        prodiId: admissionSessionProdis.prodiId,
        passingGrade: admissionSessionProdis.passingGrade,
      })
      .from(admissionSessionProdis)
      .where(eq(admissionSessionProdis.sessionId, sessionId));

    const pgMap = new Map(prodis.map((p) => [p.prodiId, Number(p.passingGrade)]));

    const result: {
      passed: {
        id: number;
        noPendaftar: string | null;
        namaLengkap: string | null;
        finalScore: string | null;
        prodiPilihan1: number | null;
      }[];
      failed: {
        id: number;
        noPendaftar: string | null;
        namaLengkap: string | null;
        finalScore: string | null;
        prodiPilihan1: number | null;
      }[];
    } = { passed: [], failed: [] };
    for (const c of candidates) {
      const pg = pgMap.get(c.prodiPilihan1) || 0;
      if (c.finalScore && Number(c.finalScore) >= pg) {
        result.passed.push(c);
      } else {
        result.failed.push(c);
      }
    }

    return result;
  }

  static async announceResults(sessionId: number, adminId: number) {
    const { passed, failed } = await this.getPassedCandidates(sessionId);

    for (const p of passed) {
      await this.updateApplicationStatus(p.id, 'passed', adminId, 'Lulus seleksi');
    }
    for (const f of failed) {
      await this.updateApplicationStatus(f.id, 'failed', adminId, 'Tidak lulus seleksi');
    }

    return { passed: passed.length, failed: failed.length };
  }

  // ─── STATISTICS ──────────────────────────────────────────────────

  static async getDashboardStats() {
    const [totalPendaftar] = await db.select({ count: sql<number>`count(*)` }).from(applications);

    const [todayPendaftar] = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(sql`DATE(${applications.createdAt}) = CURRENT_DATE`);

    const statusCounts = await db
      .select({
        status: applications.status,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .groupBy(applications.status);

    const perProdi = await db
      .select({
        prodiId: applications.prodiPilihan1,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      .groupBy(applications.prodiPilihan1);

    return {
      totalPendaftar: Number(totalPendaftar.count),
      todayPendaftar: Number(todayPendaftar.count),
      statusCounts: statusCounts.map((s) => ({ status: s.status, count: Number(s.count) })),
      perProdi: perProdi.map((p) => ({ prodiId: p.prodiId, count: Number(p.count) })),
    };
  }

  static async exportApplications(filters: { sessionId?: number; prodiId?: number; status?: string }) {
    const conditions = [];
    if (filters.sessionId) conditions.push(eq(applications.sessionId, filters.sessionId));
    if (filters.prodiId) conditions.push(eq(applications.prodiPilihan1, filters.prodiId));
    // biome-ignore lint/suspicious/noExplicitAny: Drizzle enum type mismatch
    if (filters.status) conditions.push(eq(applications.status, filters.status as any));

    return db
      .select()
      .from(applications)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(applications.createdAt);
  }

  // ─── ANNOUNCEMENTS ──────────────────────────────────────────────

  static async createAnnouncement(data: {
    judul: string;
    isi: string;
    createdBy: number;
    sessionId?: number;
    isPinned?: boolean;
    filePath?: string;
    fileName?: string;
  }) {
    const [a] = await db
      .insert(announcements)
      .values({
        judul: data.judul,
        isi: data.isi,
        createdBy: data.createdBy,
        sessionId: data.sessionId || null,
        isPinned: data.isPinned || false,
        filePath: data.filePath || null,
        fileName: data.fileName || null,
      })
      .returning();
    return a;
  }

  static async getAnnouncements(sessionId?: number) {
    const conditions = [eq(announcements.isActive, true)];
    if (sessionId) conditions.push(eq(announcements.sessionId, sessionId));

    return db
      .select()
      .from(announcements)
      .where(and(...conditions))
      .orderBy(sql`${announcements.isPinned} DESC, ${announcements.createdAt} DESC`);
  }

  static async updateAnnouncement(
    id: number,
    data: { judul?: string; isi?: string; isPinned?: boolean; filePath?: string; fileName?: string },
  ) {
    const [updated] = await db.update(announcements).set(data).where(eq(announcements.id, id)).returning();
    return updated;
  }

  static async deleteAnnouncement(id: number) {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // ─── VA BANKS ──────────────────────────────────────────────────

  static async getAllVABanks() {
    return db.select().from(vaBanks).orderBy(vaBanks.nama);
  }

  static async createVABank(data: { kode: string; nama: string; isMidtrans?: boolean }) {
    const [bank] = await db
      .insert(vaBanks)
      .values({ kode: data.kode, nama: data.nama, isMidtrans: data.isMidtrans || false })
      .returning();
    return bank;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Drizzle dynamic update type
  static async updateVABank(id: number, data: any) {
    const [bank] = await db.update(vaBanks).set(data).where(eq(vaBanks.id, id)).returning();
    return bank;
  }

  static async deleteVABank(id: number) {
    await db.delete(vaBanks).where(eq(vaBanks.id, id));
  }

  // ─── PAYMENT VERIFICATION ──────────────────────────────────────

  static async getPendingPayments() {
    return db
      .select()
      .from(paymentVirtualAccounts)
      .where(and(eq(paymentVirtualAccounts.isPaid, false), sql`${paymentVirtualAccounts.expiredAt} > NOW()`))
      .orderBy(paymentVirtualAccounts.createdAt);
  }

  static async verifyVAPayment(vaId: number, adminId: number) {
    const [va] = await db
      .update(paymentVirtualAccounts)
      .set({ isPaid: true, paidAt: new Date(), verifiedBy: adminId })
      .where(eq(paymentVirtualAccounts.id, vaId))
      .returning();

    if (!va) throw new Error('VA tidak ditemukan');

    // Update app status to submitted
    await this.updateApplicationStatus(va.applicationId, 'submitted', adminId, 'Pembayaran diverifikasi');

    return va;
  }
}
