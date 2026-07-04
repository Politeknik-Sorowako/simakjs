import { Elysia } from 'elysia';
import { CutiController } from '../controllers/cuti.controller';
import {
  createCutiSchema,
  inputCutiSchema,
  getCutiSchema,
  getMahasiswaCutiSchema,
  approveCutiSchema,
  deleteCutiSchema,
  aktifKembaliSchema
} from '../schemas/cuti.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const cutiRoutes = new Elysia({ prefix: '/cuti' })
  .use(authMiddleware)
  .post('/', CutiController.create, createCutiSchema)
  .post('/input', CutiController.inputByAdmin, inputCutiSchema)
  .get('/', CutiController.getAll, getCutiSchema)
  .get('/mahasiswa-cuti', CutiController.getMahasiswaCuti, getMahasiswaCutiSchema)
  .get('/:id', CutiController.getById)
  .put('/:id/approve', CutiController.approve, approveCutiSchema)
  .put('/:id/aktif-kembali', CutiController.aktifKembali, aktifKembaliSchema)
  .delete('/:id', CutiController.delete, deleteCutiSchema);
