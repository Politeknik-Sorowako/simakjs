import { Elysia } from 'elysia';
import { RombelPraktikumController } from '../controllers/rombel-praktikum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  assignMahasiswaBody,
  createBapPraktikumBody,
  createRombelBody,
  getEnrollmentLogSchema,
  publicEnrollParamsSchema,
  publicRombelInfoSchema,
  savePresensiPraktikumBody,
  syncBapPraktikumBody,
  toggleEnrollmentBody,
  updateBapPraktikumBody,
  updateBapPraktikumBulkBody,
  updateRombelBody,
} from '../schemas/rombel-praktikum.schema';

export const rombelPraktikumPublicRoutes = new Elysia({ prefix: '/rombel-praktikum/public' }).get(
  '/:token',
  RombelPraktikumController.getRombelByToken,
  publicRombelInfoSchema,
);

export const rombelPraktikumRoutes = new Elysia({ prefix: '/rombel-praktikum' })
  .use(authMiddleware)
  .get('/kelas/:kelasKuliahId', RombelPraktikumController.getByKelas)
  .post('/', RombelPraktikumController.createRombel, { body: createRombelBody })
  .put('/:id', RombelPraktikumController.updateRombel, { body: updateRombelBody })
  .delete('/:id', RombelPraktikumController.deleteRombel)
  .post('/public/enroll/:token', RombelPraktikumController.selfEnroll, publicEnrollParamsSchema)
  .post('/:id/mahasiswa', RombelPraktikumController.assignMahasiswa, { body: assignMahasiswaBody })
  .post('/:id/generate-token', RombelPraktikumController.generateEnrollmentToken)
  .post('/:id/toggle-enrollment', RombelPraktikumController.toggleEnrollment, { body: toggleEnrollmentBody })
  .get('/:id/enrollment-log', RombelPraktikumController.getEnrollmentLog, getEnrollmentLogSchema)
  .get('/:id/bap', RombelPraktikumController.getBapByRombel)
  .post('/bap', RombelPraktikumController.createBap, { body: createBapPraktikumBody })
  .put('/bap/:id', RombelPraktikumController.updateBap, { body: updateBapPraktikumBody })
  .put('/bap/bulk', RombelPraktikumController.updateBapBulk, { body: updateBapPraktikumBulkBody })
  .delete('/bap/:id', RombelPraktikumController.deleteBap)
  .post('/presensi', RombelPraktikumController.savePresensiBulk, { body: savePresensiPraktikumBody })
  .get('/bap/:id/presensi', RombelPraktikumController.getPresensiByBap)
  .post('/:id/sync-presensi', RombelPraktikumController.syncPresensi, { body: syncBapPraktikumBody })
  .post('/:id/sync-nilai', RombelPraktikumController.syncNilai);
