import { Elysia } from 'elysia';
import { ProfilLulusanController } from '../controllers/profil-lulusan.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createProfilLulusanSchema,
  deleteProfilLulusanSchema,
  getProfilLulusanByIdSchema,
  getProfilLulusanSchema,
  updateProfilLulusanSchema,
} from '../schemas/profil-lulusan.schema';

export const profilLulusanRoutes = new Elysia({ prefix: '/profil-lulusan' })
  .use(authMiddleware)
  .get('/', ProfilLulusanController.getAll, getProfilLulusanSchema)
  .get('/:id', ProfilLulusanController.getById, getProfilLulusanByIdSchema)
  .post('/', ProfilLulusanController.create, createProfilLulusanSchema)
  .put('/:id', ProfilLulusanController.update, updateProfilLulusanSchema)
  .delete('/:id', ProfilLulusanController.delete, deleteProfilLulusanSchema);
