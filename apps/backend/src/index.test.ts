import { describe, it, expect, beforeEach } from 'bun:test';
import { app } from './index';
import { db } from './utils/db';
import { users, programStudi, mahasiswa, dosen, krs, kelasKuliah, mataKuliah, periodeAkademik, dosenPengajarKelas } from './models/schema';

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
  await db.delete(krs);
  await db.delete(dosenPengajarKelas);
  await db.delete(kelasKuliah);
  await db.delete(mataKuliah);
  await db.delete(mahasiswa);
  await db.delete(dosen);
  await db.delete(periodeAkademik);
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
      expect(Array.isArray(body.data)).toBe(true);
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
      expect(Array.isArray(body.data)).toBe(true);
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

  describe('4. Dosen (/dosen)', () => {
    let prodiId: number;
    let dosenId: number;

    beforeEach(async () => {
      // Setup prodi
      const adminToken = await getAuthToken('admin-dosen-setup@test.com', 'admin');
      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-DOSEN-SETUP',
            nama: 'Teknik Informatika Dosen Setup',
            jenjang: 'D4',
          }),
        })
      );
      const data = await response.json() as { id: number };
      prodiId = data.id;
    });

    it('harus sukses CRUD Dosen oleh Admin', async () => {
      const adminToken = await getAuthToken('admin-dosen-crud@test.com', 'admin');

      // 1. Create
      const createRes = await app.handle(
        new Request('http://localhost/dosen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nip: '199001012020011001',
            nama: 'Dosen Uji Coba',
            email: 'dosenuji@test.com',
            programStudiId: prodiId,
            nidn: '0001019001',
            nik: '9876543210123456',
            jenisKelamin: 'L',
            tanggalLahir: '1990-01-01',
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { id: number; nama: string };
      dosenId = created.id;
      expect(created.nama).toBe('Dosen Uji Coba');

      // 2. Get All
      const getAllRes = await app.handle(
        new Request('http://localhost/dosen?search=Uji', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getAllRes.status).toBe(200);
      const listBody = await getAllRes.json() as { data: any[] };
      expect(listBody.data.length).toBeGreaterThan(0);

      // 3. Get By ID
      const getByIdRes = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getByIdRes.status).toBe(200);
      const details = await getByIdRes.json() as { nama: string; programStudi: any };
      expect(details.nama).toBe('Dosen Uji Coba');
      expect(details.programStudi).toBeDefined();

      // 4. Update
      const updateRes = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Dosen Uji Coba Terupdate'
          }),
        })
      );
      expect(updateRes.status).toBe(200);
      const updated = await updateRes.json() as { nama: string };
      expect(updated.nama).toBe('Dosen Uji Coba Terupdate');

      // 5. Delete
      const deleteRes = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);

      // Verify deletion
      const checkRes = await app.handle(
        new Request(`http://localhost/dosen/${dosenId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(checkRes.status).toBe(404);
    });
  });

  describe('5. Periode Akademik (/periode-akademik)', () => {
    it('harus sukses CRUD Periode Akademik oleh Admin', async () => {
      const adminToken = await getAuthToken('admin-periode-crud@test.com', 'admin');

      // 1. Create
      const createRes = await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: '20251',
            nama: '2025/2026 Ganjil',
            aktif: true,
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { id: string };
      expect(created.id).toBe('20251');

      // 2. Get All
      const getAllRes = await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getAllRes.status).toBe(200);
      const listBody = await getAllRes.json() as { data: any[] };
      expect(listBody.data.some(p => p.id === '20251')).toBe(true);

      // 3. Get By ID
      const getByIdRes = await app.handle(
        new Request('http://localhost/periode-akademik/20251', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getByIdRes.status).toBe(200);

      // 4. Update
      const updateRes = await app.handle(
        new Request('http://localhost/periode-akademik/20251', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: '2025/2026 Ganjil Terupdate'
          }),
        })
      );
      expect(updateRes.status).toBe(200);

      // 5. Delete
      const deleteRes = await app.handle(
        new Request('http://localhost/periode-akademik/20251', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);
    });
  });

  describe('6. Mata Kuliah (/mata-kuliah)', () => {
    let prodiId: number;
    let mkId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-mk-setup@test.com', 'admin');
      const response = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-MK-SETUP',
            nama: 'Teknik Informatika MK Setup',
            jenjang: 'D4',
          }),
        })
      );
      const data = await response.json() as { id: number };
      prodiId = data.id;
    });

    it('harus sukses CRUD Mata Kuliah oleh Admin', async () => {
      const adminToken = await getAuthToken('admin-mk-crud@test.com', 'admin');

      // 1. Create
      const createRes = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKTEST001',
            nama: 'Struktur Data & Algoritma',
            sksTotal: 4,
            sksTatapMuka: 2,
            sksPraktek: 2,
            programStudiId: prodiId,
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { id: number };
      mkId = created.id;

      // 2. Get All
      const getAllRes = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getAllRes.status).toBe(200);

      // 3. Get By ID
      const getByIdRes = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mkId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getByIdRes.status).toBe(200);

      // 4. Update
      const updateRes = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mkId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nama: 'Struktur Data & Algoritma Terupdate'
          }),
        })
      );
      expect(updateRes.status).toBe(200);

      // 5. Delete
      const deleteRes = await app.handle(
        new Request(`http://localhost/mata-kuliah/${mkId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);
    });
  });

  describe('7. Kelas Kuliah (/kelas-kuliah)', () => {
    let prodiId: number;
    let mkId: number;
    let kelasId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-kelas-setup@test.com', 'admin');
      
      const prodiRes = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-KELAS-SETUP',
            nama: 'Teknik Informatika Kelas Setup',
            jenjang: 'D4',
          }),
        })
      );
      const prodiData = await prodiRes.json() as { id: number };
      prodiId = prodiData.id;

      const mkRes = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKKELAS001',
            nama: 'Basis Data',
            sksTotal: 3,
            programStudiId: prodiId,
          }),
        })
      );
      const mkData = await mkRes.json() as { id: number };
      mkId = mkData.id;

      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: '20232',
            nama: '2023/2024 Genap',
            aktif: true,
          }),
        })
      );
    });

    it('harus sukses CRUD Kelas Kuliah oleh Admin', async () => {
      const adminToken = await getAuthToken('admin-kelas-crud@test.com', 'admin');

      // 1. Create
      const createRes = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20232',
            namaKelas: 'TI-4A',
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { id: number };
      kelasId = created.id;

      // 2. Get All
      const getAllRes = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getAllRes.status).toBe(200);

      // 3. Get By ID
      const getByIdRes = await app.handle(
        new Request(`http://localhost/kelas-kuliah/${kelasId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getByIdRes.status).toBe(200);

      // 4. Update
      const updateRes = await app.handle(
        new Request(`http://localhost/kelas-kuliah/${kelasId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            namaKelas: 'TI-4A-Terupdate'
          }),
        })
      );
      expect(updateRes.status).toBe(200);

      // 5. Delete
      const deleteRes = await app.handle(
        new Request(`http://localhost/kelas-kuliah/${kelasId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);
    });
  });

  describe('8. KRS (/krs)', () => {
    let prodiId: number;
    let mhsId: number;
    let mkId: number;
    let kelasId: number;
    let krsId: number;

    beforeEach(async () => {
      const adminToken = await getAuthToken('admin-krs-setup@test.com', 'admin');
      
      const prodiRes = await app.handle(
        new Request('http://localhost/prodi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'TI-KRS-SETUP',
            nama: 'Teknik Informatika KRS Setup',
            jenjang: 'D4',
          }),
        })
      );
      const prodiData = await prodiRes.json() as { id: number };
      prodiId = prodiData.id;

      const mhsRes = await app.handle(
        new Request('http://localhost/mahasiswa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nim: '99999999',
            nama: 'Mahasiswa KRS',
            email: 'mhs-krs@test.com',
            programStudiId: prodiId,
            namaIbuKandung: 'Ibu KRS',
            nik: '9999999999999999',
            jenisKelamin: 'L',
            tanggalLahir: '2002-01-01',
          }),
        })
      );
      const mhsData = await mhsRes.json() as { id: number };
      mhsId = mhsData.id;

      const mkRes = await app.handle(
        new Request('http://localhost/mata-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            kode: 'MKKRS001',
            nama: 'Logika Matematika',
            sksTotal: 2,
            programStudiId: prodiId,
          }),
        })
      );
      const mkData = await mkRes.json() as { id: number };
      mkId = mkData.id;

      await app.handle(
        new Request('http://localhost/periode-akademik', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            id: '20233',
            nama: '2023/2024 Pendek',
            aktif: true,
          }),
        })
      );

      const kelasRes = await app.handle(
        new Request('http://localhost/kelas-kuliah', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mataKuliahId: mkId,
            periodeId: '20233',
            namaKelas: 'TI-KRS-A',
          }),
        })
      );
      const kelasData = await kelasRes.json() as { id: number };
      kelasId = kelasData.id;
    });

    it('harus sukses CRUD KRS oleh Admin', async () => {
      const adminToken = await getAuthToken('admin-krs-crud@test.com', 'admin');

      // 1. Create
      const createRes = await app.handle(
        new Request('http://localhost/krs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            mahasiswaId: mhsId,
            kelasKuliahId: kelasId,
          }),
        })
      );
      expect(createRes.status).toBe(201);
      const created = await createRes.json() as { id: number };
      krsId = created.id;

      // 2. Get All
      const getAllRes = await app.handle(
        new Request('http://localhost/krs', {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getAllRes.status).toBe(200);

      // 3. Get By ID
      const getByIdRes = await app.handle(
        new Request(`http://localhost/krs/${krsId}`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(getByIdRes.status).toBe(200);

      // 4. Update (Nilai)
      const updateRes = await app.handle(
        new Request(`http://localhost/krs/${krsId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            nilaiAngka: 85.50,
            nilaiHuruf: 'A',
            nilaiIndeks: 4.00,
          }),
        })
      );
      expect(updateRes.status).toBe(200);

      // 5. Delete
      const deleteRes = await app.handle(
        new Request(`http://localhost/krs/${krsId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${adminToken}` },
        })
      );
      expect(deleteRes.status).toBe(200);
    });
  });
});

