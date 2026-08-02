import { Elysia } from 'elysia';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const notificationRoutes = new Elysia({ prefix: '/notifications' })
  .use(authMiddleware)
  .get('/', NotificationController.getAll)
  .patch('/:id/read', NotificationController.markRead);
