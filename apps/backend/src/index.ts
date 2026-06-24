import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { users, programStudi, mahasiswa } from './db/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-simak-vokasi-12345';

export const app = new Elysia()
  .use(
    swagger({
      documentation: {
        info: {
          title: 'SIMAK Vokasi API Documentation',
          version: '1.0.0',
          description: 'REST API untuk Sistem Informasi Akademik Vokasi',
        },
      },
    })
  )
  .use(
    cors({
      origin: '*',
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use(
    jwt({
      name: 'jwt',
      secret: JWT_SECRET,
    })
  )
  // Auth Middleware
  .derive(({ jwt, headers }) => {
    return {
      getCurrentUser: async () => {
        const authHeader = headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return null;
        }
        const token = authHeader.split(' ')[1];
        const payload = await jwt.verify(token);
        if (!payload) return null;
        return payload;
      },
    };
  })
  // Group Auth
  .group('/auth', (app) =>
    app
      .post(
        '/register',
        async ({ body, set }) => {
          const { email, password, role } = body;
          // Hash password using Bun's native password hasher
          const hashedPassword = await Bun.password.hash(password, {
  algorithm: "bcrypt",
  cost: 10,
});
          try {
            const [newUser] = await db
              .insert(users)
              .values({
                email,
                password: hashedPassword,
                role: role || 'mahasiswa',
              })
              .returning();
            set.status = 201;
            return {
              message: 'Registrasi berhasil',
              user: { id: newUser.id, email: newUser.email, role: newUser.role },
            };
          } catch (e) {
            set.status = 400;
            return { error: 'Email sudah terdaftar' };
          }
        },
        {
          body: t.Object({
            email: t.String({ format: 'email' }),
            password: t.String({ minLength: 6 }),
            role: t.Optional(t.Union([t.Literal('admin'), t.Literal('dosen'), t.Literal('mahasiswa')])),
          }),
        }
      )
      .post(
        '/login',
        async ({ body, jwt, set }) => {
          const { email, password } = body;
          const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          if (!user) {
            set.status = 401;
            return { error: 'Email atau password salah' };
          }
          const isMatch = await Bun.password.verify(password, user.password);
          if (!isMatch) {
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
            user: { id: user.id, email: user.email, role: user.role },
          };
        },
        {
          body: t.Object({
            email: t.String({ format: 'email' }),
            password: t.String(),
          }),
        }
      )
  )
  // Group CRUD Prodi & Mahasiswa (with mock/draft auth checks)
  .group('/prodi', (app) =>
    app
      .get('/', async () => {
        return await db.select().from(programStudi);
      })
      .post(
        '/',
        async ({ body, set, getCurrentUser }) => {
          const user = await getCurrentUser();
          if (!user || user.role !== 'admin') {
            set.status = 403;
            return { error: 'Akses ditolak. Hanya Admin.' };
          }
          const [newProdi] = await db.insert(programStudi).values(body).returning();
          set.status = 201;
          return newProdi;
        },
        {
          body: t.Object({
            kode: t.String(),
            nama: t.String(),
            jenjang: t.String(),
          }),
        }
      )
  )
  .group('/mahasiswa', (app) =>
    app
      .get('/', async () => {
        return await db.select().from(mahasiswa);
      })
      .post(
        '/',
        async ({ body, set, getCurrentUser }) => {
          const user = await getCurrentUser();
          if (!user || (user.role !== 'admin' && user.role !== 'dosen')) {
            set.status = 403;
            return { error: 'Akses ditolak.' };
          }
          const [newMhs] = await db.insert(mahasiswa).values(body).returning();
          set.status = 201;
          return newMhs;
        },
        {
          body: t.Object({
            nim: t.String(),
            nama: t.String(),
            email: t.String({ format: 'email' }),
            programStudiId: t.Integer(),
            status: t.Optional(t.String()),
          }),
        }
      )
  );

if (process.env.NODE_ENV !== 'test') {
  app.listen(3000);
  console.log(`🦊 Server is running at http://localhost:3000`);
  console.log(`📖 Swagger API documentation is available at http://localhost:3000/swagger`);
}
