import { Elysia } from 'elysia';
import { TagihanController } from '../controllers/tagihan.controller';
import {
  getTagihanSchema,
  generateTagihanSchema,
  bayarTagihanSchema
} from '../schemas/tagihan.schema';
import { authMiddleware } from '../middlewares/auth.middleware';

export const tagihanRoutes = new Elysia({ prefix: '/tagihan' })
  .use(authMiddleware)
  .get('/', TagihanController.getAll, getTagihanSchema)
  .post('/generate', TagihanController.generate, generateTagihanSchema)
  .post('/:id/bayar', TagihanController.bayar, bayarTagihanSchema)
  
  // Audit trail transaksi pembayaran
  .get('/:id/transaksi', TagihanController.getRiwayat)
  .post('/transaksi/:id/void', TagihanController.voidTransaksi)

  // Pengaturan skema tarif per angkatan
  .get('/tarif', TagihanController.getAllTarif)
  .post('/tarif', TagihanController.createTarif)
  .delete('/tarif/:id', TagihanController.deleteTarif);
