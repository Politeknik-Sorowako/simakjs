import { Elysia } from 'elysia';
import { TagihanController } from '../controllers/tagihan.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  bayarTagihanSchema,
  createTarifSchema,
  deleteTarifSchema,
  generateTagihanSchema,
  getAllTarifSchema,
  getRiwayatTransaksiSchema,
  getStatsTagihanSchema,
  getTagihanSchema,
  updateNominalSchema,
  voidTransaksiSchema,
} from '../schemas/tagihan.schema';

export const tagihanRoutes = new Elysia({ prefix: '/tagihan' })
  .use(authMiddleware)
  .get('/stats', TagihanController.getStats, getStatsTagihanSchema)
  .get('/', TagihanController.getAll, getTagihanSchema)
  .post('/generate', TagihanController.generate, generateTagihanSchema)
  .post('/:id/bayar', TagihanController.bayar, bayarTagihanSchema)
  .put('/:id', TagihanController.updateNominal, updateNominalSchema)

  // Audit trail transaksi pembayaran
  .get('/:id/transaksi', TagihanController.getRiwayat, getRiwayatTransaksiSchema)
  .post('/transaksi/:id/void', TagihanController.voidTransaksi, voidTransaksiSchema)

  // Pengaturan skema tarif per angkatan
  .get('/tarif', TagihanController.getAllTarif, getAllTarifSchema)
  .post('/tarif', TagihanController.createTarif, createTarifSchema)
  .delete('/tarif/:id', TagihanController.deleteTarif, deleteTarifSchema);
