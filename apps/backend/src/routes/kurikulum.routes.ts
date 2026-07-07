import { Elysia } from 'elysia';
import { KurikulumController } from '../controllers/kurikulum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  addMataKuliahSchema,
  copyFromKurikulumSchema,
  createKurikulumSchema,
  deleteKurikulumSchema,
  duplicateKurikulumSchema,
  getKurikulumByIdSchema,
  getKurikulumSchema,
  importMkCsvSchema,
  removeMataKuliahSchema,
  updateKurikulumSchema,
} from '../schemas/kurikulum.schema';

export const kurikulumRoutes = new Elysia({ prefix: '/kurikulum' })
  .use(authMiddleware)
  .get('/', KurikulumController.getAll, getKurikulumSchema)
  .post('/', KurikulumController.create, createKurikulumSchema)
  .get('/:id', KurikulumController.getById, getKurikulumByIdSchema)
  .put('/:id', KurikulumController.update, updateKurikulumSchema)
  .delete('/:id', KurikulumController.delete, deleteKurikulumSchema)
  .get('/template-import-mk', KurikulumController.downloadImportMkTemplate)
  .post('/:id/mata-kuliah', KurikulumController.addMataKuliah, addMataKuliahSchema)
  .post('/:id/copy-from', KurikulumController.copyFromKurikulum, copyFromKurikulumSchema)
  .post('/:id/import-mk', KurikulumController.importMkCsv, importMkCsvSchema)
  .post('/:id/duplicate', KurikulumController.duplicate, duplicateKurikulumSchema)
  .delete('/:id/mata-kuliah/:mkId', KurikulumController.removeMataKuliah, removeMataKuliahSchema);
