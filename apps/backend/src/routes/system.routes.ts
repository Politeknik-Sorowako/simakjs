import { Elysia, t } from 'elysia';
import { SystemController } from '../controllers/system.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

export const systemRoutes = new Elysia({ prefix: '/system' })
  .use(authMiddleware)
  .get('/version', SystemController.getVersion, {
    response: {
      200: t.Object({
        version: t.String(),
        buildNumber: t.String(),
        gitCommitHash: t.Union([t.String(), t.Null()], { default: null }),
        environment: t.String(),
        lastUpdated: t.String(),
        source: t.Optional(t.Union([t.String(), t.Null()])),
        parameters: t.Optional(
          t.Record(
            t.String(),
            t.Object({
              type: t.String(),
              description: t.String(),
              defaultValue: t.String(),
            }),
          ),
        ),
      }),
    },
  })
  .get('/changelog', SystemController.getChangelog, {
    response: {
      200: t.Object({
        sections: t.Array(
          t.Object({
            version: t.String(),
            date: t.Union([t.String(), t.Null()], { default: null }),
            groups: t.Array(
              t.Object({
                heading: t.String(),
                items: t.Array(
                  t.Object({
                    text: t.String(),
                    children: t.Array(t.String()),
                  }),
                ),
              }),
            ),
          }),
        ),
      }),
    },
  })
  .get('/health', SystemController.health, {
    response: {
      200: t.Object({
        status: t.String(),
        uptime: t.Optional(t.Number()),
        database: t.Optional(t.String()),
        memory: t.Optional(t.Number()),
      }),
    },
  })
  .get('/settings', SystemController.getSettings, {
    response: {
      200: t.Object({
        data: t.Array(
          t.Object({
            key: t.String(),
            value: t.Unknown(),
            paramType: t.Unknown(),
            description: t.Unknown(),
          }),
        ),
      }),
      403: t.Object({ error: t.String() }),
    },
  })
  .get('/parameters', SystemController.getParameters, {
    response: {
      200: t.Object({
        data: t.Array(
          t.Object({
            key: t.String(),
            value: t.Unknown(),
            paramType: t.String(),
            description: t.String(),
            defaultValue: t.Unknown(),
            updatedAt: t.Optional(t.Unknown()),
            updatedBy: t.Optional(t.Unknown()),
          }),
        ),
      }),
      403: t.Object({ error: t.String() }),
    },
  })
  .put('/parameters/:key', SystemController.updateParameter, {
    body: t.Object({
      value: t.String(),
      description: t.Optional(t.String()),
    }),
    response: {
      200: t.Object({ key: t.String(), value: t.String() }),
      400: t.Object({ error: t.String() }),
      403: t.Object({ error: t.String() }),
      500: t.Object({ error: t.String() }),
    },
  });
