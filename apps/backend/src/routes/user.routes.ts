import { Elysia } from 'elysia';
import { UserController } from '../controllers/user.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  generateAccountsSchema,
  getAllUsersSchema,
  importUsersCsvSchema,
  toggleActiveSchema,
  updateProfileSchema,
  updateRoleSchema,
} from '../schemas/user.schema';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .get('/', UserController.getAll, getAllUsersSchema)
  .put('/profile', UserController.updateProfile, updateProfileSchema)
  .put('/:id/activate', UserController.toggleActive, toggleActiveSchema)
  .put('/:id/role', UserController.updateRole, updateRoleSchema)
  .post('/import', UserController.importCsv, importUsersCsvSchema)
  .post('/generate-accounts', UserController.generateAccounts, generateAccountsSchema);
