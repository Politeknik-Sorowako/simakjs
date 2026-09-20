import { Elysia } from 'elysia';
import { KhsController } from '../controllers/khs.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkSaveKonversiSchema,
  deleteKonversiSchema,
  deletePredikatSchema,
  getAllKonversiSchema,
  getAllPredikatSchema,
  getByNimSchema,
  getDetailNilaiMKSchema,
  getExamEligibilitySchema,
  getKhsSchema,
  getKonversiRekapSchema,
  getMatriksNilaiSchema,
  getPeriodeListSchema,
  getRekapNilaiSchema,
  getRekapPerProdiSchema,
  getRincianKomponenSchema,
  getTranskripSchema,
  pilihNilaiSchema,
  saveKonversiNilaiSchema,
  saveSkalaPredikatSchema,
} from '../schemas/khs.schema';

export const khsRoutes = new Elysia({ prefix: '/khs' })
  .use(authMiddleware)
  .get('/mahasiswa/:mhsId/periode/:periodeId', KhsController.getByMhsIdAndPeriode, getKhsSchema)
  .get('/mahasiswa/:mhsId/transkrip', KhsController.getTranskrip, getTranskripSchema)
  .get('/mahasiswa/:mhsId/periode-list', KhsController.getPeriodeList, getPeriodeListSchema)
  .get('/mahasiswa/:mhsId/periode/:periodeId/eligibility', KhsController.getExamEligibility, getExamEligibilitySchema)
  .get('/by-nim', KhsController.getByNim, getByNimSchema)
  .get('/rincian-komponen', KhsController.getRincianKomponen, getRincianKomponenSchema)
  .post('/pilih-nilai/:krsId', KhsController.pilihNilai, pilihNilaiSchema)

  // Rekap & Matriks Nilai
  .get('/rekap-nilai/:mhsId', KhsController.getRekapNilai, getRekapNilaiSchema)
  .get('/rekap-per-prodi', KhsController.getRekapPerProdi, getRekapPerProdiSchema)
  .get('/matriks-nilai', KhsController.getMatriksNilaiMK, getMatriksNilaiSchema)
  .get('/mata-kuliah/:mataKuliahId/detail-nilai', KhsController.getDetailNilaiMK, getDetailNilaiMKSchema)

  // Konfigurasi Konversi Nilai
  .get('/konversi', KhsController.getAllKonversi, getAllKonversiSchema)
  .get('/konversi/rekap', KhsController.getKonversiRekap, getKonversiRekapSchema)
  .post('/konversi', KhsController.saveKonversi, saveKonversiNilaiSchema)
  .post('/konversi/bulk', KhsController.bulkSaveKonversi, bulkSaveKonversiSchema)
  .delete('/konversi/:id', KhsController.deleteKonversi, deleteKonversiSchema)

  // Konfigurasi Skala Predikat Kelulusan
  .get('/predikat', KhsController.getAllPredikat, getAllPredikatSchema)
  .post('/predikat', KhsController.savePredikat, saveSkalaPredikatSchema)
  .delete('/predikat/:id', KhsController.deletePredikat, deletePredikatSchema);
