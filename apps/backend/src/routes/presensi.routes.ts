import { Elysia } from 'elysia';
import { PresensiController } from '../controllers/presensi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bayarKompensasiSchema,
  getByBapSchema,
  getKompensasiMahasiswaDetailSchema,
  getKompensasiStatsSchema,
  getLampiranBerkasSchema,
  getLaporanKompensasiSchema,
  getMahasiswaPresensiSchema,
  getRekapKehadiranMahasiswaSchema,
  getRekapKehadiranSchema,
  getUnknownPresensiSchema,
  importKompensasiBayarSchema,
  resolveUnknownPresensiSchema,
  saveBulkPresensiSchema,
  updateKompensasiBayarSchema,
  uploadSuratIzinSchema,
} from '../schemas/presensi.schema';

export const presensiRoutes = new Elysia({ prefix: '/presensi' })
  .use(authMiddleware)
  .post('/bulk', PresensiController.saveBulk, saveBulkPresensiSchema)
  .get('/bap/:bapId', PresensiController.getByBap, getByBapSchema)
  .get('/unknown-list', PresensiController.getUnknownPresensi, getUnknownPresensiSchema)
  .put('/unknown/:id/resolve', PresensiController.resolveUnknown, resolveUnknownPresensiSchema)
  .post('/upload-surat', PresensiController.uploadSuratIzin, uploadSuratIzinSchema)
  .get('/mahasiswa/riwayat', PresensiController.getMahasiswaPresensiList, getMahasiswaPresensiSchema)
  .get('/berkas/:filename', PresensiController.getLampiranBerkas, getLampiranBerkasSchema)
  .get('/kompensasi/stats', PresensiController.getLaporanKompensasiStats, getKompensasiStatsSchema)
  .get('/kompensasi/laporan', PresensiController.getLaporanKompensasi, getLaporanKompensasiSchema)
  .get('/rekap-kehadiran', PresensiController.getRekapKehadiran, getRekapKehadiranSchema)
  .get('/rekap-kehadiran-mahasiswa', PresensiController.getRekapKehadiranMahasiswa, getRekapKehadiranMahasiswaSchema)
  .get('/kompensasi/mahasiswa/:mahasiswaId', PresensiController.getKompensasiDetail, getKompensasiMahasiswaDetailSchema)
  .post('/kompensasi/bayar', PresensiController.bayarKompensasi, bayarKompensasiSchema)
  .post('/kompensasi/bayar/import', PresensiController.importKompensasiBayar, importKompensasiBayarSchema)
  .put('/kompensasi/bayar/:id', PresensiController.updateKompensasiBayar, updateKompensasiBayarSchema);
