import { Elysia } from 'elysia';
import { PresensiController } from '../controllers/presensi.controller';
import {
  saveBulkPresensiSchema,
  bayarKompensasiSchema,
  getKompensasiMahasiswaDetailSchema
} from '../schemas/presensi.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const presensiRoutes = new Elysia({ prefix: '/presensi' })
  .use(authMiddleware)
  .post('/bulk', PresensiController.saveBulk, saveBulkPresensiSchema)
  .get('/bap/:bapId', PresensiController.getByBap)
  .get('/kompensasi/laporan', PresensiController.getLaporanKompensasi)
  .get('/kompensasi/mahasiswa/:mahasiswaId', PresensiController.getKompensasiDetail, getKompensasiMahasiswaDetailSchema)
  .post('/kompensasi/bayar', PresensiController.bayarKompensasi, bayarKompensasiSchema);
