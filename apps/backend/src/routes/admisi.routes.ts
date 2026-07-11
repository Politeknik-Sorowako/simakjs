import { Elysia } from 'elysia';
import { AdmisiController } from '../controllers/admisi.controller';
import {
  registerCalonSchema,
  verifyEmailSchema,
  createApplicationSchema,
  updateApplicationSchema,
  submitApplicationSchema,
  submitDocumentLinkSchema,
} from '../schemas/admisi.schema';

export const admisiRoutes = new Elysia({ prefix: '/admisi' })
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

  // ─── DOKUMEN (multipart — no body schema) ─────────────────────────
  .post('/applications/:id/documents', AdmisiController.uploadDocument, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Upload file dokumen' },
  })
  .post('/applications/:id/documents/link', AdmisiController.submitDocumentLink, submitDocumentLinkSchema)
  .get('/applications/:id/documents', AdmisiController.getDocuments, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat dokumen pendaftaran' },
  })
  .delete('/documents/:id', AdmisiController.deleteDocument, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Hapus dokumen' },
  })

  // ─── DAFTAR ULANG (multipart — no body schema) ────────────────────
  .post('/applications/:id/re-registration/payment', AdmisiController.submitPayment, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Upload bukti bayar daftar ulang' },
  })

  // ─── DOKUMEN REQUIREMENTS ────────────────────────────────────────
  .get('/document-requirements', AdmisiController.getDocumentRequirements, {
    detail: { tags: ['Admisi - Calon Mahasiswa'], summary: 'Lihat syarat dokumen' },
  });
