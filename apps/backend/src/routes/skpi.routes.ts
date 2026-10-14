import { Elysia } from 'elysia';
import { SkpiController } from '../controllers/skpi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createKategoriSkpiSchema,
  createKegiatanSkpiSchema,
  deleteKategoriSkpiSchema,
  deleteKegiatanSkpiSchema,
  getDokumenSkpiSchema,
  getKategoriSkpiSchema,
  getKegiatanByIdSkpiSchema,
  getKegiatanSkpiSchema,
  lampiranSkpiParamsSchema,
  listLampiranSkpiSchema,
  signDokumenSkpiSchema,
  updateKategoriSkpiSchema,
  updateKegiatanSkpiSchema,
  uploadLampiranSkpiSchema,
  verifyKegiatanSkpiSchema,
} from '../schemas/skpi.schema';

export const skpiRoutes = new Elysia({ prefix: '/skpi' })
  .use(authMiddleware)
  // Master kategori kegiatan
  .get('/kategori', SkpiController.getKategori, getKategoriSkpiSchema)
  .post('/kategori', SkpiController.createKategori, createKategoriSkpiSchema)
  .put('/kategori/:id', SkpiController.updateKategori, updateKategoriSkpiSchema)
  .delete('/kategori/:id', SkpiController.deleteKategori, deleteKategoriSkpiSchema)
  // Rekaman kegiatan mahasiswa
  .get('/kegiatan', SkpiController.getAll, getKegiatanSkpiSchema)
  .get('/kegiatan/:id', SkpiController.getById, getKegiatanByIdSkpiSchema)
  .post('/kegiatan', SkpiController.create, createKegiatanSkpiSchema)
  .put('/kegiatan/:id', SkpiController.update, updateKegiatanSkpiSchema)
  .delete('/kegiatan/:id', SkpiController.delete, deleteKegiatanSkpiSchema)
  .put('/kegiatan/:id/verifikasi', SkpiController.verify, verifyKegiatanSkpiSchema)
  // Dokumen SKPI (siap cetak + TTE / QR)
  .get('/dokumen/:mhsId', SkpiController.getDokumen, getDokumenSkpiSchema)
  .post('/dokumen/:mhsId/sign', SkpiController.signDokumen, signDokumenSkpiSchema)
  // Lampiran sertifikat
  .get('/kegiatan/:id/lampiran', SkpiController.listLampiran, listLampiranSkpiSchema)
  .post('/kegiatan/:id/lampiran', SkpiController.uploadLampiran, uploadLampiranSkpiSchema)
  .get('/kegiatan/:id/lampiran/:lampiranId/file', SkpiController.downloadLampiran, lampiranSkpiParamsSchema)
  .delete('/kegiatan/:id/lampiran/:lampiranId', SkpiController.deleteLampiran, lampiranSkpiParamsSchema);
