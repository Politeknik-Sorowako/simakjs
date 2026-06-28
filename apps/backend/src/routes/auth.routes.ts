import { Elysia } from 'elysia';
import { AuthController } from '../controllers/auth.controller';
import { registerSchema, loginSchema } from '../schemas/auth.schema';
import { jwtPlugin } from '../plugins/jwt.plugin';

export const authRoutes = new Elysia({ prefix: '/auth' })
  .use(jwtPlugin)
  .post('/register', AuthController.register, registerSchema)
  .post('/login', AuthController.login, loginSchema)
  .post('/forgot-password', AuthController.forgotPassword)
  .post('/reset-password', AuthController.resetPassword);
