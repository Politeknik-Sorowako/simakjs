import { Elysia } from 'elysia';
import { PddiktiController } from '../controllers/pddikti.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const pddiktiRoutes = new Elysia({ prefix: '/pddikti' })
  .use(authMiddleware)
  .get('/stats', PddiktiController.getStats)
  .post('/sync', PddiktiController.syncAll);
