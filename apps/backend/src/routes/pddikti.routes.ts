import { Elysia } from 'elysia';
import { PddiktiController } from '../controllers/pddikti.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getPddiktiStatsSchema, syncPddiktiSchema } from '../schemas/pddikti.schema';

export const pddiktiRoutes = new Elysia({ prefix: '/pddikti' })
  .use(authMiddleware)
  .get('/stats', PddiktiController.getStats, getPddiktiStatsSchema)
  .post('/sync', PddiktiController.syncAll, syncPddiktiSchema);
