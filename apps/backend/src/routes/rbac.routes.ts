import { Elysia } from 'elysia';
import { RbacController } from '../controllers/rbac.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const rbacRoutes = new Elysia({ prefix: '/rbac' })
  .use(authMiddleware)
  .get('/role-groups', RbacController.getAllRoleGroups)
  .post('/role-groups', RbacController.createRoleGroup)
  .put('/role-groups/:id', RbacController.updateRoleGroup)
  .delete('/role-groups/:id', RbacController.deleteRoleGroup)
  .put('/role-groups/:id/permissions', RbacController.assignPermissions)
  .get('/role-groups/:id/matrix', RbacController.getMatrix)
  .get('/role-groups/:id/matrix-level', RbacController.getMatrixByLevel)
  .put('/role-groups/:id/permissions-level', RbacController.assignPermissionsByLevel)
  .get('/role-types', RbacController.getRoleTypes)
  .put('/role-types/:id/toggle', RbacController.toggleRoleType);
