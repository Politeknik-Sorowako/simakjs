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
  updateUserRolesSchema,
} from '../schemas/user.schema';

export const userRoutes = new Elysia({ prefix: '/users' })
  .use(authMiddleware)
  .get('/', UserController.getAll, getAllUsersSchema)
  .post('/', UserController.createUser, {
    detail: { tags: ['Pengguna'], summary: 'Tambah pengguna baru (Admin/Super Admin)' },
  })
  .put('/profile', UserController.updateProfile, updateProfileSchema)
  .put('/:id/activate', UserController.toggleActive, toggleActiveSchema)
  .put('/:id/role', UserController.updateRole, updateRoleSchema)
  .put('/:id/roles', UserController.updateUserRoles, updateUserRolesSchema)
  .put('/:id/prodi-scope', UserController.updateProdiScope, {
    detail: { tags: ['Pengguna'], summary: 'Perbarui cakupan program studi pengguna' },
  })
  .put('/:id/reset-password', UserController.resetPassword, {
    detail: { tags: ['Pengguna'], summary: 'Reset password pengguna (Admin only)' },
  })
  .put('/:id/force-password-change', UserController.forcePasswordChange, {
    detail: { tags: ['Pengguna'], summary: 'Wajibkan/batalkan kewajiban ganti password pengguna (Admin only)' },
  })
  .post('/import', UserController.importCsv, importUsersCsvSchema)
  .post('/generate-accounts', UserController.generateAccounts, generateAccountsSchema)
  .post('/generate-accounts-async', UserController.generateAccountsAsync, {
    detail: { tags: ['Pengguna'], summary: 'Proses pembuatan akun massal asinkron (Background Job)' },
  });
