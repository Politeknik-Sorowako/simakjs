import { Elysia } from 'elysia';
import { KhsController } from '../controllers/khs.controller';
import { getKhsSchema, getTranskripSchema } from '../schemas/khs.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const khsRoutes = new Elysia({ prefix: '/khs' })
  .use(authMiddleware)
  .get('/mahasiswa/:mhsId/periode/:periodeId', KhsController.getByMhsIdAndPeriode, getKhsSchema)
  .get('/mahasiswa/:mhsId/transkrip', KhsController.getTranskrip, getTranskripSchema)
  .get('/mahasiswa/:mhsId/periode/:periodeId/eligibility', KhsController.getExamEligibility);
