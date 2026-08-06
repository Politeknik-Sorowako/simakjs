import { Elysia, t } from 'elysia';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const settingsRoutes = new Elysia({ prefix: '/settings' })
  .get('/public', SettingsController.getPublicSettings)
  .use(authMiddleware)
  .get('/', SettingsController.getAll)
  .put('/', SettingsController.updateSetting, {
    body: t.Object({
      key: t.String(),
      value: t.String(),
      description: t.Optional(t.String()),
    }),
  });
