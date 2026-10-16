import { Elysia } from 'elysia';
import { PddiktiController } from '../controllers/pddikti.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  applyPullSchema,
  getPddiktiStatsSchema,
  getPullEntitiesSchema,
  getPullPreviewSchema,
  syncPddiktiSchema,
  testFeederConnectionSchema,
} from '../schemas/pddikti.schema';

export const pddiktiRoutes = new Elysia({ prefix: '/pddikti' })
  .use(authMiddleware)
  .get('/stats', PddiktiController.getStats, getPddiktiStatsSchema)
  .post('/sync', PddiktiController.syncAll, syncPddiktiSchema)
  .post('/test-connection', PddiktiController.testConnection, testFeederConnectionSchema)
  .get('/pull/entities', PddiktiController.getPullEntities, getPullEntitiesSchema)
  .get('/pull/preview', PddiktiController.getPullPreview, getPullPreviewSchema)
  .post('/pull/apply', PddiktiController.applyPull, applyPullSchema);
