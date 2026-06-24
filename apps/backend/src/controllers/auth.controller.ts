import { AuthService } from '../services/auth.service';
import { AuthContext } from '../utils/types';

export class AuthController {
  static async register({ body, set }: AuthContext) {
    try {
      const user = await AuthService.register(body.email, body.password, body.role);
      set.status = 201;
      return {
        message: 'Registrasi berhasil',
        user,
      };
    } catch (e) {
      set.status = 400;
      return { error: 'Email sudah terdaftar' };
    }
  }

  static async login({ body, jwt, set }: AuthContext & { jwt: { sign: (payload: Record<string, any>) => Promise<string> } }) {
    const user = await AuthService.validateUser(body.email, body.password);
    if (!user) {
      set.status = 401;
      return { error: 'Email atau password salah' };
    }
    const token = await jwt.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
    return {
      message: 'Login berhasil',
      token,
      user,
    };
  }
}

