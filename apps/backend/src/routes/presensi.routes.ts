import { Elysia } from 'elysia';
import { PresensiController } from '../controllers/presensi.controller';
import {
  saveBulkPresensiSchema,
  bayarKompensasiSchema,
  getKompensasiMahasiswaDetailSchema,
  getByBapSchema,
  getLaporanKompensasiSchema
} from '../schemas/presensi.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const presensiRoutes = new Elysia({ prefix: '/presensi' })
  .use(authMiddleware)
  .post('/bulk', PresensiController.saveBulk, saveBulkPresensiSchema)
  .get('/bap/:bapId', PresensiController.getByBap, getByBapSchema)
  .get('/kompensasi/laporan', PresensiController.getLaporanKompensasi, getLaporanKompensasiSchema)
  .get('/kompensasi/mahasiswa/:mahasiswaId', PresensiController.getKompensasiDetail, getKompensasiMahasiswaDetailSchema)
  .post('/kompensasi/bayar', PresensiController.bayarKompensasi, bayarKompensasiSchema);

