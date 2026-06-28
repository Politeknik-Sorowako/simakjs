import { Elysia } from 'elysia';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .get('/', UserController.getAll)
  .put('/profile', UserController.updateProfile)
  .put('/:id/activate', UserController.toggleActive)
  .put('/:id/role', UserController.updateRole);
