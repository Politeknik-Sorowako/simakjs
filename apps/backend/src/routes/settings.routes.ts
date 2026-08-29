import { Elysia, t } from 'elysia';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/public', SettingsController.getPublicSettings, {
    response: {
      200: t.Object({
        data: t.Object({
          featureFeedbackEnabled: t.Boolean(),
        }),
      }),
    },
  })
  .use(authMiddleware)
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
