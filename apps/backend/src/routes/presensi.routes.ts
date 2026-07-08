import { Elysia } from 'elysia';
import { PresensiController } from '../controllers/presensi.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bayarKompensasiSchema,
  getByBapSchema,
  getKompensasiMahasiswaDetailSchema,
  getLaporanKompensasiSchema,
  saveBulkPresensiSchema,
  updateKompensasiBayarSchema,
} from '../schemas/presensi.schema';

export const presensiRoutes = new Elysia({ prefix: '/presensi' })
  .use(authMiddleware)
  .post('/bulk', PresensiController.saveBulk, saveBulkPresensiSchema)
  .get('/bap/:bapId', PresensiController.getByBap, getByBapSchema)
  .get('/kompensasi/stats', PresensiController.getLaporanKompensasiStats)
  .get('/kompensasi/laporan', PresensiController.getLaporanKompensasi, getLaporanKompensasiSchema)
  .get('/rekap-kehadiran', PresensiController.getRekapKehadiran)
  .get('/rekap-kehadiran-mahasiswa', PresensiController.getRekapKehadiranMahasiswa)
  .get('/kompensasi/mahasiswa/:mahasiswaId', PresensiController.getKompensasiDetail, getKompensasiMahasiswaDetailSchema)
  .post('/kompensasi/bayar', PresensiController.bayarKompensasi, bayarKompensasiSchema)
  .put('/kompensasi/bayar/:id', PresensiController.updateKompensasiBayar, updateKompensasiBayarSchema);
