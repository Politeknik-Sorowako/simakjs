import { Elysia } from 'elysia';
import { KhsController } from '../controllers/khs.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  deleteKonversiSchema,
  deletePredikatSchema,
  getAllKonversiSchema,
  getAllPredikatSchema,
  getExamEligibilitySchema,
  getKhsSchema,
  getMatriksNilaiSchema,
  getRekapNilaiSchema,
  getRekapPerProdiSchema,
  getTranskripSchema,
  saveKonversiNilaiSchema,
  saveSkalaPredikatSchema,
} from '../schemas/khs.schema';

export const khsRoutes = new Elysia({ prefix: '/khs' })
  .use(authMiddleware)
  .get('/mahasiswa/:mhsId/periode/:periodeId', KhsController.getByMhsIdAndPeriode, getKhsSchema)
  .get('/mahasiswa/:mhsId/transkrip', KhsController.getTranskrip, getTranskripSchema)
  .get('/mahasiswa/:mhsId/periode/:periodeId/eligibility', KhsController.getExamEligibility, getExamEligibilitySchema)

  // Rekap & Matriks Nilai
  .get('/rekap-nilai/:mhsId', KhsController.getRekapNilai, getRekapNilaiSchema)
  .get('/rekap-per-prodi', KhsController.getRekapPerProdi, getRekapPerProdiSchema)
  .get('/matriks-nilai', KhsController.getMatriksNilaiMK, getMatriksNilaiSchema)

  // Konfigurasi Konversi Nilai
  .get('/konversi', KhsController.getAllKonversi, getAllKonversiSchema)
  .post('/konversi', KhsController.saveKonversi, saveKonversiNilaiSchema)
  .delete('/konversi/:id', KhsController.deleteKonversi, deleteKonversiSchema)

  // Konfigurasi Skala Predikat Kelulusan
  .get('/predikat', KhsController.getAllPredikat, getAllPredikatSchema)
  .post('/predikat', KhsController.savePredikat, saveSkalaPredikatSchema)
  .delete('/predikat/:id', KhsController.deletePredikat, deletePredikatSchema);
