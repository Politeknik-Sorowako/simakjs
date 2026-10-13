import { Elysia } from 'elysia';
import { CutiController } from '../controllers/cuti.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  aktifKembaliSchema,
  approveCutiSchema,
  createCutiSchema,
  deleteCutiSchema,
  getCutiSchema,
  getMahasiswaCutiSchema,
  inputCutiSchema,
  lampiranCutiParamsSchema,
  listLampiranCutiSchema,
  updateCutiSchema,
  uploadLampiranCutiSchema,
} from '../schemas/cuti.schema';

export const cutiRoutes = new Elysia({ prefix: '/cuti' })
  .use(authMiddleware)
  .post('/', CutiController.create, createCutiSchema)
  .post('/input', CutiController.inputByAdmin, inputCutiSchema)
  .get('/', CutiController.getAll, getCutiSchema)
  .get('/mahasiswa-cuti', CutiController.getMahasiswaCuti, getMahasiswaCutiSchema)
  .get('/:id', CutiController.getById)
  .put('/:id', CutiController.update, updateCutiSchema)
  .get('/:id/lampiran', CutiController.listLampiran, listLampiranCutiSchema)
  .post('/:id/lampiran', CutiController.uploadLampiran, uploadLampiranCutiSchema)
  .get('/:id/lampiran/:lampiranId/file', CutiController.downloadLampiran, lampiranCutiParamsSchema)
  .delete('/:id/lampiran/:lampiranId', CutiController.deleteLampiran, lampiranCutiParamsSchema)
  .put('/:id/approve', CutiController.approve, approveCutiSchema)
  .put('/:id/aktif-kembali', CutiController.aktifKembali, aktifKembaliSchema)
  .delete('/:id', CutiController.delete, deleteCutiSchema);
