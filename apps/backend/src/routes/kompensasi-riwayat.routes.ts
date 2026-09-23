import { Elysia } from 'elysia';
import { KompensasiRiwayatController } from '../controllers/kompensasi-riwayat.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bulkAnulirSchema,
  getRekamanSchema,
  getRiwayatKetidakhadiranSchema,
} from '../schemas/kompensasi-riwayat.schema';

export const ketidakhadiranRiwayatRoutes = new Elysia({ prefix: '/ketidakhadiran' })
  .use(authMiddleware)
  .get('/riwayat-unified', KompensasiRiwayatController.getRiwayatKetidakhadiran, getRiwayatKetidakhadiranSchema);

export const kompensasiRekamanRoutes = new Elysia({ prefix: '/kompensasi' })
  .use(authMiddleware)
  .get('/rekaman', KompensasiRiwayatController.getRekamanKompensasi, getRekamanSchema)
  .post('/rekaman/bulk-anulir', KompensasiRiwayatController.bulkAnulir, bulkAnulirSchema);
