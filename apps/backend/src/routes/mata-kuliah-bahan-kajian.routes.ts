import { Elysia, t } from 'elysia';
import { MataKuliahBahanKajianController } from '../controllers/mata-kuliah-bahan-kajian.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const mataKuliahBahanKajianRoutes = new Elysia({ prefix: '/mata-kuliah/:id/bahan-kajian' })
  .use(authMiddleware)
  .get('/', MataKuliahBahanKajianController.getByMataKuliah, {
    detail: {
      tags: ['Mata Kuliah'],
      summary: 'Daftar Bahan Kajian Mata Kuliah',
      description: 'Mengambil daftar Bahan Kajian yang diturunkan ke Mata Kuliah tertentu.',
    },
    response: {
      200: t.Array(
        t.Object({
          id: t.Integer(),
          mataKuliahId: t.Integer(),
          bahanKajianId: t.Integer(),
          bobotKontribusi: t.Union([t.String(), t.Null()]),
          bahanKajian: t.Object({
            id: t.Integer(),
            kode: t.String(),
            nama: t.String(),
            deskripsi: t.Union([t.String(), t.Null()]),
          }),
        }),
      ),
    },
  })
  .post('/', MataKuliahBahanKajianController.attach, {
    detail: {
      tags: ['Mata Kuliah'],
      summary: 'Tambah Bahan Kajian ke Mata Kuliah',
      description: 'Menambahkan Bahan Kajian ke Mata Kuliah tertentu (Hanya Admin/Prodi).',
    },
    body: t.Object({
      bahanKajianId: t.Integer({ default: 1 }),
      bobotKontribusi: t.Optional(t.Numeric()),
    }),
  })
  .delete('/:bkId', MataKuliahBahanKajianController.detach, {
    detail: {
      tags: ['Mata Kuliah'],
      summary: 'Hapus Bahan Kajian dari Mata Kuliah',
      description: 'Menghapus Bahan Kajian dari Mata Kuliah tertentu (Hanya Admin/Prodi).',
    },
    params: t.Object({
      bkId: t.Numeric(),
    }),
    response: {
      200: t.Object({
        message: t.String(),
      }),
    },
  });
