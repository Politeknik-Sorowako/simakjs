import { Elysia } from 'elysia';
import { AdmisiController } from '../controllers/admisi.controller';
import { AdmisiAdminController } from '../controllers/admisi-admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createApplicationSchema,
  registerCalonSchema,
  submitApplicationSchema,
  submitDocumentLinkSchema,
  updateApplicationSchema,
  verifyEmailSchema,
} from '../schemas/admisi.schema';

export const admisiRoutes = new Elysia({ prefix: '/admisi' })
  .use(authMiddleware)
  // ─── PUBLIC ROUTES ───────────────────────────────────────────────
  .post('/register', AdmisiController.register, registerCalonSchema)
  .post('/verify-email', AdmisiController.verifyEmail, verifyEmailSchema)

  // ─── CALON MAHASISWA ROUTES ──────────────────────────────────────
  .get('/sessions', AdmisiController.getActiveSessions, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat sesi admisi aktif' },
  })
  .get('/sessions/:id/prodis', AdmisiController.getSessionProdis, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat prodi dalam sesi' },
  })
  .post('/apply', AdmisiController.createApplication, createApplicationSchema)
  .get('/applications', AdmisiController.getMyApplications, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat daftar pendaftaran' },
  })
  .get('/applications/:id', AdmisiController.getApplicationDetail, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Detail pendaftaran + dokumen + log' },
  })
  .put('/applications/:id', AdmisiController.updateApplication, updateApplicationSchema)
  .post('/applications/:id/submit', AdmisiController.submitApplication, submitApplicationSchema)

  // ─── DOKUMEN (multipart — type:none agar Elysia tidak parse body) ──
  .post('/applications/:id/documents', AdmisiController.uploadDocument, {
    type: 'none',
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Upload file dokumen' },
  } as any)
  .post('/applications/:id/documents/link', AdmisiController.submitDocumentLink, submitDocumentLinkSchema)
  .get('/applications/:id/documents', AdmisiController.getDocuments, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat dokumen pendaftaran' },
  })
  .delete('/documents/:id', AdmisiController.deleteDocument, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Hapus dokumen' },
  })

  // ─── DAFTAR ULANG (JSON) ──────────────────────────────────────────
  .post('/applications/:id/re-registration/payment', AdmisiController.submitPayment, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Kirim bukti bayar daftar ulang' },
  })

  // ─── DOKUMEN REQUIREMENTS ────────────────────────────────────────
  .get('/document-requirements', AdmisiController.getDocumentRequirements, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat syarat dokumen' },
  })
  .get('/documents/:id/file', AdmisiController.downloadFile, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Download file dokumen' },
  })
  .get('/announcements', AdmisiAdminController.getAnnouncements, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat pengumuman' },
  })
  .get('/announcements/:id/file', AdmisiController.downloadAnnouncementFile, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Download file pengumuman' },
  })
  .get('/payment/banks', AdmisiController.getActiveBanks, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Daftar bank VA aktif' },
  })
  .post('/applications/:id/payment/generate-va', AdmisiController.generateVA, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Generate VA untuk pembayaran' },
  })
  .get('/applications/:id/payment/status', AdmisiController.getPaymentStatus, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Status pembayaran' },
  });
