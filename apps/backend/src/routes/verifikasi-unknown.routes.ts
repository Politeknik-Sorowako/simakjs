import { Elysia } from 'elysia';
import { VerifikasiUnknownController } from '../controllers/verifikasi-unknown.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { verifikasiUnknownSchema } from '../schemas/verifikasi-unknown.schema';

export const verifikasiUnknownRoutes = new Elysia({ prefix: '/ketidakhadiran' })
  .use(authMiddleware)
  .get('/unknown', VerifikasiUnknownController.getList)
  .post('/verifikasi-unknown', VerifikasiUnknownController.verify, verifikasiUnknownSchema);
