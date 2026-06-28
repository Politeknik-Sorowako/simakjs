import { Elysia } from 'elysia';
import { PddiktiController } from '../controllers/pddikti.controller';
import { getPddiktiStatsSchema, syncPddiktiSchema } from '../schemas/pddikti.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const pddiktiRoutes = new Elysia({ prefix: '/pddikti' })
  .use(authMiddleware)
  .get('/stats', PddiktiController.getStats, getPddiktiStatsSchema)
  .post('/sync', PddiktiController.syncAll, syncPddiktiSchema);

