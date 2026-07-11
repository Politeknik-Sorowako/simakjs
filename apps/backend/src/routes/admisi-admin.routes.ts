import { Elysia } from 'elysia';
import { AdmisiAdminController } from '../controllers/admisi-admin.controller';
import {
  createSessionSchema,
  updateSessionSchema,
  addSessionProdiSchema,
  createDocumentRequirementSchema,
  verifyDocumentSchema,
  createSelectionComponentSchema,
  inputScoreSchema,
  createExamScheduleSchema,
  verifyPaymentSchema,
  issueNimSchema,
  updateApplicationStatusSchema,
} from '../schemas/admisi-admin.schema';

export const admisiAdminRoutes = new Elysia({ prefix: '/admisi/admin' })
  // ─── SESI ────────────────────────────────────────────────────────
  .get('/sessions', AdmisiAdminController.getAllSessions, {
    detail: { tags: ['Admisi - Admin'], summary: 'Daftar semua sesi admisi' },
  })
  .get('/sessions/:id', AdmisiAdminController.getSessionDetail, {
    detail: { tags: ['Admisi - Admin'], summary: 'Detail sesi + prodi + syarat' },
  })
  .post('/sessions', AdmisiAdminController.createSession, createSessionSchema)
  .put('/sessions/:id', AdmisiAdminController.updateSession, updateSessionSchema)

  // ─── SESI PRODI ──────────────────────────────────────────────────
  .post('/sessions/:id/prodis', AdmisiAdminController.addProdiToSession, addSessionProdiSchema)
  .delete('/sessions/:id/prodis/:prodiId', AdmisiAdminController.removeProdiFromSession, {
    detail: { tags: ['Admisi - Admin'], summary: 'Hapus prodi dari sesi' },
  })
  .put('/sessions/:id/prodis/:prodiId/toggle', AdmisiAdminController.toggleProdiActive, {
    detail: { tags: ['Admisi - Admin'], summary: 'Aktif/nonaktifkan prodi dalam sesi' },
  })

  // ─── SYARAT DOKUMEN ──────────────────────────────────────────────
  .post('/document-requirements', AdmisiAdminController.createDocumentRequirement, createDocumentRequirementSchema)
  .put('/document-requirements/:id', AdmisiAdminController.updateDocumentRequirement, {
    detail: { tags: ['Admisi - Admin'], summary: 'Update syarat dokumen' },
  })
  .delete('/document-requirements/:id', AdmisiAdminController.deleteDocumentRequirement, {
    detail: { tags: ['Admisi - Admin'], summary: 'Hapus syarat dokumen' },
  })

  // ─── APLIKASI / VERIFIKASI ──────────────────────────────────────
  .get('/applications', AdmisiAdminController.getApplications, {
    detail: { tags: ['Admisi - Admin'], summary: 'Daftar pendaftar + filter' },
  })
  .post('/applications/:id/upload-document', AdmisiAdminController.adminUploadDocument, {
    type: 'none',
    detail: { tags: ['Admisi - Admin'], summary: 'Admin upload dokumen untuk peserta' },
  })
  .put('/documents/verify', AdmisiAdminController.verifyDocument, verifyDocumentSchema)
  .post('/applications/:id/verify-all-docs', AdmisiAdminController.verifyAllDocuments, {
    detail: { tags: ['Admisi - Admin'], summary: 'Verifikasi semua dokumen & ubah status' },
  })
  .post('/applications/:id/mark-verified', AdmisiAdminController.markDocsVerified, {
    detail: { tags: ['Admisi - Admin'], summary: 'Ubah status ke Terverifikasi (jika semua dokumen sdh verified)' },
  })
  .put('/applications/:id/status', AdmisiAdminController.updateApplicationStatus, updateApplicationStatusSchema)
  .post('/applications/:id/reopen', AdmisiAdminController.reopenApplication, {
    detail: { tags: ['Admisi - Admin'], summary: 'Buka akses peserta untuk lengkapi berkas' },
  })

  // ─── KOMPONEN PENILAIAN ─────────────────────────────────────────
  .get('/sessions/:id/components', AdmisiAdminController.getSelectionComponents, {
    detail: { tags: ['Admisi - Admin'], summary: 'Komponen penilaian sesi' },
  })
  .post('/components', AdmisiAdminController.createSelectionComponent, createSelectionComponentSchema)
  .delete('/components/:id', AdmisiAdminController.deleteSelectionComponent, {
    detail: { tags: ['Admisi - Admin'], summary: 'Hapus komponen penilaian' },
  })

  // ─── NILAI ───────────────────────────────────────────────────────
  .post('/scores', AdmisiAdminController.inputScore, inputScoreSchema)

  // ─── JADWAL UJIAN ────────────────────────────────────────────────
  .post('/exam-schedules', AdmisiAdminController.createExamSchedule, createExamScheduleSchema)
  .get('/sessions/:id/exam-schedules', AdmisiAdminController.getExamSchedules, {
    detail: { tags: ['Admisi - Admin'], summary: 'Jadwal ujian per sesi' },
  })

  // ─── DAFTAR ULANG ────────────────────────────────────────────────
  .get('/payments', AdmisiAdminController.getPayments, {
    detail: { tags: ['Admisi - Admin'], summary: 'Daftar pembayaran daftar ulang' },
  })
  .put('/payments/verify', AdmisiAdminController.verifyPayment, verifyPaymentSchema)

  // ─── NIM ─────────────────────────────────────────────────────────
  .get('/sessions/:id/prodis/:prodiId/generate-nim', AdmisiAdminController.generateNIMBulk, {
    detail: { tags: ['Admisi - Admin'], summary: 'Generate NIM bulk per prodi' },
  })
  .get('/validate-nim', AdmisiAdminController.validateNIM, {
    detail: { tags: ['Admisi - Admin'], summary: 'Validasi NIM unik' },
  })
  .post('/applications/:id/issue-nim', AdmisiAdminController.issueNIM, issueNimSchema)
  .put('/applications/:id/edit-nim', AdmisiAdminController.editNIM, {
    detail: { tags: ['Admisi - Admin'], summary: 'Edit NIM sebelum diterbitkan' },
  })

  // ─── PENGUMUMAN ──────────────────────────────────────────────────
  .get('/sessions/:id/candidates', AdmisiAdminController.getPassedCandidates, {
    detail: { tags: ['Admisi - Admin'], summary: 'Kandidat lulus/gagal' },
  })
  .post('/sessions/:id/announce', AdmisiAdminController.announceResults, {
    detail: { tags: ['Admisi - Admin'], summary: 'Terbitkan pengumuman kelulusan' },
  })

  // ─── STATISTIK & EXPORT ─────────────────────────────────────────
  .get('/stats', AdmisiAdminController.getDashboardStats, {
    detail: { tags: ['Admisi - Admin'], summary: 'Dashboard statistik' },
  })
  .get('/export', AdmisiAdminController.exportApplications, {
    detail: { tags: ['Admisi - Admin'], summary: 'Ekspor data pendaftar' },
  })

  // ─── PRODI ───────────────────────────────────────────────────────
  .get('/prodis', AdmisiAdminController.getAllProdi, {
    detail: { tags: ['Admisi - Admin'], summary: 'Daftar semua program studi' },
  })

  // ─── ANNOUNCEMENTS ──────────────────────────────────────────────
  .post('/announcements', AdmisiAdminController.createAnnouncement, {
    type: 'none',
    detail: { tags: ['Admisi - Admin'], summary: 'Buat pengumuman (support file upload)' },
  })
  .get('/announcements', AdmisiAdminController.getAnnouncements, {
    detail: { tags: ['Admisi - Admin'], summary: 'Lihat pengumuman' },
  })
  .put('/announcements/:id', AdmisiAdminController.updateAnnouncement, {
    type: 'none',
    detail: { tags: ['Admisi - Admin'], summary: 'Edit pengumuman (support file upload)' },
  })
  .delete('/announcements/:id', AdmisiAdminController.deleteAnnouncement, {
    detail: { tags: ['Admisi - Admin'], summary: 'Hapus pengumuman' },
  });
