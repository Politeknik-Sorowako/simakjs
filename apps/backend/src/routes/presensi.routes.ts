import { Elysia } from 'elysia';
import { PresensiController } from '../controllers/presensi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bayarKompensasiSchema,
  bulkDeleteKompensasiBayarSchema,
  deleteKompensasiBayarSchema,
  getByBapSchema,
  getKompensasiMahasiswaDetailSchema,
  getKompensasiStatsSchema,
  getLampiranBerkasSchema,
  getLaporanKompensasiSchema,
  getMahasiswaPresensiSchema,
  getRekapKehadiranMahasiswaSchema,
  getRekapKehadiranSchema,
  getRekapKelasListSchema,
  getRekapMahasiswaListSchema,
  getRiwayatPembayaranSchema,
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
  .get('/rekap-kelas-list', PresensiController.getRekapKelasList, getRekapKelasListSchema)
  .get('/rekap-mahasiswa-list', PresensiController.getRekapMahasiswaList, getRekapMahasiswaListSchema)
  .get('/kompensasi/mahasiswa/:mahasiswaId', PresensiController.getKompensasiDetail, getKompensasiMahasiswaDetailSchema)
  .post('/kompensasi/bayar', PresensiController.bayarKompensasi, bayarKompensasiSchema)
  .get('/kompensasi/bayar', PresensiController.getRiwayatPembayaran, getRiwayatPembayaranSchema)
  .post('/kompensasi/bayar/import', PresensiController.importKompensasiBayar, importKompensasiBayarSchema)
  .post('/kompensasi/bayar/bulk-delete', PresensiController.bulkDeleteKompensasiBayar, bulkDeleteKompensasiBayarSchema)
  .put('/kompensasi/bayar/:id', PresensiController.updateKompensasiBayar, updateKompensasiBayarSchema)
  .delete('/kompensasi/bayar/:id', PresensiController.deleteKompensasiBayar, deleteKompensasiBayarSchema);
