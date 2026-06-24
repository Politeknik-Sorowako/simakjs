import { Elysia, t } from 'elysia';
import { swagger } from '@elysiajs/swagger';
import { jwt } from '@elysiajs/jwt';
import { cors } from '@elysiajs/cors';
import { db } from './db';
import { users, programStudi, mahasiswa } from './db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET = process.env.JWT_SECRET;

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
          detail: {
            tags: ['Autentikasi'],
            summary: 'Registrasi Pengguna Baru',
            description: 'Mendaftarkan akun baru ke sistem dengan role admin, dosen, atau mahasiswa.'
          },
          body: t.Object({
            email: t.String({ format: 'email', default: 'admin@test.com' }),
            password: t.String({ minLength: 6, default: 'password123' }),
            role: t.Optional(t.Union([t.Literal('admin'), t.Literal('dosen'), t.Literal('mahasiswa')], { default: 'mahasiswa' }))
          }),
          response: {
            201: t.Object({
              message: t.String({ default: 'Registrasi berhasil' }),
              user: t.Object({
                id: t.Integer({ default: 1 }),
                email: t.String({ default: 'admin@test.com' }),
                role: t.String({ default: 'admin' })
              })
            }),
            400: t.Object({
              error: t.String({ default: 'Email sudah terdaftar' })
            })
          }
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
          detail: {
            tags: ['Autentikasi'],
            summary: 'Login Pengguna',
            description: 'Login menggunakan email dan password untuk mendapatkan token JWT.'
          },
          body: t.Object({
            email: t.String({ format: 'email', default: 'admin@test.com' }),
            password: t.String({ default: 'password123' })
          }),
          response: {
            200: t.Object({
              message: t.String({ default: 'Login berhasil' }),
              token: t.String({ default: 'eyJhbGciOiJIUzI1NiIsInR... (JWT string)' }),
              user: t.Object({
                id: t.Integer({ default: 1 }),
                email: t.String({ default: 'admin@test.com' }),
                role: t.String({ default: 'admin' })
              })
            }),
            401: t.Object({
              error: t.String({ default: 'Email atau password salah' })
            })
          }
        }
      )
  )
  // Group CRUD Prodi & Mahasiswa (with mock/draft auth checks)
  .group('/prodi', (app) =>
    app
      .get(
        '/',
        async () => {
          return await db.select().from(programStudi);
        },
        {
          detail: {
            tags: ['Program Studi'],
            summary: 'Daftar Program Studi',
            description: 'Mengambil semua data program studi yang terdaftar.'
          },
          response: {
            200: t.Array(
              t.Object({
                id: t.Integer({ default: 1 }),
                kode: t.String({ default: 'TI' }),
                nama: t.String({ default: 'Teknik Informatika' }),
                jenjang: t.String({ default: 'D4' }),
                idPddikti: t.Union([t.String(), t.Null()], { default: null })
              })
            )
          }
        }
      )
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
          detail: {
            tags: ['Program Studi'],
            summary: 'Tambah Program Studi Baru',
            description: 'Menambahkan prodi baru (Hanya dapat diakses oleh Admin yang menyertakan token JWT).'
          },
          body: t.Object({
            kode: t.String({ default: 'TI' }),
            nama: t.String({ default: 'Teknik Informatika' }),
            jenjang: t.String({ default: 'D4' })
          }),
          response: {
            201: t.Object({
              id: t.Integer({ default: 1 }),
              kode: t.String({ default: 'TI' }),
              nama: t.String({ default: 'Teknik Informatika' }),
              jenjang: t.String({ default: 'D4' }),
              idPddikti: t.Union([t.String(), t.Null()], { default: null })
            }),
            403: t.Object({
              error: t.String({ default: 'Akses ditolak. Hanya Admin.' })
            })
          }
        }
      )
  )
  .group('/mahasiswa', (app) =>
    app
      .get(
        '/',
        async () => {
          return await db.select().from(mahasiswa);
        },
        {
          detail: {
            tags: ['Mahasiswa'],
            summary: 'Daftar Mahasiswa',
            description: 'Mengambil semua data mahasiswa yang terdaftar.'
          },
          response: {
            200: t.Array(
              t.Object({
                id: t.Integer({ default: 1 }),
                nim: t.String({ default: '12345678' }),
                nama: t.String({ default: 'Budi Santoso' }),
                email: t.String({ default: 'budi@test.com' }),
                programStudiId: t.Union([t.Integer(), t.Null()], { default: 1 }),
                status: t.String({ default: 'aktif' }),
                namaIbuKandung: t.String({ default: 'Ibu Budi' }),
                nik: t.String({ default: '1234567890123456' }),
                jenisKelamin: t.String({ default: 'L' }),
                tanggalLahir: t.String({ default: '2000-01-01' }),
                idPddikti: t.Union([t.String(), t.Null()], { default: null })
              })
            )
          }
        }
      )
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
          detail: {
            tags: ['Mahasiswa'],
            summary: 'Tambah Mahasiswa Baru',
            description: 'Menambahkan mahasiswa baru lengkap dengan data wajib PDDIKTI (Hanya dapat diakses Admin / Dosen dengan token JWT).'
          },
          body: t.Object({
            nim: t.String({ default: '12345678' }),
            nama: t.String({ default: 'Budi Santoso' }),
            email: t.String({ format: 'email', default: 'budi@test.com' }),
            programStudiId: t.Integer({ default: 1 }),
            status: t.Optional(t.String({ default: 'aktif' })),
            idPddikti: t.Optional(t.String()),
            namaIbuKandung: t.String({ default: 'Ibu Budi' }),
            nik: t.String({ minLength: 16, maxLength: 16, default: '1234567890123456' }),
            jenisKelamin: t.Union([t.Literal('L'), t.Literal('P')], { default: 'L' }),
            tanggalLahir: t.String({ default: '2000-01-01' })
          }),
          response: {
            201: t.Object({
              id: t.Integer({ default: 1 }),
              nim: t.String({ default: '12345678' }),
              nama: t.String({ default: 'Budi Santoso' }),
              email: t.String({ default: 'budi@test.com' }),
              programStudiId: t.Integer({ default: 1 }),
              status: t.String({ default: 'aktif' }),
              namaIbuKandung: t.String({ default: 'Ibu Budi' }),
              nik: t.String({ default: '1234567890123456' }),
              jenisKelamin: t.String({ default: 'L' }),
              tanggalLahir: t.String({ default: '2000-01-01T00:00:00.000Z' }),
              idPddikti: t.Union([t.String(), t.Null()], { default: null })
            }),
            403: t.Object({
              error: t.String({ default: 'Akses ditolak.' })
            }),
            422: t.Object({
              message: t.String({ default: 'Validation error message...' })
            })
          }
        }
      )
  );

if (process.env.NODE_ENV !== 'test') {
  app.listen(3000);
  console.log(`🦊 Server is running at http://localhost:3000`);
  console.log(`📖 Swagger API documentation is available at http://localhost:3000/swagger`);
}
