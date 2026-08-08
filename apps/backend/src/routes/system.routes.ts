import { Elysia } from 'elysia';
import { SystemController } from '../controllers/system.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const systemRoutes = new Elysia({ prefix: '/system' })
  .use(authMiddleware)
  .get('/version', SystemController.getVersion)
  .get('/health', SystemController.health)
  .get('/settings', SystemController.getSettings)
  .get('/parameters', SystemController.getParameters)
  .put('/parameters/:key', SystemController.updateParameter);
