import { Elysia } from 'elysia';
import { RombelPraktikumController } from '../controllers/rombel-praktikum.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  assignMahasiswaBody,
  createBapPraktikumBody,
  createRombelBody,
  savePresensiPraktikumBody,
  updateBapPraktikumBody,
  updateRombelBody,
} from '../schemas/rombel-praktikum.schema';

export const rombelPraktikumRoutes = new Elysia({ prefix: '/rombel-praktikum' })
  .use(authMiddleware)
  .get('/kelas/:kelasKuliahId', RombelPraktikumController.getByKelas)
  .post('/', RombelPraktikumController.createRombel, { body: createRombelBody })
  .put('/:id', RombelPraktikumController.updateRombel, { body: updateRombelBody })
  .delete('/:id', RombelPraktikumController.deleteRombel)
  .post('/:id/mahasiswa', RombelPraktikumController.assignMahasiswa, { body: assignMahasiswaBody })
  .get('/:rombelId/bap', RombelPraktikumController.getBapByRombel)
  .post('/bap', RombelPraktikumController.createBap, { body: createBapPraktikumBody })
  .put('/bap/:id', RombelPraktikumController.updateBap, { body: updateBapPraktikumBody })
  .post('/presensi', RombelPraktikumController.savePresensiBulk, { body: savePresensiPraktikumBody })
  .get('/bap/:bapPraktikumId/presensi', RombelPraktikumController.getPresensiByBap);
