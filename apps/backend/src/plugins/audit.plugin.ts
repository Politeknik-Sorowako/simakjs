import { Elysia } from 'elysia';
import { authMiddleware } from '../middlewares/auth.middleware';
import { AuditService } from '../services/audit.service';

export const auditPlugin = new Elysia({ name: 'audit-plugin' }).use(authMiddleware).onAfterResponse(async (ctx) => {
  const { request, set, getCurrentUser } = ctx;
  const method = request.method.toUpperCase();

  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return;
  }

  const url = new URL(request.url);
  const path = url.pathname;

  if (path.includes('/audit-logs')) {
    return;
  }

  const cleanPath = path.replace(/^\/api\/?/, '').replace(/^\//, '');
  const pathSegments = cleanPath.split('/').filter(Boolean);
  const module = pathSegments[0] || 'system';

  let actionType = 'UPDATE';
  if (method === 'POST') actionType = path.includes('/auth/login') ? 'LOGIN' : 'CREATE';
  if (method === 'DELETE') actionType = 'DELETE';

  const entityId = pathSegments[1] && !Number.isNaN(Number(pathSegments[1])) ? pathSegments[1] : null;

  const user = await getCurrentUser().catch(() => null);
  const userId = user?.id ?? null;
  const userRole = user?.role ?? null;

  const ipAddress =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('cf-connecting-ip') ||
    '127.0.0.1';
  const userAgent = request.headers.get('user-agent') || 'Unknown';

  const statusCode = typeof set.status === 'number' ? set.status : 200;
  const description = `[${method}] ${path} (Status: ${statusCode})`;

  void AuditService.log({
    userId,
    userRole,
    ipAddress,
    userAgent,
    actionType,
    module,
    entityId,
    description,
    metadata: {
      method,
      path,
      statusCode,
    },
  });
});
