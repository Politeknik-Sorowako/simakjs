import { Elysia } from 'elysia';
import { YudisiumController } from '../controllers/yudisium.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  getYudisiumSchema,
  getAllYudisiumSchema,
  submitPengajuanYudisiumSchema,
  updateYudisiumStatusSchema,
  getKomponenYudisiumSchema,
  saveKomponenYudisiumSchema,
  getNilaiMahasiswaYudisiumSchema,
  saveNilaiMahasiswaYudisiumSchema,
  lockKelasYudisiumSchema,
  unlockKelasYudisiumSchema
} from '../schemas/yudisium.schema';

export const yudisiumRoutes = new Elysia({ prefix: '/yudisium' })
  .use(authMiddleware)
  .get('/', YudisiumController.getAll, getAllYudisiumSchema)
  .get('/mahasiswa/:mhsId', YudisiumController.getPengajuan, getYudisiumSchema)
  .post('/mahasiswa/:mhsId', YudisiumController.submitPengajuan, submitPengajuanYudisiumSchema)
  .put('/mahasiswa/:mhsId/status', YudisiumController.updateStatus, updateYudisiumStatusSchema)
  
  // Grade Components
  .get('/kelas/:kelasKuliahId/komponen', YudisiumController.getKomponen, getKomponenYudisiumSchema)
  .post('/kelas/komponen', YudisiumController.saveKomponen, saveKomponenYudisiumSchema)
  .get('/kelas/:kelasKuliahId/nilai', YudisiumController.getNilaiMahasiswa, getNilaiMahasiswaYudisiumSchema)
  .post('/kelas/nilai', YudisiumController.saveNilaiMahasiswa, saveNilaiMahasiswaYudisiumSchema)
  .post('/kelas/:kelasKuliahId/lock', YudisiumController.lockKelas, lockKelasYudisiumSchema)
  .post('/kelas/:kelasKuliahId/unlock', YudisiumController.unlockKelas, unlockKelasYudisiumSchema);

