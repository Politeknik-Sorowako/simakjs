import { Elysia } from 'elysia';
import { CapaianCpmkController } from '../controllers/capaian-cpmk.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getCapaianCpmkByKelasSchema,
  getCapaianCpmkByMahasiswaSchema,
  getRekapCapaianCpmkSchema,
  hitungCapaianCpmkSchema,
} from '../schemas/capaian-cpmk.schema';

export const capaianCpmkRoutes = new Elysia({ prefix: '/capaian-cpmk' })
  .use(authMiddleware)
  .get('/kelas/:kelasKuliahId', CapaianCpmkController.getByKelas, getCapaianCpmkByKelasSchema)
  .get('/mahasiswa/:mahasiswaId', CapaianCpmkController.getByMahasiswa, getCapaianCpmkByMahasiswaSchema)
  .get('/rekap/:kelasKuliahId', CapaianCpmkController.getRekapPerCpmk, getRekapCapaianCpmkSchema)
  .post('/hitung/:kelasKuliahId', CapaianCpmkController.hitungPerKelas, hitungCapaianCpmkSchema);
