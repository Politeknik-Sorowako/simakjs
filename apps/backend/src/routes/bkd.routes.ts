import { Elysia } from 'elysia';
import { BkdController } from '../controllers/bkd.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getRekapBkdSchema } from '../schemas/bkd.schema';

export const bkdRoutes = new Elysia({ prefix: '/bkd' })
  .use(authMiddleware)
  .get('/rekap', BkdController.getRekap, getRekapBkdSchema);
