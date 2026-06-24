import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from './index';
import { db } from './db';
import { users, programStudi, mahasiswa, dosen } from './db/schema';

interface UserResponse {
  id: number;
  email: string;
  role: 'admin' | 'dosen' | 'mahasiswa';
}

interface RegisterSuccessResponse {
  message: string;
  user: UserResponse;
}

interface ErrorResponse {
  error: string;
}

interface LoginSuccessResponse {
  message: string;
  token: string;
  user: {
    email: string;
  };
}

interface ProdiSuccessResponse {
  id: number;
  kode: string;
  nama: string;
  jenjang: string;
}

interface MahasiswaSuccessResponse {
  id: number;
  nim: string;
  nama: string;
  email: string;
  programStudiId: number;
}


// Helper function to clear all database tables to ensure test independence
async function clearDatabase() {
  await db.delete(mahasiswa);
  await db.delete(dosen);
  await db.delete(programStudi);
  await db.delete(users);
}

// Helper function to register and login a user, returning their JWT authorization token
async function getAuthToken(email: string, role: 'admin' | 'dosen' | 'mahasiswa') {
  const registerResponse = await app.handle(
    new Request('http://localhost/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123', role }),
    })
  );

  if (registerResponse.status !== 201 && registerResponse.status !== 400) {
    const errorText = await registerResponse.text();
    throw new Error(`getAuthToken registration failed with status ${registerResponse.status}: ${errorText}`);
  }

  const response = await app.handle(
    new Request('http://localhost/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    })
  );

  if (response.status !== 200) {
    const errorText = await response.text();
    throw new Error(`getAuthToken login failed with status ${response.status}: ${errorText}`);
  }

  const data = await response.json() as LoginSuccessResponse;
  return data.token;
}

