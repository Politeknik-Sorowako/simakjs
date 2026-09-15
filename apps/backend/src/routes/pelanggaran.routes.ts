import { Elysia } from 'elysia';
import { PelanggaranController } from '../controllers/pelanggaran.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  createPelanggaranSchema,
  deletePelanggaranSchema,
  getAllPelanggaranSchema,
  getPelanggaranMahasiswaSchema,
  getRekapPasalSchema,
  getRekapPelanggaranSchema,
  importPelanggaranSchema,
  updatePelanggaranSchema,
} from '../schemas/pelanggaran.schema';

export const pelanggaranRoutes = new Elysia({ prefix: '/pelanggaran' })
  .use(authMiddleware)
  .post('/', PelanggaranController.create, createPelanggaranSchema)
  .get('/mahasiswa/:mhsId', PelanggaranController.getByMhsId, getPelanggaranMahasiswaSchema)
  .get('/rekap', PelanggaranController.getRekap, getRekapPelanggaranSchema)
  .get('/rekap-pasal', PelanggaranController.getRekapPasal, getRekapPasalSchema)
  .get('/', PelanggaranController.getAll, getAllPelanggaranSchema)
  .put('/:id', PelanggaranController.update, updatePelanggaranSchema)
  .delete('/:id', PelanggaranController.remove, deletePelanggaranSchema)
  .post('/import', PelanggaranController.importCsv, importPelanggaranSchema);
