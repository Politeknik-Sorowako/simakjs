import { Elysia } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { jwtPlugin } from '../plugins/jwt.plugin';
import { loginSchema, registerSchema } from '../schemas/auth.schema';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)
  .post('/register', AuthController.register, registerSchema)
  .post('/login', AuthController.login, loginSchema)
  .post('/forgot-password', AuthController.forgotPassword)
  .post('/reset-password', AuthController.resetPassword)
  .get('/reset-password/details/:token', AuthController.getResetTokenDetails);
