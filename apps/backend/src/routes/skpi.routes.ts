import { Elysia } from 'elysia';
import { SkpiController } from '../controllers/skpi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkRevokeDokumenSkpiSchema,
  bulkSignDokumenSkpiSchema,
  createKategoriSkpiSchema,
  createKegiatanSkpiSchema,
  deleteKategoriSkpiSchema,
  deleteKegiatanSkpiSchema,
  editHasilVerifikasiSkpiSchema,
  getDokumenSkpiSchema,
  getKategoriSkpiSchema,
  getKegiatanByIdSkpiSchema,
  getKegiatanSkpiSchema,
  getPenerbitanSkpiSchema,
  importKegiatanSkpiSchema,
  lampiranSkpiParamsSchema,
  listLampiranSkpiSchema,
  revokeDokumenSkpiSchema,
  signDokumenSkpiSchema,
  unverifyKegiatanSkpiSchema,
  updateKategoriSkpiSchema,
  updateKegiatanSkpiSchema,
  uploadLampiranSkpiSchema,
  verifyBulkKegiatanSkpiSchema,
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
  // Segmen statis dideklarasikan sebelum `/kegiatan/:id/*` agar tidak tertelan param route.
  .post('/kegiatan/import', SkpiController.importKegiatan, importKegiatanSkpiSchema)
  .post('/kegiatan/verifikasi-bulk', SkpiController.verifyBulk, verifyBulkKegiatanSkpiSchema)
  .put('/kegiatan/:id', SkpiController.update, updateKegiatanSkpiSchema)
  .delete('/kegiatan/:id', SkpiController.delete, deleteKegiatanSkpiSchema)
  .put('/kegiatan/:id/verifikasi', SkpiController.verify, verifyKegiatanSkpiSchema)
  .put('/kegiatan/:id/unverify', SkpiController.unverify, unverifyKegiatanSkpiSchema)
  .put('/kegiatan/:id/hasil-verifikasi', SkpiController.editHasilVerifikasi, editHasilVerifikasiSkpiSchema)
  // Penerbitan SKPI (tab terpadu: terbit/cabut tunggal & massal)
  .get('/penerbitan', SkpiController.getPenerbitan, getPenerbitanSkpiSchema)
  // Dokumen SKPI (siap cetak + TTE / QR) — statis sebelum `/:mhsId` agar tidak tertelan.
  .post('/dokumen/bulk-sign', SkpiController.signDokumenBulk, bulkSignDokumenSkpiSchema)
  .post('/dokumen/bulk-revoke', SkpiController.revokeDokumenBulk, bulkRevokeDokumenSkpiSchema)
  .get('/dokumen/:mhsId', SkpiController.getDokumen, getDokumenSkpiSchema)
  .post('/dokumen/:mhsId/sign', SkpiController.signDokumen, signDokumenSkpiSchema)
  .post('/dokumen/:mhsId/revoke', SkpiController.revokeDokumen, revokeDokumenSkpiSchema)
  // Lampiran sertifikat
  .get('/kegiatan/:id/lampiran', SkpiController.listLampiran, listLampiranSkpiSchema)
  .post('/kegiatan/:id/lampiran', SkpiController.uploadLampiran, uploadLampiranSkpiSchema)
  .get('/kegiatan/:id/lampiran/:lampiranId/file', SkpiController.downloadLampiran, lampiranSkpiParamsSchema)
  .delete('/kegiatan/:id/lampiran/:lampiranId', SkpiController.deleteLampiran, lampiranSkpiParamsSchema);
