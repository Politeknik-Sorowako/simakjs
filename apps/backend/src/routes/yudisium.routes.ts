import { Elysia } from 'elysia';
import { YudisiumController } from '../controllers/yudisium.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  pengajuanYudisiumBody,
  updateYudisiumStatusBody,
  saveKomponenBody,
  saveNilaiMahasiswaBody,
  getYudisiumSchema
} from '../schemas/yudisium.schema';

export const yudisiumRoutes = new Elysia({ prefix: '/yudisium' })
  .use(authMiddleware)
  .get('/', YudisiumController.getAll)
  .get('/mahasiswa/:mhsId', YudisiumController.getPengajuan, getYudisiumSchema)
  .post('/mahasiswa/:mhsId', YudisiumController.submitPengajuan, { body: pengajuanYudisiumBody })
  .put('/mahasiswa/:mhsId/status', YudisiumController.updateStatus, { body: updateYudisiumStatusBody })
  
  // Grade Components
  .get('/kelas/:kelasKuliahId/komponen', YudisiumController.getKomponen)
  .post('/kelas/komponen', YudisiumController.saveKomponen, { body: saveKomponenBody })
  .get('/kelas/:kelasKuliahId/nilai', YudisiumController.getNilaiMahasiswa)
  .post('/kelas/nilai', YudisiumController.saveNilaiMahasiswa, { body: saveNilaiMahasiswaBody })
  .post('/kelas/:kelasKuliahId/lock', YudisiumController.lockKelas);
