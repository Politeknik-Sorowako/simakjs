import { Elysia } from 'elysia';
import { KhsController } from '../controllers/khs.controller';
import {
  getKhsSchema,
  getTranskripSchema,
  getExamEligibilitySchema,
  saveKonversiNilaiSchema,
  saveSkalaPredikatSchema
} from '../schemas/khs.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const khsRoutes = new Elysia({ prefix: '/khs' })
  .use(authMiddleware)
  .get('/mahasiswa/:mhsId/periode/:periodeId', KhsController.getByMhsIdAndPeriode, getKhsSchema)
  .get('/mahasiswa/:mhsId/transkrip', KhsController.getTranskrip, getTranskripSchema)
  .get('/mahasiswa/:mhsId/periode/:periodeId/eligibility', KhsController.getExamEligibility, getExamEligibilitySchema)
  
  // Konfigurasi Konversi Nilai
  .get('/konversi', KhsController.getAllKonversi)
  .post('/konversi', KhsController.saveKonversi, saveKonversiNilaiSchema)
  .delete('/konversi/:id', KhsController.deleteKonversi)

  // Konfigurasi Skala Predikat Kelulusan
  .get('/predikat', KhsController.getAllPredikat)
  .post('/predikat', KhsController.savePredikat, saveSkalaPredikatSchema)
  .delete('/predikat/:id', KhsController.deletePredikat);

