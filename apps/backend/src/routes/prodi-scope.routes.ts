import { Elysia } from 'elysia';
import { ProdiScopeController } from '../controllers/prodi-scope.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const prodiScopeRoutes = new Elysia({ prefix: '/prodi-scope' })
  .use(authMiddleware)
  .get('/:userId', ProdiScopeController.getScopes)
  .put('/:userId', ProdiScopeController.setScopes)
  .post('/:userId/add', ProdiScopeController.addScope)
  .delete('/:userId/:prodiId', ProdiScopeController.removeScope)
  .put('/:userId/global', ProdiScopeController.toggleGlobal);
