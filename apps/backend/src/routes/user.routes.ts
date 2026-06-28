import { Elysia } from 'elysia';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .get('/', UserController.getAll)
  .put('/:id/activate', UserController.toggleActive);