describe('SIMAK Vokasi API Backend Tests', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('1. Autentikasi (/auth)', () => {
    describe('POST /auth/register', () => {
      it('harus sukses registrasi user baru dengan data valid', async () => {
        const response = await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'admin@test.com',
              password: 'password123',
              role: 'admin',
            }),
          })
        );

        expect(response.status).toBe(201);
        const body = await response.json() as RegisterSuccessResponse;
        expect(body.message).toBe('Registrasi berhasil');
        expect(body.user).toBeDefined();
        expect(body.user.email).toBe('admin@test.com');
        expect(body.user.role).toBe('admin');
        expect((body.user as any).password).toBeUndefined(); // Password tidak boleh dikembalikan
      });

      it('harus gagal registrasi jika email sudah terdaftar', async () => {
        const payload = {
          email: 'duplicate@test.com',
          password: 'password123',
          role: 'mahasiswa' as const,
        };

        // First registration
        await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        );

        // Second registration with the same email
        const response = await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        );

        expect(response.status).toBe(400);
        const body = await response.json() as ErrorResponse;
        expect(body.error).toBe('Email sudah terdaftar');
      });

      it('harus gagal registrasi jika format email tidak valid', async () => {
        const response = await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'invalid-email-format',
              password: 'password123',
              role: 'mahasiswa',
            }),
          })
        );

        expect(response.status).toBe(422);
      });

      it('harus gagal registrasi jika password kurang dari 6 karakter', async () => {
        const response = await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'shortpass@test.com',
              password: '12345',
              role: 'mahasiswa',
            }),
          })
        );

        expect(response.status).toBe(422);
      });
    });

    describe('POST /auth/login', () => {
      beforeEach(async () => {
        // Daftarkan satu user untuk pengujian login
        await app.handle(
          new Request('http://localhost/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'user@test.com',
              password: 'password123',
              role: 'mahasiswa',
            }),
          })
        );
      });

      it('harus sukses login dengan email & password valid', async () => {
        const response = await app.handle(
          new Request('http://localhost/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'user@test.com',
              password: 'password123',
            }),
          })
        );

        expect(response.status).toBe(200);
        const body = await response.json() as LoginSuccessResponse;
        expect(body.message).toBe('Login berhasil');
        expect(body.token).toBeDefined();
        expect(body.user.email).toBe('user@test.com');
      });

      it('harus gagal login jika email belum terdaftar', async () => {
        const response = await app.handle(
          new Request('http://localhost/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'unregistered@test.com',
              password: 'password123',
            }),
          })
        );

        expect(response.status).toBe(401);
        const body = await response.json() as ErrorResponse;
        expect(body.error).toBe('Email atau password salah');
      });

      it('harus gagal login dengan password yang salah', async () => {
        const response = await app.handle(
          new Request('http://localhost/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'user@test.com',
              password: 'wrongpassword',
            }),
          })
        );

        expect(response.status).toBe(401);
        const body = await response.json() as ErrorResponse;
        expect(body.error).toBe('Email atau password salah');
      });
    });
  });

  describe('2. Program Studi (/prodi)', () => {
    it('harus sukses mengambil list prodi (GET /prodi)', async () => {
      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('harus sukses menambahkan prodi baru jika diakses oleh Admin (POST /prodi)', async () => {
      const adminToken = await getAuthToken('admin-prodi@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI',
            nama: 'Teknik Informatika',
            jenjang: 'D4',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json() as ProdiSuccessResponse;
      expect(body.id).toBeDefined();
      expect(body.kode).toBe('TI');
    });

    it('harus gagal menambahkan prodi jika diakses oleh Dosen (POST /prodi)', async () => {
      const dosenToken = await getAuthToken('dosen-prodi@test.com', 'dosen');

      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-DOSEN',
            nama: 'Teknik Informatika Dosen',
            jenjang: 'D4',
          }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('harus gagal menambahkan prodi jika diakses oleh Mahasiswa (POST /prodi)', async () => {
      const mhsToken = await getAuthToken('mhs-prodi@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-MHS',
            nama: 'Teknik Informatika Mahasiswa',
            jenjang: 'D4',
          }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('harus gagal menambahkan prodi jika tanpa token JWT (POST /prodi)', async () => {
      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kode: 'TI-GUEST',
            nama: 'Teknik Informatika Guest',
            jenjang: 'D4',
          }),
        })
      );

      expect(response.status).toBe(403);
    });
  });

  describe('3. Mahasiswa (/mahasiswa)', () => {
    let prodiId: number;

    beforeEach(async () => {
      // Buat prodi dummy terlebih dahulu untuk relasi programStudiId
      const adminToken = await getAuthToken('admin-mhs-setup@test.com', 'admin');
      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-MHS-SETUP',
            nama: 'Teknik Informatika Setup',
            jenjang: 'D4',
          }),
        })
      );
      const data = await response.json() as { id: number };
      prodiId = data.id;
    });

    it('harus sukses mengambil list mahasiswa (GET /mahasiswa)', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'GET',
        })
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('harus sukses menambahkan mahasiswa baru jika diakses oleh Admin (POST /mahasiswa)', async () => {
      const adminToken = await getAuthToken('admin-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345678',
            nama: 'Mahasiswa Admin',
            email: 'mhs-admin@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Admin',
            nik: '1234567890123456',
            jenisKelamin: 'L',
            tanggalLahir: '2000-01-01',
          }),
        })
      );

      expect(response.status).toBe(201);
      const body = await response.json() as MahasiswaSuccessResponse;
      expect(body.id).toBeDefined();
      expect(body.nim).toBe('12345678');
    });

    it('harus sukses menambahkan mahasiswa baru jika diakses oleh Dosen (POST /mahasiswa)', async () => {
      const dosenToken = await getAuthToken('dosen-mhs@test.com', 'dosen');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${dosenToken}`,
          },
          body: JSON.stringify({
            nim: '12345679',
            nama: 'Mahasiswa Dosen',
            email: 'mhs-dosen@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Dosen',
            nik: '1234567890123457',
            jenisKelamin: 'P',
            tanggalLahir: '2001-02-02',
          }),
        })
      );

      expect(response.status).toBe(201);
    });

    it('harus gagal menambahkan mahasiswa jika diakses oleh Mahasiswa (POST /mahasiswa)', async () => {
      const mhsToken = await getAuthToken('mhs-mhs@test.com', 'mahasiswa');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mhsToken}`,
          },
          body: JSON.stringify({
            nim: '12345680',
            nama: 'Mahasiswa Gagal',
            email: 'mhs-gagal@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Gagal',
            nik: '1234567890123458',
            jenisKelamin: 'L',
            tanggalLahir: '2000-03-03',
          }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('harus gagal menambahkan mahasiswa jika tanpa token JWT (POST /mahasiswa)', async () => {
      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nim: '12345681',
            nama: 'Mahasiswa Guest',
            email: 'mhs-guest@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu Kandung Guest',
            nik: '1234567890123459',
            jenisKelamin: 'P',
            tanggalLahir: '2002-04-04',
          }),
        })
      );

      expect(response.status).toBe(403);
    });

    it('harus gagal menambahkan mahasiswa jika field wajib tidak lengkap atau format email salah', async () => {
      const adminToken = await getAuthToken('admin-invalid-mhs@test.com', 'admin');

      const response = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '12345682',
            nama: 'Mahasiswa Invalid Email',
            email: 'invalid-email-format',
            programStudiId: prodiId,
          }),
        })
      );

      expect(response.status).toBe(422);
    });
  });
});
