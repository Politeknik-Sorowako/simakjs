import { Elysia } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { jwtPlugin } from '../plugins/jwt.plugin';
import {
  clearRateLimitSchema,
  forgotPasswordSchema,
  googleCallbackSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  validateResetTokenSchema,
} from '../schemas/auth.schema';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)
  .use(authMiddleware)
  .post('/register', AuthController.register, registerSchema)
  .post('/login', AuthController.login, loginSchema)
  .post('/logout', AuthController.logout, {
    detail: { tags: ['Autentikasi'], summary: 'Logout' },
  })
  .post('/forgot-password', AuthController.forgotPassword, forgotPasswordSchema)
  .post('/reset-password', AuthController.resetPassword, resetPasswordSchema)
  .post('/reset-password/validate', AuthController.validateResetToken, validateResetTokenSchema)
  .post('/clear-rate-limit', AuthController.clearRateLimit, clearRateLimitSchema)
  .get('/google/url', AuthController.googleAuthUrl, {
    detail: { tags: ['Autentikasi'], summary: 'Dapatkan URL Auth Google Workspace SSO' },
  })
  .post('/google/callback', AuthController.googleCallback, googleCallbackSchema);
