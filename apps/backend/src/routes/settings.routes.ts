import { Elysia, t } from 'elysia';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/public', SettingsController.getPublicSettings, {
    response: {
      200: t.Object({
        data: t.Object({
          featureFeedbackEnabled: t.Boolean(),
          krsMandiriEnabled: t.Boolean(),
          maxBimbinganAttachmentMb: t.Number(),
        }),
      }),
    },
  })
  .use(authMiddleware)
  // ─── Kop surat global (semua dokumen cetak) ──────────────────────────────
  .get('/kop', SettingsController.getKop, {
    detail: {
      tags: ['Settings'],
      summary: 'Konfigurasi kop surat global (semua role terautentikasi)',
    },
    response: {
      200: t.Object({
        data: t.Object({
          nama: t.String(),
          alamat: t.Array(t.String()),
          kontak: t.String(),
          website: t.String(),
          email: t.String(),
          tampilkanLogo: t.Boolean(),
          logoCustom: t.Boolean(),
          logoUrl: t.Union([t.String(), t.Null()]),
        }),
      }),
      401: t.Object({ error: t.String() }),
      400: t.Object({ error: t.String() }),
    },
  })
  .put('/kop', SettingsController.updateKop, {
    detail: {
      tags: ['Settings'],
      summary: 'Simpan kop surat global (admin/super_admin) — field opsional di-merge',
    },
    body: t.Object({
      nama: t.Optional(t.String({ minLength: 1, maxLength: 120 })),
      alamat: t.Optional(t.Array(t.String({ minLength: 1, maxLength: 200 }), { maxItems: 4 })),
      kontak: t.Optional(t.String({ maxLength: 300 })),
      website: t.Optional(t.String({ maxLength: 200 })),
      email: t.Optional(t.String({ maxLength: 200 })),
      tampilkanLogo: t.Optional(t.Boolean()),
    }),
    response: {
      200: t.Object({ message: t.String(), data: t.Any() }),
      400: t.Object({ error: t.String() }),
      401: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
      422: t.Object({ error: t.Any() }),
    },
  })
  .post('/kop-logo', SettingsController.uploadKopLogo, {
    detail: { tags: ['Settings'], summary: 'Unggah logo kop kustom (PNG/JPG ≤2MB, admin)' },
    body: t.Object({ file: t.File() }),
    response: {
      200: t.Object({ message: t.String(), data: t.Any() }),
      400: t.Object({ error: t.String() }),
      401: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
      422: t.Object({ error: t.Any() }),
    },
  })
  .delete('/kop-logo', SettingsController.deleteKopLogo, {
    detail: { tags: ['Settings'], summary: 'Hapus logo kustom → kembali logo bawaan (admin)' },
    response: {
      200: t.Object({ message: t.String(), data: t.Any() }),
      401: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
    },
  })
  .get('/kop-logo', SettingsController.getKopLogo, {
    detail: { tags: ['Settings'], summary: 'Berkas logo kop kustom (binary; 404 bila belum ada)' },
    response: {
      200: t.Any(),
      401: t.Object({ error: t.String() }),
      404: t.Object({ error: t.String() }),
    },
  })
  .get('/feedback-config', SettingsController.getFeedbackConfig, {
    response: {
      200: t.Object({
        data: t.Object({
          mode: t.String(),
          allowedRoles: t.Array(t.String()),
        }),
      }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
    },
  })
  .put('/feedback-config', SettingsController.updateFeedbackConfig, {
    body: t.Object({
      mode: t.String(),
      allowedRoles: t.Array(t.String()),
    }),
    response: {
      200: t.Object({
        message: t.String(),
        data: t.Object({
          mode: t.String(),
          allowedRoles: t.Array(t.String()),
        }),
      }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
    },
  })
  .get('/', SettingsController.getAll, {
    response: {
      200: t.Object({
        data: t.Array(
          t.Object({
            key: t.String(),
            value: t.Union([t.String(), t.Null()], { default: null }),
            description: t.Union([t.String(), t.Null()], { default: null }),
            updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
          }),
        ),
      }),
      403: t.Object({ error: t.String() }),
      400: t.Object({ error: t.String() }),
    },
  })
  .put('/', SettingsController.updateSetting, {
    body: t.Object({
      key: t.String(),
      value: t.String(),
      description: t.Optional(t.String()),
    }),
    response: {
      200: t.Object({
        message: t.String(),
        data: t.Object({
          key: t.String(),
          value: t.Union([t.String(), t.Null()], { default: null }),
          description: t.Union([t.String(), t.Null()], { default: null }),
          updatedAt: t.Union([t.Date(), t.Null()], { default: null }),
        }),
      }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
    },
  });
