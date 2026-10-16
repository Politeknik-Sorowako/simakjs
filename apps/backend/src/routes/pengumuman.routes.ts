import { Elysia, t } from 'elysia';
import { PengumumanController } from '../controllers/pengumuman.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import {
  pengumumanManageQuerySchema,
  pengumumanQuerySchema,
  publishPengumumanSchema,
  saveDraftSchema,
  withdrawPengumumanSchema,
} from '../schemas/pengumuman.schema';

export const pengumumanRoutes = new Elysia({ prefix: '/pengumuman' })
  .use(authMiddleware)
  .get('/target-options', PengumumanController.getTargetOptions, {
    detail: { tags: ['Pengumuman'], summary: 'Ambil opsi target sasaran (prodi, kelas, rombel)' },
  })
  .get('/feed', PengumumanController.getFeed, {
    query: pengumumanQuerySchema,
    detail: { tags: ['Pengumuman'], summary: 'Feed pengumuman aktif untuk sivitas' },
  })
  .get('/manage', PengumumanController.getManageList, {
    query: pengumumanManageQuerySchema,
    detail: { tags: ['Pengumuman'], summary: 'Daftar pengumuman yang dikelola user' },
  })
  .get('/:id', PengumumanController.getDetail, {
    detail: { tags: ['Pengumuman'], summary: 'Detail pengumuman & mark as read' },
  })
  .post('/draft', PengumumanController.saveDraft, {
    body: saveDraftSchema,
    detail: { tags: ['Pengumuman'], summary: 'Auto-save / simpan draft pengumuman' },
  })
  .post('/publish', PengumumanController.publish, {
    body: publishPengumumanSchema,
    detail: { tags: ['Pengumuman'], summary: 'Publikasikan atau jadwalkan rilis pengumuman' },
  })
  .post('/:id/withdraw', PengumumanController.withdraw, {
    body: withdrawPengumumanSchema,
    detail: { tags: ['Pengumuman'], summary: 'Tarik / batalkan pengumuman yang tayang' },
  })
  .delete('/:id', PengumumanController.delete, {
    detail: { tags: ['Pengumuman'], summary: 'Hapus pengumuman secara permanen' },
  })
  .post('/upload-attachment', PengumumanController.uploadAttachment, {
    body: t.Object({
      file: t.File(),
    }),
    detail: { tags: ['Pengumuman'], summary: 'Upload file / gambar lampiran pengumuman' },
  });
