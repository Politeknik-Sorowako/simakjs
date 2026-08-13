import { Elysia } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { jwtPlugin } from '../plugins/jwt.plugin';
import {
  forgotPasswordSchema,
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
  .post('/reset-password/validate', AuthController.validateResetToken, validateResetTokenSchema);
